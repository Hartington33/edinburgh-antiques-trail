'use client';

import React, { useState, useEffect } from 'react';
import { FieldError } from 'react-hook-form';

interface ValidationTextAreaProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  error?: FieldError | undefined;
  helperText?: string;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  disabled?: boolean;
  className?: string;
  tooltip?: string;
}

export default function ValidationTextArea({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  helperText,
  required = false,
  placeholder = '',
  maxLength,
  rows = 4,
  disabled = false,
  className = '',
  tooltip,
}: ValidationTextAreaProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  
  // Reset internal error when external error changes
  useEffect(() => {
    if (error) {
      setInternalError(error.message || 'This field is invalid');
    } else {
      setInternalError(null);
    }
  }, [error]);
  
  // Validate on blur
  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    if (required && !value.trim()) {
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
      
      <textarea
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        onBlur={handleBlur}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={`w-full px-3 py-2 border rounded-md ${
          internalError
            ? 'border-red-300 focus:border-red-500 focus:ring focus:ring-red-200'
            : 'border-gray-300 focus:border-edinburgh-blue focus:ring focus:ring-edinburgh-blue/20'
        } ${disabled ? 'bg-gray-100 text-gray-500' : ''}`}
        aria-invalid={!!internalError}
        aria-describedby={internalError ? `${id}-error` : helperText ? `${id}-helper` : undefined}
        required={required}
      />
      
      {internalError ? (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-600">
          {internalError}
        </p>
      ) : helperText ? (
        <p id={`${id}-helper`} className="mt-1 text-sm text-gray-500">
          {helperText}
        </p>
      ) : null}
      
      {maxLength && (
        <div className="flex justify-end mt-1">
          <span className="text-xs text-gray-500">{value.length}/{maxLength}</span>
        </div>
      )}
    </div>
  );
}
