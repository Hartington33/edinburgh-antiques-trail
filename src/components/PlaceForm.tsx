'use client';

import { useState, useEffect } from 'react';
import ForceReloadMap from './ForceReloadMap';
import HierarchicalSpecialtyFilter from './HierarchicalSpecialtyFilter';

// Neighborhood interface removed

interface PlaceType {
  id: number;
  name: string;
}

interface Place {
  id: number;
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  specialties: string | null;
  specialty_ids?: number[];
  opening_hours: string | null;
  lat: number;
  lng: number;
  type_id: number;
  price_range: string | null;
}

interface PlaceFormProps {
  place: Place | null;
  placeTypes: PlaceType[];
  onSubmit: (data: any) => void;
  submitting: boolean;
}

const edinburghCenter = {
  lat: 55.9533,
  lng: -3.1883
};

const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '0.5rem',
};

export default function PlaceForm({ 
  place, 
  placeTypes, 
  onSubmit, 
  submitting 
}: PlaceFormProps) {
  
  // Initialize form state with existing place data or defaults
  const [formData, setFormData] = useState({
    name: place?.name || '',
    address: place?.address || '',
    phone: place?.phone || '',
    email: place?.email || '',
    website: place?.website || '',
    description: place?.description || '',
    specialties: place?.specialties || '',
    opening_hours: place?.opening_hours || '',
    lat: place?.lat || edinburghCenter.lat,
    lng: place?.lng || edinburghCenter.lng,
    type_id: place?.type_id || (placeTypes.length > 0 ? placeTypes[0].id : 1),
    price_range: place?.price_range || '£',
  });
  
  // State to track selected specialty IDs
  const [selectedSpecialtyIds, setSelectedSpecialtyIds] = useState<number[]>(place?.specialty_ids || []);
  
  // Fetch specialty IDs for this place if they exist
  useEffect(() => {
    if (place?.id) {
      fetch(`/api/specialties?place_id=${place.id}`)
        .then(response => response.json())
        .then(specialties => {
          const ids = specialties.map((s: any) => s.id);
          setSelectedSpecialtyIds(ids);
        })
        .catch(error => console.error('Error fetching place specialties:', error));
    }
  }, [place?.id]);
  
  const [markerPosition, setMarkerPosition] = useState({
    lat: place?.lat || edinburghCenter.lat,
    lng: place?.lng || edinburghCenter.lng,
  });
  
  // Update form data when marker position changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      lat: markerPosition.lat,
      lng: markerPosition.lng,
    }));
  }, [markerPosition]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };
  
  // Handle specialty selection changes
  const handleSpecialtiesChange = (specialtyIds: number[]) => {
    console.log('Edit Place - specialty IDs changed:', specialtyIds);
    
    // Compare with previous selection to see if anything changed
    // This helps us determine if we need to save specialty changes
    const sortedOld = [...selectedSpecialtyIds].sort().join(',');
    const sortedNew = [...specialtyIds].sort().join(',');
    
    // Only mark as modified if the selection actually changed
    if (sortedOld !== sortedNew) {
      setSpecialtiesModified(true);
      console.log('Specialties have been modified!');
    }
    
    // Update the selected specialty IDs
    setSelectedSpecialtyIds(specialtyIds);
    
    // Update the text representation for backward compatibility
    // This will be sync'd properly on save by the syncSpecialtiesFromText function
    if (specialtyIds.length > 0) {
      fetch('/api/specialties')
        .then(response => response.json())
        .then(allSpecialties => {
          const selectedSpecialties = allSpecialties
            .filter((s: any) => specialtyIds.includes(s.id))
            .map((s: any) => s.name);
          
          setFormData(prev => ({
            ...prev,
            specialties: selectedSpecialties.join(', ')
          }));
        })
        .catch(error => console.error('Error fetching specialties for names:', error));
    } else {
      setFormData(prev => ({
        ...prev,
        specialties: ''
      }));
    }
  };

  // Track if specialties have been modified
  const [specialtiesModified, setSpecialtiesModified] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert string IDs to numbers
    const data: any = {
      ...formData,
      type_id: Number(formData.type_id),
    };
    
    // Add the place ID if this is an update
    if (place?.id) {
      data.id = place.id;
    }
    
    // Call the onSubmit function passed as prop
    onSubmit(data);
    
    // Save specialty associations separately - but ONLY if modified
    if (place?.id) {
      // Only save specialties if they've been modified
      if (specialtiesModified) {
        console.log('Saving modified specialties:', selectedSpecialtyIds);
        
        fetch(`/api/specialties?place_id=${place.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(selectedSpecialtyIds),
        })
          .then(response => response.json())
          .then(result => {
            if (result.success) {
              console.log('Specialties saved successfully');
              // Reset the modification flag
              setSpecialtiesModified(false);
            } else {
              console.error('Failed to save specialties');
            }
          })
          .catch(error => console.error('Error saving specialties:', error));
      } else {
        console.log('Specialties not modified, skipping save');
      }
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="form-label">Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              className="input"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div>
            <label htmlFor="address" className="form-label">Address *</label>
            <input
              type="text"
              id="address"
              name="address"
              className="input"
              value={formData.address}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="type_id" className="form-label">Category *</label>
              <select
                id="type_id"
                name="type_id"
                className="input"
                value={formData.type_id}
                onChange={handleInputChange}
                required
              >
                {placeTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="price_range" className="form-label">Price Range</label>
              <select
                id="price_range"
                name="price_range"
                className="input"
                value={formData.price_range || ''}
                onChange={handleInputChange}
              >
                <option value="£">£ (Budget)</option>
                <option value="££">££ (Mid-range)</option>
                <option value="£££">£££ (High-end)</option>
                <option value="££££">££££ (Luxury)</option>
              </select>
            </div>
          </div>
          
          <div>
            <label htmlFor="phone" className="form-label">Phone</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              className="input"
              value={formData.phone}
              onChange={handleInputChange}
            />
          </div>
          
          <div>
            <label htmlFor="email" className="form-label">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              className="input"
              value={formData.email}
              onChange={handleInputChange}
            />
          </div>
          
          <div>
            <label htmlFor="website" className="form-label">Website</label>
            <input
              type="text"
              id="website"
              name="website"
              className="input"
              value={formData.website}
              onChange={handleInputChange}
              placeholder="example.com"
            />
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="form-label">Specialties</label>
            <div className="specialty-filter-container">
              <HierarchicalSpecialtyFilter
                initialSelectedIds={selectedSpecialtyIds}
                onChange={handleSpecialtiesChange}
                mode="advanced"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Selected: {formData.specialties || 'None'}</p>
          </div>
          
          <div>
            <label htmlFor="opening_hours" className="form-label">Opening Hours</label>
            <textarea
              id="opening_hours"
              name="opening_hours"
              className="input"
              rows={3}
              value={formData.opening_hours}
              onChange={handleInputChange}
              placeholder="e.g. Mon-Fri: 10:00-17:00, Sat: 10:00-16:00, Sun: Closed"
            />
          </div>
          
          <div>
            <label htmlFor="description" className="form-label">Description</label>
            <textarea
              id="description"
              name="description"
              className="input"
              rows={5}
              value={formData.description}
              onChange={handleInputChange}
            />
          </div>
        </div>
      </div>
      
      <div>
        <label className="form-label">Location * (Click on map or drag marker to set location)</label>
        <ForceReloadMap
          lat={markerPosition.lat} 
          lng={markerPosition.lng} 
          onChange={setMarkerPosition} 
        />
        
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div>
            <label htmlFor="lat" className="form-label">Latitude</label>
            <input
              type="number"
              id="lat"
              name="lat"
              className="input"
              value={formData.lat}
              onChange={handleInputChange}
              step="any"
              required
            />
          </div>
          
          <div>
            <label htmlFor="lng" className="form-label">Longitude</label>
            <input
              type="number"
              id="lng"
              name="lng"
              className="input"
              value={formData.lng}
              onChange={handleInputChange}
              step="any"
              required
            />
          </div>
        </div>
      </div>
      
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => window.history.back()}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting}
        >
          {submitting ? 'Saving...' : (place ? 'Update Place' : 'Create Place')}
        </button>
      </div>
    </form>
  );
}
