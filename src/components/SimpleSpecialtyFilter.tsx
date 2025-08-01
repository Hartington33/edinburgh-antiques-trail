'use client';

import { useState, useEffect } from 'react';

interface Specialty {
  id: number;
  name: string;
  description: string;
}

interface SimpleSpecialtyFilterProps {
  typeId?: number;
  onChange: (ids: number[]) => void;
}

// A simplified specialty filter with no URL manipulation or complex state
export default function SimpleSpecialtyFilter({ typeId, onChange }: SimpleSpecialtyFilterProps) {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Fetch specialties
  useEffect(() => {
    const fetchSpecialties = async () => {
      setLoading(true);
      try {
        const url = typeId ? `/api/specialties?type_id=${typeId}` : '/api/specialties';
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setSpecialties(data);
        }
      } catch (error) {
        console.error("Failed to fetch specialties", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSpecialties();
  }, [typeId]);
  
  // Handle specialty selection
  const toggleSpecialty = (id: number) => {
    let newSelected: number[];
    
    if (selectedIds.includes(id)) {
      newSelected = selectedIds.filter(sid => sid !== id);
    } else {
      newSelected = [...selectedIds, id];
    }
    
    setSelectedIds(newSelected);
    onChange(newSelected);
  };
  
  // Clear all selected specialties
  const clearAll = () => {
    setSelectedIds([]);
    onChange([]);
  };
  
  if (loading) return <p>Loading specialties...</p>;
  if (!specialties.length) return null;
  
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-medium mb-2">Filter by Specialty</h3>
      
      {selectedIds.length > 0 && (
        <div className="flex justify-between mb-2">
          <span className="text-sm">{selectedIds.length} selected</span>
          <button 
            onClick={clearAll}
            className="text-sm text-blue-600 hover:underline"
          >
            Clear all
          </button>
        </div>
      )}
      
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {specialties.map(specialty => (
          <div key={specialty.id} className="flex items-center">
            <input
              type="checkbox"
              id={`spec-${specialty.id}`}
              checked={selectedIds.includes(specialty.id)}
              onChange={() => toggleSpecialty(specialty.id)}
              className="mr-2"
            />
            <label htmlFor={`spec-${specialty.id}`} className="text-sm">
              {specialty.name}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
