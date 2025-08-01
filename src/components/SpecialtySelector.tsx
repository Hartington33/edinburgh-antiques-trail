'use client';

import { useState, useEffect } from 'react';

export interface Specialty {
  id: number;
  name: string;
  description: string;
}

interface SpecialtySelectorProps {
  selectedSpecialtyIds?: number[];
  onSpecialtiesChange: (specialtyIds: number[]) => void;
  className?: string;
  typeId?: number;
}

export default function SpecialtySelector({ 
  selectedSpecialtyIds = [], 
  onSpecialtiesChange,
  className = '', 
  typeId 
}: SpecialtySelectorProps) {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>(selectedSpecialtyIds);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  
  // Load specialties data
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
  
  // Sync selected IDs when props change
  useEffect(() => {
    if (selectedSpecialtyIds) {
      setSelectedIds([...selectedSpecialtyIds]);
    }
  }, [selectedSpecialtyIds]);
  
  const handleSpecialtyChange = (specialtyId: number) => {
    let updatedSpecialties: number[];
    
    if (selectedIds.includes(specialtyId)) {
      // Remove the specialty if already selected
      updatedSpecialties = selectedIds.filter(id => id !== specialtyId);
    } else {
      // Add the specialty
      updatedSpecialties = [...selectedIds, specialtyId];
    }
    
    // Update local state immediately for responsive UI
    setSelectedIds(updatedSpecialties);
    
    // Notify parent of the change
    onSpecialtiesChange(updatedSpecialties);
  };
  
  const clearSelections = () => {
    // Clear local state
    setSelectedIds([]);
    
    // Notify parent
    onSpecialtiesChange([]);
  };
  
  if (loading) {
    return <div className="text-sm text-gray-500">Loading specialties...</div>;
  }
  
  if (specialties.length === 0) {
    return <div className="text-sm text-gray-500">No specialties available</div>;
  }
  
  return (
    <div className={`bg-white rounded-lg p-4 space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-lg">Specialties</h3>
        <button 
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-edinburgh-blue hover:underline"
          type="button"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      </div>
      
      {selectedIds.length > 0 && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">
            {selectedIds.length} selected
          </span>
          <button 
            onClick={clearSelections}
            className="text-xs text-edinburgh-blue hover:underline"
            type="button"
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
              id={`specialty-${specialty.id}`}
              value={specialty.id}
              checked={selectedIds.includes(specialty.id)}
              onChange={() => handleSpecialtyChange(specialty.id)}
              className="h-4 w-4 text-edinburgh-blue border-gray-300 rounded focus:ring-edinburgh-blue"
            />
            <label 
              htmlFor={`specialty-${specialty.id}`} 
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
