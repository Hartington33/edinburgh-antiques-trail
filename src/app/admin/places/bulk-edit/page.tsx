'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Place, PlaceType } from '@/lib/data-utils';

export default function BulkEditPlaces() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [placeTypes, setPlaceTypes] = useState<PlaceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editedPlaces, setEditedPlaces] = useState<{[key: number]: Partial<Place>}>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<number | null>(null);
  
  // Fetch places and place types
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [placesRes, typesRes] = await Promise.all([
          fetch('/api/places'),
          fetch('/api/place-types')
        ]);
        
        if (!placesRes.ok || !typesRes.ok) {
          throw new Error('Failed to fetch data');
        }
        
        const [placesData, typesData] = await Promise.all([
          placesRes.json(),
          typesRes.json()
        ]);
        
        setPlaces(placesData);
        setPlaceTypes(typesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Filter places based on search term and type filter
  const filteredPlaces = useMemo(() => {
    return places.filter(place => {
      const matchesSearch = searchTerm === '' || 
        place.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        place.address.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === null || place.type_id === filterType;
      
      return matchesSearch && matchesType;
    });
  }, [places, searchTerm, filterType]);
  
  // Handle cell edit
  const handleCellEdit = (id: number, field: string, value: any) => {
    setEditedPlaces(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value
      }
    }));
  };
  
  // Save all edits
  const saveChanges = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const updates = Object.entries(editedPlaces).map(async ([id, changes]) => {
        const res = await fetch(`/api/places?id=${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(changes),
        });
        
        if (!res.ok) {
          throw new Error(`Failed to update place ${id}`);
        }
        
        return id;
      });
      
      await Promise.all(updates);
      
      // Refresh the data
      const res = await fetch('/api/places');
      const newData = await res.json();
      setPlaces(newData);
      
      // Clear edited state
      setEditedPlaces({});
      setSuccess(`Successfully updated ${Object.keys(editedPlaces).length} place(s)`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };
  
  // Discard changes
  const discardChanges = () => {
    setEditedPlaces({});
  };
  
  if (loading) {
    return <div className="text-center py-8">Loading places...</div>;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-edinburgh-blue mb-2">Bulk Edit Places</h1>
          <p className="text-gray-600">
            Edit multiple places at once. Click on any cell to edit it.
          </p>
        </div>
        <div className="flex space-x-4">
          <Link href="/admin/places" className="px-4 py-2 border rounded-md text-edinburgh-blue hover:bg-gray-50">
            Back to Places
          </Link>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-lg shadow">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or address..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        
        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={filterType || ''}
            onChange={(e) => setFilterType(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">All Categories</option>
            {placeTypes.map(type => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </div>
        
        <div className="flex items-end">
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterType(null);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>
      </div>
      
      {/* Results count */}
      <div className="text-sm text-gray-600">
        Showing {filteredPlaces.length} of {places.length} places
      </div>
      
      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}
      
      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Website</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPlaces.map(place => {
              const isEdited = Boolean(editedPlaces[place.id]);
              const editedData = editedPlaces[place.id] || {};
              
              return (
                <tr key={place.id} className={isEdited ? "bg-blue-50" : "hover:bg-gray-50"}>
                  <td className="px-6 py-4">
                    <div
                      className="font-medium text-gray-900 min-w-[100px] p-1 -m-1 rounded hover:bg-blue-100 cursor-pointer"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        if (e.target.textContent !== place.name) {
                          handleCellEdit(place.id, 'name', e.target.textContent);
                        }
                      }}
                    >
                      {editedData.name !== undefined ? editedData.name : place.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={editedData.type_id !== undefined ? editedData.type_id : place.type_id}
                      onChange={(e) => handleCellEdit(place.id, 'type_id', Number(e.target.value))}
                      className="border-0 bg-transparent p-1 -m-1 rounded hover:bg-blue-100 cursor-pointer"
                    >
                      {placeTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <div
                      className="text-gray-500 min-w-[200px] p-1 -m-1 rounded hover:bg-blue-100 cursor-pointer"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        if (e.target.textContent !== place.address) {
                          handleCellEdit(place.id, 'address', e.target.textContent);
                        }
                      }}
                    >
                      {editedData.address !== undefined ? editedData.address : place.address}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div
                      className="text-gray-500 p-1 -m-1 rounded hover:bg-blue-100 cursor-pointer"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        if (e.target.textContent !== place.phone) {
                          handleCellEdit(place.id, 'phone', e.target.textContent);
                        }
                      }}
                    >
                      {editedData.phone !== undefined ? editedData.phone : (place.phone || '')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div
                      className="text-gray-500 p-1 -m-1 rounded hover:bg-blue-100 cursor-pointer"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        if (e.target.textContent !== place.email) {
                          handleCellEdit(place.id, 'email', e.target.textContent);
                        }
                      }}
                    >
                      {editedData.email !== undefined ? editedData.email : (place.email || '')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div
                      className="text-gray-500 p-1 -m-1 rounded hover:bg-blue-100 cursor-pointer"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        if (e.target.textContent !== place.website) {
                          handleCellEdit(place.id, 'website', e.target.textContent);
                        }
                      }}
                    >
                      {editedData.website !== undefined ? editedData.website : (place.website || '')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex justify-end space-x-2">
                      <Link 
                        href={`/admin/places/${place.id}/edit`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Full Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {filteredPlaces.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No places found with the current filter.</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterType(null);
            }}
            className="mt-4 inline-block px-4 py-2 bg-edinburgh-blue text-white rounded-md"
          >
            Clear Filters
          </button>
        </div>
      )}
      
      {/* Action buttons */}
      {Object.keys(editedPlaces).length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white p-4 border-t shadow-md flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {Object.keys(editedPlaces).length} place(s) have unsaved changes
          </div>
          <div className="flex space-x-4">
            <button
              onClick={discardChanges}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={saving}
            >
              Discard Changes
            </button>
            <button
              onClick={saveChanges}
              className="px-4 py-2 bg-edinburgh-blue text-white rounded-md hover:bg-opacity-90 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Saving...' : `Save Changes (${Object.keys(editedPlaces).length})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
