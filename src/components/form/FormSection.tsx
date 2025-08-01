'use client';

import React, { useState } from 'react';

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  collapsible?: boolean;
  className?: string;
  id?: string;
}

export default function FormSection({
  title,
  description,
  children,
  defaultExpanded = true,
  collapsible = true,
  className = '',
  id,
}: FormSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  return (
    <div id={id} className={`form-section mb-8 ${className}`}>
      <div 
        className={`flex items-center ${collapsible ? 'cursor-pointer' : ''}`}
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
      >
        <h3 className="text-xl font-semibold text-edinburgh-blue">
          {title}
        </h3>
        
        {collapsible && (
          <button
            type="button"
            className="ml-2 text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
            tabIndex={-1} /* Make button not tabbable */
          >
            <svg 
              className={`w-5 h-5 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>
      
      {description && (
        <p className="text-gray-500 text-sm mt-1">
          {description}
        </p>
      )}
      
      <div 
        className={`mt-4 space-y-4 transition-all duration-300 ${
          isExpanded ? 'opacity-100 max-h-[2000px]' : 'opacity-0 max-h-0 overflow-hidden'
        }`}
      >
        {children}
      </div>
      
      <div className="mt-4 border-b border-gray-200"></div>
    </div>
  );
}
