'use client';

import { useState } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';

// Install papaparse with: npm install papaparse @types/papaparse

interface ImportResults {
  success: number;
  failed: number;
  errors: string[];
}

export default function CsvImport() {
  const [importType, setImportType] = useState<'places' | 'neighborhoods' | 'place-types'>('places');
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ImportResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<any[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setResults(null);
    setPreview([]);
    
    const files = e.target.files;
    if (!files || files.length === 0) {
      setFile(null);
      return;
    }
    
    const selectedFile = files[0];
    
    // Check if it's a CSV file
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      e.target.value = '';
      return;
    }
    
    setFile(selectedFile);
    
    // Preview the file
    Papa.parse(selectedFile, {
      header: true,
      preview: 5, // Show preview of first 5 rows
      complete: (results) => {
        setPreview(results.data);
      },
      error: (err) => {
        setError(`Error parsing CSV: ${err.message}`);
      }
    });
  };

  const validatePlacesData = (data: any[]) => {
    const requiredFields = ['name', 'address', 'lat', 'lng', 'type_id', 'neighborhood_id'];
    const errors: string[] = [];
    
    data.forEach((row, index) => {
      const rowNum = index + 1;
      
      for (const field of requiredFields) {
        if (!row[field]) {
          errors.push(`Row ${rowNum}: Missing required field: ${field}`);
        }
      }
      
      // Check that numeric fields are valid numbers
      const numericFields = ['lat', 'lng', 'type_id', 'neighborhood_id'];
      for (const field of numericFields) {
        if (row[field] && isNaN(Number(row[field]))) {
          errors.push(`Row ${rowNum}: Field ${field} must be a number`);
        }
      }
    });
    
    return errors;
  };
  
  const validateNeighborhoodsData = (data: any[]) => {
    const errors: string[] = [];
    
    data.forEach((row, index) => {
      const rowNum = index + 1;
      
      if (!row.name) {
        errors.push(`Row ${rowNum}: Missing required field: name`);
      }
    });
    
    return errors;
  };
  
  const validatePlaceTypesData = (data: any[]) => {
    const errors: string[] = [];
    
    data.forEach((row, index) => {
      const rowNum = index + 1;
      
      if (!row.name) {
        errors.push(`Row ${rowNum}: Missing required field: name`);
      }
    });
    
    return errors;
  };

  const importPlaces = async (data: any[]): Promise<ImportResults> => {
    const results: ImportResults = {
      success: 0,
      failed: 0,
      errors: []
    };
    
    for (const [index, row] of data.entries()) {
      try {
        // Convert string values to numbers where needed
        const placeData = {
          name: row.name,
          address: row.address,
          phone: row.phone || null,
          email: row.email || null,
          website: row.website || null,
          description: row.description || null,
          specialties: row.specialties || null,
          opening_hours: row.opening_hours || null,
          lat: parseFloat(row.lat),
          lng: parseFloat(row.lng),
          type_id: parseInt(row.type_id),
          neighborhood_id: parseInt(row.neighborhood_id)
        };
        
        const res = await fetch('/api/places', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(placeData),
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to create place');
        }
        
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`Row ${index + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
    
    return results;
  };
  
  const importNeighborhoods = async (data: any[]): Promise<ImportResults> => {
    const results: ImportResults = {
      success: 0,
      failed: 0,
      errors: []
    };
    
    for (const [index, row] of data.entries()) {
      try {
        const neighborhoodData = {
          name: row.name,
          description: row.description || ''
        };
        
        const res = await fetch('/api/neighborhoods', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(neighborhoodData),
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to create neighborhood');
        }
        
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`Row ${index + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
    
    return results;
  };
  
  const importPlaceTypes = async (data: any[]): Promise<ImportResults> => {
    const results: ImportResults = {
      success: 0,
      failed: 0,
      errors: []
    };
    
    for (const [index, row] of data.entries()) {
      try {
        const placeTypeData = {
          name: row.name,
          description: row.description || ''
        };
        
        const res = await fetch('/api/place-types', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(placeTypeData),
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to create place type');
        }
        
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`Row ${index + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
    
    return results;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a CSV file');
      return;
    }
    
    setError(null);
    setResults(null);
    setProcessing(true);
    
    try {
      // Parse the whole file
      Papa.parse(file, {
        header: true,
        complete: async (results) => {
          const data = results.data.filter((row: any) => 
            // Filter out empty rows (rows with no values)
            Object.values(row).some(val => val !== '')
          );
          
          if (data.length === 0) {
            setError('No data found in CSV file');
            setProcessing(false);
            return;
          }
          
          // Validate data based on import type
          let validationErrors: string[] = [];
          
          if (importType === 'places') {
            validationErrors = validatePlacesData(data);
          } else if (importType === 'neighborhoods') {
            validationErrors = validateNeighborhoodsData(data);
          } else {
            validationErrors = validatePlaceTypesData(data);
          }
          
          if (validationErrors.length > 0) {
            setError(`Validation errors: ${validationErrors.length}`);
            setResults({
              success: 0,
              failed: data.length,
              errors: validationErrors
            });
            setProcessing(false);
            return;
          }
          
          // Import data based on type
          let importResults: ImportResults;
          
          if (importType === 'places') {
            importResults = await importPlaces(data);
          } else if (importType === 'neighborhoods') {
            importResults = await importNeighborhoods(data);
          } else {
            importResults = await importPlaceTypes(data);
          }
          
          setResults(importResults);
        },
        error: (err) => {
          setError(`Error parsing CSV: ${err.message}`);
        },
        complete: () => {
          setProcessing(false);
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-edinburgh-blue mb-2">CSV Import</h1>
          <p className="text-gray-600">
            Import data from CSV files to add places, neighborhoods, or categories.
          </p>
        </div>
        <Link href="/admin" className="px-4 py-2 border rounded-md text-edinburgh-blue hover:bg-gray-50">
          Back to Dashboard
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <button 
            onClick={() => setError(null)}
            className="mt-2 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}
      
      <div className="bg-white p-6 rounded-lg shadow">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="importType" className="form-label">Select Import Type</label>
            <select
              id="importType"
              className="input"
              value={importType}
              onChange={(e) => setImportType(e.target.value as any)}
              disabled={processing}
            >
              <option value="places">Places</option>
              <option value="neighborhoods">Neighborhoods</option>
              <option value="place-types">Categories</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="csvFile" className="form-label">Select CSV File</label>
            <input
              type="file"
              id="csvFile"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-edinburgh-stone file:text-edinburgh-blue
                hover:file:bg-edinburgh-stone/80
                cursor-pointer"
              disabled={processing}
            />
            <p className="mt-1 text-sm text-gray-500">
              {importType === 'places' && 'CSV file should include: name, address, lat, lng, type_id, neighborhood_id (required fields)'}
              {importType === 'neighborhoods' && 'CSV file should include: name (required), description'}
              {importType === 'place-types' && 'CSV file should include: name (required), description'}
            </p>
          </div>
          
          {preview.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Preview</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(preview[0]).map(header => (
                        <th 
                          key={header}
                          className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {preview.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-gray-50">
                        {Object.values(row).map((cell: any, cellIndex) => (
                          <td key={cellIndex} className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                            {cell || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-1 text-sm text-gray-500">Showing first {preview.length} rows</p>
            </div>
          )}
          
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-edinburgh-blue text-white rounded-md hover:bg-opacity-90 disabled:opacity-50"
              disabled={!file || processing}
            >
              {processing ? 'Importing...' : 'Import Data'}
            </button>
          </div>
        </form>
      </div>
      
      {results && (
        <div className={`p-6 rounded-lg shadow ${
          results.failed > 0 ? 'bg-yellow-50' : 'bg-green-50'
        }`}>
          <h3 className="text-xl font-semibold mb-4">Import Results</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-white rounded border">
              <p className="text-sm text-gray-500">Successful Imports</p>
              <p className="text-2xl font-bold text-green-600">{results.success}</p>
            </div>
            <div className="p-4 bg-white rounded border">
              <p className="text-sm text-gray-500">Failed Imports</p>
              <p className="text-2xl font-bold text-red-600">{results.failed}</p>
            </div>
          </div>
          
          {results.errors.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Errors</h4>
              <div className="max-h-60 overflow-y-auto bg-white p-3 rounded border">
                <ul className="list-disc pl-5 space-y-1">
                  {results.errors.map((error, index) => (
                    <li key={index} className="text-sm text-red-600">{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
        <h3 className="font-semibold mb-2">CSV Template Examples</h3>
        
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold">Places CSV Format:</h4>
            <p className="text-sm">name,address,phone,email,website,description,specialties,opening_hours,lat,lng,type_id,neighborhood_id</p>
            <p className="text-sm text-gray-600 mt-1">Example: "Antique Shop","123 High St","+44123456789","email@example.com","https://example.com","Description here","Furniture, Art","Mon-Fri 9-5",55.9533,-3.1883,1,2</p>
          </div>
          
          <div>
            <h4 className="font-semibold">Neighborhoods CSV Format:</h4>
            <p className="text-sm">name,description</p>
            <p className="text-sm text-gray-600 mt-1">Example: "Old Town","Historic center of Edinburgh"</p>
          </div>
          
          <div>
            <h4 className="font-semibold">Categories CSV Format:</h4>
            <p className="text-sm">name,description</p>
            <p className="text-sm text-gray-600 mt-1">Example: "Antique Shop","Shops specializing in antiques and collectibles"</p>
          </div>
        </div>
      </div>
    </div>
  );
}
