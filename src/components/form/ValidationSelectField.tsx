'use client';

import React, { useState, useEffect } from 'react';
import { FieldError } from 'react-hook-form';

export interface SelectOption {
  value: string | number;
  label: string;
}

interface ValidationSelectFieldProps {
  id: string;
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void;
  options: SelectOption[];
  error?: FieldError | undefined;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  tooltip?: string;
}

export default function ValidationSelectField({
  id,
  label,
  value,
  onChange,
  onBlur,
  options,
  error,
  helperText,
  required = false,
  disabled = false,
  className = '',
  tooltip,
}: ValidationSelectFieldProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  
  // Reset internal error when external error changes
  useEffect(() => {
    if (error) {
      setInternalError(error.message || 'Please select a valid option');
    } else {
      setInternalError(null);
    }
  }, [error]);
  
  // Validate on blur
  const handleBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
    if (required && (!value || value === '')) {
      setInternalError('This field is required');
    } else {
      setInternalError(null);
    }
    
    if (onBlur) onBlur(e);
  };
  
  return (
    <div className={`form-field ${className}`}>
      <div className="field-header">
        <label htmlFor={id} className="form-label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        
        {tooltip && (
          <div className="relative inline-block">
            <button
              type="button"
              className="ml-1 text-gray-400 hover:text-gray-500 focus:outline-none"
              onClick={() => setShowTooltip(!showTooltip)}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              aria-label="Help"
              tabIndex={-1} /* Make button not tabbable */
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </button>
            
            {showTooltip && (
              <div className="absolute z-10 w-64 p-2 mt-1 text-sm text-white bg-gray-800 rounded-md shadow-lg">
                {tooltip}
              </div>
            )}
          </div>
        )}
      </div>
      
      <select
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        onBlur={handleBlur}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-md appearance-none bg-white ${
          internalError
            ? 'border-red-300 focus:border-red-500 focus:ring focus:ring-red-200'
            : 'border-gray-300 focus:border-edinburgh-blue focus:ring focus:ring-edinburgh-blue/20'
        } ${disabled ? 'bg-gray-100 text-gray-500' : ''}`}
        aria-invalid={!!internalError}
        aria-describedby={internalError ? `${id}-error` : helperText ? `${id}-helper` : undefined}
        required={required}
      >
        <option value="">Select {label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </div>
      
      {internalError ? (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-600">
          {internalError}
        </p>
      ) : helperText ? (
        <p id={`${id}-helper`} className="mt-1 text-sm text-gray-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
