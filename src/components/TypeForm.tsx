'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface PlaceType {
  id: number;
  name: string;
}

interface TypeFormProps {
  existingTypes: PlaceType[];
  initialData?: {
    id?: number;
    name: string;
  };
}

export default function TypeForm({ existingTypes, initialData }: TypeFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialData?.name || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  
  const isEdit = !!initialData?.id;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!name.trim()) {
      setError('Category name is required');
      return;
    }
    
    // Check for duplicate name (only for new types)
    if (!isEdit && existingTypes.some(type => type.name.toLowerCase() === name.toLowerCase())) {
      setError('A category with this name already exists');
      return;
    }
    
    setSaving(true);
    
    try {
      const response = await fetch(`/api/types${isEdit ? `/${initialData.id}` : ''}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create place type');
      }
      
      // Navigate back to types page
      router.push('/types');
      router.refresh();
    } catch (err) {
      console.error('Error creating/updating place type:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create place type');
      }
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Category Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="form-input w-full"
          placeholder="e.g., Antique Shop, Auction House"
          required
        />
      </div>
      
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => router.push('/types')}
          className="btn btn-secondary"
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={saving}
        >
          {saving ? 'Saving...' : isEdit ? 'Update Category' : 'Create Category'}
        </button>
      </div>
    </form>
  );
}
