'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Neighborhood {
  id: number;
  name: string;
  description: string;
}

export default function NeighborhoodsAdmin() {
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const router = useRouter();

  useEffect(() => {
    fetchNeighborhoods();
  }, []);
  
  const fetchNeighborhoods = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/neighborhoods');
      
      if (!res.ok) {
        throw new Error('Failed to fetch neighborhoods');
      }
      
      const data = await res.json();
      setNeighborhoods(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching neighborhoods:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddNew = () => {
    setFormData({ name: '', description: '' });
    setEditMode(-1); // -1 indicates new entry
  };
  
  const handleEdit = (neighborhood: Neighborhood) => {
    setFormData({
      name: neighborhood.name,
      description: neighborhood.description
    });
    setEditMode(neighborhood.id);
  };
  
  const handleCancel = () => {
    setEditMode(null);
    setFormData({ name: '', description: '' });
  };
  
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this neighborhood? This will affect all places in this neighborhood.')) {
      return;
    }
    
    try {
      const res = await fetch(`/api/neighborhoods?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete neighborhood');
      }
      
      // Update the neighborhoods list
      setNeighborhoods(neighborhoods.filter(n => n.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error deleting neighborhood:', err);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    
    try {
      let res;
      
      if (editMode === -1) {
        // Create new
        res = await fetch('/api/neighborhoods', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
      } else {
        // Update existing
        res = await fetch(`/api/neighborhoods?id=${editMode}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
      }
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Operation failed');
      }
      
      // Reset form and refresh data
      setEditMode(null);
      setFormData({ name: '', description: '' });
      fetchNeighborhoods();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error saving neighborhood:', err);
    }
  };
  
  if (loading && neighborhoods.length === 0) {
    return <div className="text-center py-8">Loading neighborhoods...</div>;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-edinburgh-blue mb-2">Manage Neighborhoods</h1>
          <p className="text-gray-600">
            Add, edit, or delete neighborhoods in the Edinburgh Antiques Trail.
          </p>
        </div>
        <div className="flex space-x-4">
          <Link href="/admin" className="px-4 py-2 border rounded-md text-edinburgh-blue hover:bg-gray-50">
            Back to Dashboard
          </Link>
          {!editMode && (
            <button 
              onClick={handleAddNew}
              className="px-4 py-2 bg-edinburgh-blue text-white rounded-md hover:bg-opacity-90"
            >
              Add New Neighborhood
            </button>
          )}
        </div>
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
      
      {editMode !== null && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            {editMode === -1 ? 'Add New Neighborhood' : 'Edit Neighborhood'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="form-label">Name *</label>
              <input
                type="text"
                id="name"
                className="input"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
            
            <div>
              <label htmlFor="description" className="form-label">Description</label>
              <textarea
                id="description"
                className="input"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-edinburgh-blue text-white rounded-md hover:bg-opacity-90"
              >
                {editMode === -1 ? 'Create Neighborhood' : 'Update Neighborhood'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {neighborhoods.map(neighborhood => (
              <tr key={neighborhood.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{neighborhood.name}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-gray-500">{neighborhood.description || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => handleEdit(neighborhood)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(neighborhood.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {neighborhoods.length === 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-gray-500">No neighborhoods found.</p>
          <button
            onClick={handleAddNew}
            className="mt-4 inline-block px-4 py-2 bg-edinburgh-blue text-white rounded-md"
          >
            Add Your First Neighborhood
          </button>
        </div>
      )}
    </div>
  );
}
