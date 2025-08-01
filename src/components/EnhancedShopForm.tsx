'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Place, PlaceInput, PlaceType, OpeningHour } from '@/lib/data-utils';
import { 
  isValidEmail, 
  isValidUKPhone, 
  isValidWebsite, 
  formatPhoneNumber,
  formatWebsiteUrl,
  formatUKPostcode,
  isInEdinburghArea
} from '@/lib/validation-utils';

// Import our custom form components
import ValidationTextField from './form/ValidationTextField';
import ValidationTextArea from './form/ValidationTextArea';
import ValidationSelectField from './form/ValidationSelectField';
import FormSection from './form/FormSection';
import BusinessHoursEditor from './form/BusinessHoursEditor';
import LocationPicker from './form/LocationPicker';
import SocialMediaSection from './form/SocialMediaSection';
import SpecialtiesSelector from './form/SpecialtiesSelector';

interface EnhancedShopFormProps {
  place?: Place | null;
  placeTypes: PlaceType[];
  openingHours?: OpeningHour[];
  onSubmit: (data: any, hours: OpeningHour[]) => void;
  submitting: boolean;
}

export default function EnhancedShopForm({
  place,
  placeTypes,
  openingHours = [],
  onSubmit,
  submitting
}: EnhancedShopFormProps) {
  // Keyboard shortcuts reference
  const keyboardShortcuts = [
    { key: 'Alt+S', action: 'Save form' },
    { key: 'Alt+C', action: 'Cancel' },
    { key: 'Alt+N', action: 'Focus name field' },
    { key: 'Alt+A', action: 'Focus address field' },
    { key: 'Alt+H', action: 'Jump to hours section' }
  ];
  
  // Show/hide keyboard shortcuts helper
  const [showShortcuts, setShowShortcuts] = useState(false);
  // Set up form with react-hook-form
  const { 
    control, 
    handleSubmit,
    register,
    formState: { errors, isDirty, dirtyFields }, 
    watch,
    setValue,
    reset,
    getValues,
    trigger
  } = useForm({
    defaultValues: {
      name: place?.name || '',
      // Legacy address field
      address: place?.address || '',
      // New structured address fields
      address_street: place?.address_street || '',
      address_area: place?.address_area || '',
      address_city: place?.address_city || 'Edinburgh',
      address_postcode: place?.address_postcode || '',
      // Other fields
      phone: place?.phone || '',
      second_phone: place?.second_phone || '',
      email: place?.email || '',
      website: place?.website || '',
      description: place?.description || '',
      specialties: place?.specialties || '',
      specialty_ids: [], // This will be populated by the SpecialtiesSelector
      lat: place?.lat || 55.9533,
      lng: place?.lng || -3.1883,
      type_id: place?.type_id || (placeTypes.length > 0 ? placeTypes[0].id : 1),
      price_range: place?.price_range || '£',
      // Accessibility fields
      has_disabled_access: place?.has_disabled_access ? true : false,
      has_toilet_facilities: place?.has_toilet_facilities ? true : false,
      trade_associations: place?.trade_associations || '',
      // Social media fields
      facebook_url: place?.facebook_url || '',
      instagram_url: place?.instagram_url || '',
      pinterest_url: place?.pinterest_url || '',
      twitter_url: place?.twitter_url || '',
      youtube_url: place?.youtube_url || '',
      snapchat_url: place?.snapchat_url || '',
      tiktok_url: place?.tiktok_url || '',
    },
    mode: 'onBlur'
  });
  
  // State for opening hours
  const [hours, setHours] = useState<OpeningHour[]>(openingHours);
  
  // When place data changes, reset the form
  useEffect(() => {
    if (place) {
      reset({
        name: place.name,
        // Legacy address field
        address: place.address,
        // New structured address fields
        address_street: place.address_street || '',
        address_area: place.address_area || '',
        address_city: place.address_city || 'Edinburgh',
        address_postcode: place.address_postcode || '',
        // Other fields
        phone: place.phone || '',
        second_phone: place.second_phone || '',
        email: place.email || '',
        website: place.website || '',
        description: place.description || '',
        specialties: place.specialties || '',
        specialty_ids: [], // Will be populated when the component loads
        lat: place.lat,
        lng: place.lng,
        type_id: place.type_id,
        price_range: place.price_range || '£',
        // Accessibility fields
        has_disabled_access: place.has_disabled_access ? true : false,
        has_toilet_facilities: place.has_toilet_facilities ? true : false,
        trade_associations: place.trade_associations || '',
        // Social media fields
        facebook_url: place.facebook_url || '',
        instagram_url: place.instagram_url || '',
        pinterest_url: place.pinterest_url || '',
        twitter_url: place.twitter_url || '',
        youtube_url: place.youtube_url || '',
        snapchat_url: place.snapchat_url || '',
        tiktok_url: place.tiktok_url || '',
      });
    }
  }, [place, reset]);
  
  // Quick formats for phone numbers
  const applyPhoneFormat = (format: string) => {
    const currentValue = getValues('phone') || '';
    
    switch(format) {
      case 'uk':
        setValue('phone', '0131 ', { shouldDirty: true });
        break;
      case 'mobile':
        setValue('phone', '07', { shouldDirty: true });
        break;
      case 'clear':
        setValue('phone', '', { shouldDirty: true });
        break;
    }
  };
  
  // Quick formats for websites
  const applyWebsiteFormat = (format: string) => {
    const currentValue = getValues('website') || '';
    
    switch(format) {
      case 'www':
        setValue('website', 'www.', { shouldDirty: true });
        break;
      case 'http':
        setValue('website', 'http://', { shouldDirty: true });
        break;
      case 'https':
        setValue('website', 'https://', { shouldDirty: true });
        break;
      case 'clear':
        setValue('website', '', { shouldDirty: true });
        break;
    }
  };
  
  // Handle form submission
  const onFormSubmit = (data: any) => {
    // Combine the address fields into the legacy address field
    const combinedAddress = [
      data.address_street,
      data.address_area,
      data.address_city !== 'Edinburgh' ? data.address_city : '',
      data.address_postcode
    ].filter(Boolean).join(', ');

    // Create formatted data
    const formattedData = {
      ...data,
      // Update legacy address field with combined value
      address: combinedAddress,
      // Ensure numeric fields are numbers
      lat: parseFloat(data.lat),
      lng: parseFloat(data.lng),
      type_id: parseInt(data.type_id),
    };
    
    onSubmit(formattedData, hours);
  };
  
  // Update lat/lng when location picker changes
  const handleLocationChange = (newLat: number, newLng: number) => {
    // Only update form values when explicitly changed by user interaction with the map
    // This preserves manually entered precise coordinates
    
    // When updating, maintain full precision of the coordinates
    setValue('lat', newLat, { shouldValidate: true, shouldDirty: true });
    setValue('lng', newLng, { shouldValidate: true, shouldDirty: true });
    
    // Always trigger validation for both fields
    trigger('lat');
    trigger('lng');
  };

  // Function to update the legacy address field when address components change
  const updateLegacyAddress = () => {
    const data = getValues();
    const combinedAddress = [
      data.address_street,
      data.address_area,
      data.address_city !== 'Edinburgh' ? data.address_city : '',
      data.address_postcode
    ].filter(Boolean).join(', ');
    
    setValue('address', combinedAddress, { shouldDirty: true });
  };

  // Update the legacy address field when any address component changes
  useEffect(() => {
    // Track if we're currently updating to prevent infinite loops
    let isUpdating = false;
    
    const subscription = watch((value, { name, type }) => {
      // Only update if we're not already updating and if an address field changed
      if (!isUpdating && name && name.startsWith('address_')) {
        isUpdating = true;
        // Use setTimeout to break the potential call stack chain
        setTimeout(() => {
          updateLegacyAddress();
          isUpdating = false;
        }, 0);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [watch]);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts if in input fields
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement || 
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      
      // Alt + / toggles keyboard shortcuts helper
      if (e.altKey && e.key === '/') {
        e.preventDefault();
        setShowShortcuts(!showShortcuts);
      }
      
      // Alt + S submits the form
      if (e.altKey && e.key === 's') {
        e.preventDefault();
        handleSubmit(onFormSubmit)();
      }
      
      // Alt + C cancels (goes back)
      if (e.altKey && e.key === 'c') {
        e.preventDefault();
        window.history.back();
      }
      
      // Alt + H jumps to hours section
      if (e.altKey && e.key === 'h') {
        e.preventDefault();
        const hoursSection = document.getElementById('opening-hours-section');
        if (hoursSection) {
          hoursSection.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSubmit, onFormSubmit]);
  
  // Prevent form submission on Enter key for all fields
  const preventSubmitOnEnter = (e: React.KeyboardEvent) => {
    // Prevent form submission when pressing Enter in input fields
    if (e.key === 'Enter' && 
        (e.target instanceof HTMLInputElement || 
         e.target instanceof HTMLSelectElement || 
         e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault();
    }
  };

  return (
    <form 
      onSubmit={handleSubmit(onFormSubmit)} 
      className="space-y-8 admin-form"
      onKeyDown={preventSubmitOnEnter}
    >
      {/* Form Controls at Top */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{place ? 'Edit Shop' : 'Add New Shop'}</h1>
        <div className="space-x-4">
          <button
            type="button"
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            onClick={() => window.history.back()}
            disabled={submitting}
          >
            Cancel
          </button>
          
          <button
            type="submit"
            className="px-4 py-2 bg-edinburgh-blue text-white rounded-md hover:bg-edinburgh-blue/90 disabled:opacity-50"
            disabled={submitting || (!isDirty && hours.length === 0)}
          >
            {submitting ? 'Saving...' : place ? 'Update Shop' : 'Create Shop'}
          </button>
        </div>
      </div>

      {showShortcuts && (
        <div className="fixed top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 shadow-xl rounded-lg z-50 w-96">
          <h3 className="text-lg font-medium mb-4">Keyboard Shortcuts</h3>
          <ul className="space-y-2">
            {keyboardShortcuts.map((shortcut, index) => (
              <li key={index} className="flex justify-between">
                <span className="font-medium">{shortcut.key}</span>
                <span>{shortcut.action}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-4 w-full px-4 py-2 bg-gray-200 rounded-md"
            onClick={() => setShowShortcuts(false)}
          >
            Close
          </button>
        </div>
      )}
      
      {/* Basic Information Section */}
      <FormSection 
        title="Basic Information" 
        description="Name and type of antique shop"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Controller
            name="name"
            control={control}
            rules={{ 
              required: 'Shop name is required',
              maxLength: { value: 100, message: 'Name cannot exceed 100 characters' }
            }}
            render={({ field }) => (
              <ValidationTextField
                id="name"
                label="Shop Name"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.name}
                required
                maxLength={100}
                tooltip="The official name of the shop"
                placeholder="e.g. Edinburgh Antiques Emporium"
              />
            )}
          />
          
          <Controller
            name="type_id"
            control={control}
            rules={{ required: 'Shop type is required' }}
            render={({ field }) => (
              <ValidationSelectField
                id="type_id"
                label="Shop Type"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.type_id}
                required
                options={placeTypes.map(type => ({
                  value: type.id,
                  label: type.name
                }))}
                tooltip="The primary type of shop"
              />
            )}
          />
          
          <Controller
            name="price_range"
            control={control}
            render={({ field }) => (
              <ValidationSelectField
                id="price_range"
                label="Price Range"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.price_range}
                options={[
                  { value: '£', label: '£ (Budget)' },
                  { value: '££', label: '££ (Mid-range)' },
                  { value: '£££', label: '£££ (High-end)' },
                  { value: '££££', label: '££££ (Luxury)' },
                ]}
                tooltip="General price range of items sold"
              />
            )}
          />
        </div>
      </FormSection>

      {/* Shop Address Section */}
      <FormSection 
        title="Shop Address" 
        description="Full address details"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <Controller
            name="address_street"
            control={control}
            rules={{ 
              required: 'Street address is required',
              maxLength: { value: 100, message: 'Street address cannot exceed 100 characters' }
            }}
            render={({ field }) => (
              <ValidationTextField
                id="address_street"
                label="Street Address"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.address_street}
                required
                maxLength={100}
                tooltip="Street number and name"
                placeholder="e.g. 123 Royal Mile"
              />
            )}
          />

          <Controller
            name="address_area"
            control={control}
            rules={{ 
              maxLength: { value: 50, message: 'Area cannot exceed 50 characters' }
            }}
            render={({ field }) => (
              <ValidationTextField
                id="address_area"
                label="Area/District"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.address_area}
                maxLength={50}
                tooltip="Neighborhood or district"
                placeholder="e.g. Old Town, Leith, Morningside"
              />
            )}
          />

          <Controller
            name="address_city"
            control={control}
            rules={{ 
              required: 'City is required',
              maxLength: { value: 50, message: 'City cannot exceed 50 characters' }
            }}
            render={({ field }) => (
              <ValidationTextField
                id="address_city"
                label="City"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.address_city}
                required
                maxLength={50}
                tooltip="City name"
                placeholder="Edinburgh"
              />
            )}
          />

          <Controller
            name="address_postcode"
            control={control}
            rules={{ 
              required: 'Postcode is required',
              maxLength: { value: 10, message: 'Postcode cannot exceed 10 characters' },
              pattern: {
                value: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
                message: 'Please enter a valid UK postcode'
              }
            }}
            render={({ field }) => (
              <ValidationTextField
                id="address_postcode"
                label="Postcode"
                value={field.value}
                onChange={(e) => {
                  // Format with a space between outward and inward parts
                  const formatted = formatUKPostcode(e.target.value);
                  field.onChange(formatted);
                }}
                onBlur={field.onBlur}
                error={errors.address_postcode}
                required
                maxLength={10}
                tooltip="UK postcode"
                placeholder="e.g. EH1 1AB"
              />
            )}
          />

          <div className="col-span-2 text-sm text-gray-500 mt-2">
            <p>For legacy compatibility, the combined address will be maintained automatically.</p>
          </div>
        </div>
      </FormSection>
      
      {/* Contact Information Section */}
      <FormSection 
        title="Contact Information" 
        description="How customers can reach the shop"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Controller
            name="phone"
            control={control}
            rules={{ 
              // Very basic validation - just make sure it starts with 0 or +44
              validate: value => {
                if (!value) return true;
                // Accept almost any format but ensure it starts with 0 or +44
                // and contains at least 10 digits
                const digitsOnly = value.replace(/\D/g, '');
                const startsCorrectly = value.trim().startsWith('0') || value.trim().startsWith('+44');
                return (startsCorrectly && digitsOnly.length >= 10) || 'Please enter a valid UK phone number';
              }
            }}            
            render={({ field }) => (
              <div>
                <ValidationTextField
                  id="phone"
                  label="Primary Phone"
                  value={field.value}
                  onChange={(e) => {
                    // Format input for Edinburgh style numbers
                    const inputValue = e.target.value;
                    // If it's an Edinburgh number, format it
                    if (inputValue.startsWith('0131')) {
                      const formatted = formatPhoneNumber(inputValue);
                      field.onChange(formatted);
                    } else {
                      field.onChange(inputValue);
                    }
                  }}
                  onBlur={(e) => {
                    // Format on blur regardless of pattern
                    const formatted = formatPhoneNumber(e.target.value);
                    field.onChange(formatted);
                    field.onBlur();
                  }}
                  error={errors.phone}
                  tooltip="Shop's main contact phone number"
                  placeholder="0131 123 1234"
                  maxLength={20}
                />
                <div className="text-sm text-gray-500 mt-1">
                  Format as 0131 123 1234 for Edinburgh numbers
                </div>
              </div>
            )}
          />
          
          <Controller
            name="second_phone"
            control={control}
            rules={{ 
              // Very basic validation - just make sure it starts with 0 or +44
              validate: value => {
                if (!value) return true;
                // Accept almost any format but ensure it starts with 0 or +44
                // and contains at least 10 digits
                const digitsOnly = value.replace(/\D/g, '');
                const startsCorrectly = value.trim().startsWith('0') || value.trim().startsWith('+44');
                return (startsCorrectly && digitsOnly.length >= 10) || 'Please enter a valid UK phone number';
              }
            }}            
            render={({ field }) => (
              <div>
                <ValidationTextField
                  id="second_phone"
                  label="Secondary Phone"
                  value={field.value}
                  onChange={(e) => {
                    // Format input for Edinburgh style numbers
                    const inputValue = e.target.value;
                    // If it's an Edinburgh number, format it
                    if (inputValue.startsWith('0131')) {
                      const formatted = formatPhoneNumber(inputValue);
                      field.onChange(formatted);
                    } else {
                      field.onChange(inputValue);
                    }
                  }}
                  onBlur={(e) => {
                    // Format on blur regardless of pattern
                    const formatted = formatPhoneNumber(e.target.value);
                    field.onChange(formatted);
                    field.onBlur();
                  }}
                  error={errors.second_phone}
                  tooltip="Alternative contact number (e.g., mobile)"
                  placeholder="07123 456789"
                  maxLength={20}
                />
                <div className="text-sm text-gray-500 mt-1">
                  Optional alternative contact number
                </div>
              </div>
            )}
          />
          
          <Controller
            name="email"
            control={control}
            rules={{ 
              validate: value => !value || isValidEmail(value) || 'Please enter a valid email address'
            }}
            render={({ field }) => (
              <ValidationTextField
                id="email"
                label="Email Address"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.email}
                maxLength={50}
                tooltip="Shop's contact email address (max 50 characters)"
                placeholder="contact@example.com"
              />
            )}
          />
          
          <Controller
            name="website"
            control={control}
            rules={{ 
              validate: value => !value || isValidWebsite(value) || 'Please enter a valid website URL'
            }}            
            render={({ field }) => (
              <div>
                <ValidationTextField
                  id="website"
                  label="Website"
                  value={typeof field.value === 'string' ? field.value : ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.website}
                  tooltip="Shop's website address (domain only, no prefixes needed)"
                  placeholder="example.co.uk"
                  maxLength={50}
                />
                <div className="text-sm text-gray-500 mt-1">
                  Enter domain name only (e.g., armchairbooks.co.uk). Required prefixes will be added automatically.
                </div>
              </div>
            )}
          />
        </div>
      </FormSection>
      
      {/* Social Media Links */}
      <SocialMediaSection
        register={register}
        errors={errors}
        control={control}
        handleKeyPress={preventSubmitOnEnter}
        disabled={submitting}
      />
      
      {/* Shop Details Section */}
      <FormSection 
        title="Accessibility & Amenities" 
        description="Accessibility information and amenities"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div className="col-span-2 md:col-span-1">
            <Controller
              name="has_disabled_access"
              control={control}
              render={({ field }) => (
                <div className="flex items-center space-x-2">
                  <input
                    id="has_disabled_access"
                    type="checkbox"
                    className="h-4 w-4 text-edinburgh-blue focus:ring-edinburgh-blue border-gray-300 rounded"
                    checked={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                  <label htmlFor="has_disabled_access" className="block text-sm font-medium text-gray-700">
                    Disabled/Wheelchair Access
                  </label>
                  <div className="ml-1 text-sm">
                    <span className="text-gray-500 hover:text-gray-700 cursor-help" title="Indicates if the shop has step-free access and is accessible for wheelchairs">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                  </div>
                </div>
              )}
            />
          </div>
          
          <div className="col-span-2 md:col-span-1">
            <Controller
              name="has_toilet_facilities"
              control={control}
              render={({ field }) => (
                <div className="flex items-center space-x-2">
                  <input
                    id="has_toilet_facilities"
                    type="checkbox"
                    className="h-4 w-4 text-edinburgh-blue focus:ring-edinburgh-blue border-gray-300 rounded"
                    checked={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                  <label htmlFor="has_toilet_facilities" className="block text-sm font-medium text-gray-700">
                    Customer Toilet Facilities
                  </label>
                  <div className="ml-1 text-sm">
                    <span className="text-gray-500 hover:text-gray-700 cursor-help" title="Indicates if the shop has toilet facilities available for customers">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                  </div>
                </div>
              )}
            />
          </div>
          
          <div className="col-span-2">
            <Controller
              name="trade_associations"
              control={control}
              rules={{ 
                maxLength: { value: 200, message: 'Trade associations cannot exceed 200 characters' }
              }}
              render={({ field }) => (
                <ValidationTextField
                  id="trade_associations"
                  label="Trade Organization Memberships"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.trade_associations}
                  maxLength={200}
                  tooltip="Trade associations or organizations the shop is a member of"
                  placeholder="e.g. LAPADA, BADA, CINOA"
                />
              )}
            />
          </div>
        </div>
      </FormSection>
      
      <FormSection 
        title="Shop Details" 
        description="Additional information about the shop"
      >
        <div className="grid grid-cols-1 gap-6">
          <Controller
            name="description"
            control={control}
            rules={{ 
              maxLength: { value: 1000, message: 'Description cannot exceed 1000 characters' }
            }}
            render={({ field }) => (
              <ValidationTextArea
                id="description"
                label="Description"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.description}
                maxLength={1000}
                rows={5}
                tooltip="Detailed description of the shop and what it offers"
                placeholder="Describe the shop, its history, and what makes it special..."
              />
            )}
          />
          
          <SpecialtiesSelector
            control={control}
            setValue={setValue}
            getValues={getValues}
            typeId={parseInt(String(watch('type_id')))}
            placeId={place?.id}
            error={errors.specialties}
          />
          
          {/* Hidden specialties text field for backward compatibility */}
          <Controller
            name="specialties"
            control={control}
            rules={{ 
              maxLength: { value: 300, message: 'Specialties cannot exceed 300 characters' }
            }}
            render={({ field }) => (
              <input type="hidden" {...field} />
            )}
          />
        </div>
      </FormSection>
      
      {/* Opening Hours Section */}
      <FormSection 
        id="opening-hours-section"
        title="Opening Hours" 
        description="When customers can visit the shop"
      >
        <BusinessHoursEditor 
          openingHours={hours} 
          onChange={setHours}
          placeId={place?.id}
        />
      </FormSection>
      
      {/* Location Section */}
      <FormSection 
        title="Shop Location" 
        description="Where the shop is located on the map. You can type coordinates or use the map."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <Controller
            name="lat"
            control={control}
            rules={{
              required: 'Latitude is required',
              validate: value => {
                const floatVal = parseFloat(String(value));
                if (isNaN(floatVal)) return 'Latitude must be a number.';
                // Use getValues for potentially more stable value during cross-field validation
                return isInEdinburghArea(floatVal, parseFloat(String(getValues('lng')))) || 'Location should be within Edinburgh area. Ensure longitude is also set correctly.';
              }
            }}
            render={({ field }) => (
              <ValidationTextField
                id="latitude"
                label="Latitude"
                type="text"
                value={String(field.value)} // react-hook-form handles state, ensure string for input value
                onChange={(e) => {
                  // Validate it's a valid number but keep as precise string
                  const val = e.target.value;
                  if (val === '' || val === '-' || !isNaN(parseFloat(val))) {
                    field.onChange(val === '' || val === '-' ? val : parseFloat(val));
                  }
                }}
                onBlur={field.onBlur}
                error={errors.lat}
                tooltip="Enter the latitude with full precision"
                placeholder="e.g. 55.95503166214517"
              />
            )}
          />
          <Controller
            name="lng"
            control={control}
            rules={{
              required: 'Longitude is required',
              validate: value => {
                const floatVal = parseFloat(String(value));
                if (isNaN(floatVal)) return 'Longitude must be a number.';
                return true; // Main area validation is on lat field
              }
            }}
            render={({ field }) => (
              <ValidationTextField
                id="longitude"
                label="Longitude"
                type="text"
                value={String(field.value)} // react-hook-form handles state, ensure string for input value
                onChange={(e) => {
                  // Validate it's a valid number but keep as precise string
                  const val = e.target.value;
                  if (val === '' || val === '-' || !isNaN(parseFloat(val))) {
                    field.onChange(val === '' || val === '-' ? val : parseFloat(val));
                  }
                }}
                onBlur={field.onBlur}
                error={errors.lng}
                tooltip="Enter the longitude with full precision"
                placeholder="e.g. -3.210047905254123"
              />
            )}
          />
        </div>
        
        <LocationPicker
          lat={String(watch('lat'))} // Drive picker from form state
          lng={String(watch('lng'))} // Drive picker from form state
          address={watch('address')}
          onChange={handleLocationChange} // Updates form state, which in turn updates text fields
          error={null} // Errors are now handled by individual text fields
        />
        {/* Display validation error for lat if it's from isInEdinburghArea */}
        {errors.lat && errors.lat.type === 'validate' && (
            <p className="text-sm text-red-600 mt-1">{errors.lat.message}</p>
        )}
        {errors.lng && errors.lng.type === 'validate' && (
            <p className="text-sm text-red-600 mt-1">{errors.lng.message}</p>
        )}
      </FormSection>
      
      {/* Form Controls */}
      <div className="flex justify-end space-x-4 mt-8">
        <button
          type="button"
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          onClick={() => window.history.back()}
          disabled={submitting}
        >
          Cancel
        </button>
        
        <button
          type="submit"
          className="px-4 py-2 bg-edinburgh-blue text-white rounded-md hover:bg-edinburgh-blue/90 disabled:opacity-50"
          disabled={submitting || (!isDirty && hours.length === 0)}
        >
          {submitting ? 'Saving...' : place ? 'Update Shop' : 'Create Shop'}
        </button>
      </div>
    </form>
  );
}
