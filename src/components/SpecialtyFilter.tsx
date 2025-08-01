'use client';

import { useState, useEffect } from 'react';

interface SpecialtyFilterProps {
  initialSelectedIds?: number[];
  typeId?: number;
  onChange?: (selectedIds: number[]) => void;
}

export interface Specialty {
  id: number;
  name: string;
  description: string;
}

export default function SpecialtyFilter({ 
  initialSelectedIds = [], 
  typeId, 
  onChange 
}: SpecialtyFilterProps) {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<number[]>(initialSelectedIds);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  
  // Load specialties data without URL dependencies
  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        setLoading(true);
        
        // If typeId is provided, fetch specialties for that type
        // Otherwise fetch all specialties
        const url = typeId ? `/api/specialties?type_id=${typeId}` : '/api/specialties';
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch specialties');
        }
        
        const data = await response.json();
        setSpecialties(data);
      } catch (error) {
        console.error('Error fetching specialties:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSpecialties();
  }, [typeId]);
  
  // Set initial selected specialties when props change
  useEffect(() => {
    if (initialSelectedIds?.length) {
      setSelectedSpecialties(initialSelectedIds);
    }
  }, [initialSelectedIds]);
  
  // Simple selection handler without URL manipulation
  const handleSpecialtyChange = (specialtyId: number) => {
    let updatedSpecialties: number[];
    
    if (selectedSpecialties.includes(specialtyId)) {
      // Remove the specialty if already selected
      updatedSpecialties = selectedSpecialties.filter(id => id !== specialtyId);
    } else {
      // Add the specialty
      updatedSpecialties = [...selectedSpecialties, specialtyId];
    }
    
    // Update local state immediately for responsive UI
    setSelectedSpecialties(updatedSpecialties);
    
    // Call onChange to notify parent - parent handles URL updates
    if (onChange) {
      onChange(updatedSpecialties);
    }
  };
  
  const clearSelections = () => {
    // Simply clear local state
    setSelectedSpecialties([]);
    
    // Notify parent to handle URL changes
    if (onChange) {
      onChange([]);
    }
  };
  
  if (loading) {
    return <div className="text-sm text-gray-500">Loading specialties...</div>;
  }
  
  if (specialties.length === 0) {
    return null;
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-lg">Filter by Specialties</h3>
        <button 
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-edinburgh-blue hover:underline"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      </div>
      
      {selectedSpecialties.length > 0 && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">
            {selectedSpecialties.length} selected
          </span>
          <button 
            onClick={clearSelections}
            className="text-xs text-edinburgh-blue hover:underline"
          >
            Clear all
          </button>
        </div>
      )}
      
      <div className={`space-y-1 ${!expanded ? 'max-h-36 overflow-y-auto' : ''}`}>
        {specialties.map(specialty => (
          <div key={specialty.id} className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={`filter-specialty-${specialty.id}`}
              value={specialty.id}
              checked={selectedSpecialties.includes(specialty.id)}
              onChange={() => handleSpecialtyChange(specialty.id)}
              className="h-4 w-4 text-edinburgh-blue border-gray-300 rounded focus:ring-edinburgh-blue"
            />
            <label 
              htmlFor={`filter-specialty-${specialty.id}`} 
              title={specialty.description}
              className="text-sm cursor-pointer flex-1"
            >
              {specialty.name}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
