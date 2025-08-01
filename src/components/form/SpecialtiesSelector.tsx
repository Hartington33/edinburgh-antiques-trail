'use client';

import React, { useState, useEffect } from 'react';
import { Control, Controller, UseFormSetValue, UseFormGetValues } from 'react-hook-form';

interface Specialty {
  id: number;
  name: string;
  description: string;
}

interface SpecialtiesSelectorProps {
  control: Control<any>;
  setValue: UseFormSetValue<any>;
  getValues: UseFormGetValues<any>;
  typeId: number;
  placeId?: number;
  error?: { message?: string };
}

export default function SpecialtiesSelector({
  control,
  setValue,
  getValues,
  typeId,
  placeId,
  error
}: SpecialtiesSelectorProps) {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpecialties, setSelectedSpecialties] = useState<number[]>([]);
  
  // Fetch specialties for the current place type
  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        setLoading(true);
        
        // Fetch specialties available for this place type
        const typeSpecialtiesRes = await fetch(`/api/specialties?type_id=${typeId}`);
        if (!typeSpecialtiesRes.ok) {
          throw new Error('Failed to fetch specialties');
        }
        
        const typeSpecialties = await typeSpecialtiesRes.json();
        setSpecialties(typeSpecialties);
        
        // If we have a place ID, fetch the specialties already associated with this place
        if (placeId) {
          const placeSpecialtiesRes = await fetch(`/api/specialties?place_id=${placeId}`);
          if (placeSpecialtiesRes.ok) {
            const placeSpecialties = await placeSpecialtiesRes.json();
            const selectedIds = placeSpecialties.map((s: Specialty) => s.id);
            setSelectedSpecialties(selectedIds);
            
            // Update the form with the specialty IDs
            setValue('specialty_ids', selectedIds);
          }
        }
      } catch (err) {
        console.error('Error fetching specialties:', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (typeId) {
      fetchSpecialties();
    }
  }, [typeId, placeId, setValue]);
  
  // Handle adding/removing specialties
  const handleSpecialtyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const specialtyId = parseInt(event.target.value);
    const isChecked = event.target.checked;
    
    let updatedSpecialties: number[];
    
    if (isChecked) {
      // Add the specialty
      updatedSpecialties = [...selectedSpecialties, specialtyId];
    } else {
      // Remove the specialty
      updatedSpecialties = selectedSpecialties.filter(id => id !== specialtyId);
    }
    
    setSelectedSpecialties(updatedSpecialties);
    
    // Update the form values
    setValue('specialty_ids', updatedSpecialties);
    
    // Also update the specialties text field for backward compatibility
    const specialtyNames = updatedSpecialties.map(id => {
      const specialty = specialties.find(s => s.id === id);
      return specialty ? specialty.name : '';
    }).join(', ');
    
    setValue('specialties', specialtyNames);
  };
  
  if (loading) {
    return <div className="text-sm text-gray-500">Loading specialties...</div>;
  }
  
  if (specialties.length === 0) {
    return <div className="text-sm text-gray-500">No specialties available for this shop type</div>;
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Specialties
        </label>
        {selectedSpecialties.length > 0 && (
          <span className="text-xs text-gray-500">
            {selectedSpecialties.length} selected
          </span>
        )}
      </div>
      
      <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-md p-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {specialties.map((specialty) => (
            <div key={specialty.id} className="flex items-start space-x-2 p-1 hover:bg-gray-50">
              <input
                type="checkbox"
                id={`specialty-${specialty.id}`}
                value={specialty.id}
                checked={selectedSpecialties.includes(specialty.id)}
                onChange={handleSpecialtyChange}
                className="h-4 w-4 text-edinburgh-blue focus:ring-edinburgh-blue border-gray-300 rounded mt-1"
              />
              <label 
                htmlFor={`specialty-${specialty.id}`} 
                className="block text-sm cursor-pointer"
                title={specialty.description || ''}
              >
                <div className="font-medium text-gray-700">{specialty.name}</div>
                {specialty.description && (
                  <div className="text-xs text-gray-500 truncate max-w-xs">{specialty.description}</div>
                )}
              </label>
            </div>
          ))}
        </div>
      </div>
      
      {error && error.message && (
        <p className="text-red-500 text-xs mt-1">{error.message}</p>
      )}
      
      {/* Hidden field to store specialty IDs */}
      <Controller
        name="specialty_ids"
        control={control}
        defaultValue={[]}
        render={({ field }) => (
          <input type="hidden" {...field} value={JSON.stringify(selectedSpecialties)} />
        )}
      />
    </div>
  );
}
