'use client';

import { useState, useEffect } from 'react';

interface Specialty {
  id: number;
  name: string;
  description: string;
  parent_id: number | null;
  subcategories?: Specialty[];
}

interface HierarchicalSpecialtyFilterProps {
  onChange: (ids: number[]) => void;
  initialSelectedIds?: number[];
  placeId?: number;
  mode?: 'basic' | 'advanced';  // basic shows only main categories, advanced shows subcategories
}

export default function HierarchicalSpecialtyFilter({
  onChange,
  initialSelectedIds = [],
  placeId,
  mode = 'basic'
}: HierarchicalSpecialtyFilterProps) {
  // Main state
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>(initialSelectedIds);
  const [expandedCategories, setExpandedCategories] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Track click states for implementing multi-state behavior
  const [mainCategoryClickState, setMainCategoryClickState] = useState<Record<number, number>>({});

  // Sync with parent when initialSelectedIds changes
  useEffect(() => {
    console.log('HierarchicalSpecialtyFilter: initialSelectedIds changed:', initialSelectedIds);
    setSelectedIds(initialSelectedIds);
    
    // Auto-expand categories that have selected subcategories
    if (initialSelectedIds.length > 0 && specialties.length > 0) {
      const parentIdsToExpand = new Set<number>();
      
      initialSelectedIds.forEach(id => {
        specialties.forEach(specialty => {
          if (specialty.subcategories?.some(sub => sub.id === id)) {
            parentIdsToExpand.add(specialty.id);
          }
        });
      });
      
      if (parentIdsToExpand.size > 0) {
        setExpandedCategories(prev => {
          const expanded = [...prev];
          parentIdsToExpand.forEach(id => {
            if (!expanded.includes(id)) {
              expanded.push(id);
            }
          });
          return expanded;
        });
      }
    }
  }, [initialSelectedIds, specialties]);
  
  // Fetch specialties - try hierarchical first, then fall back to flat if needed
  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        setLoading(true);
        
        let url = '/api/specialties?hierarchical=true';
        if (placeId) {
          url += `&place_id=${placeId}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch specialties');
        }
        
        const data = await response.json();
        
        // Check if we got a proper hierarchical structure
        const hasHierarchy = data.length > 0 && data.some(item => 
          item.subcategories && item.subcategories.length > 0
        );
        
        if (hasHierarchy) {
          // We have proper hierarchical data
          setSpecialties(data);
        } else {
          // Fallback: Group specialties by first letter for better UX
          const groupedSpecialties = groupSpecialtiesByFirstLetter(data);
          setSpecialties(groupedSpecialties);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching specialties:', error);
        setError('Failed to load specialties. Please try again.');
        setLoading(false);
      }
    };
    
    fetchSpecialties();
  }, [placeId]);
  
  // Helper function to group specialties by first letter when no hierarchy exists
  const groupSpecialtiesByFirstLetter = (flatSpecialties: Specialty[]): Specialty[] => {
    // Sort specialties alphabetically
    const sorted = [...flatSpecialties].sort((a, b) => a.name.localeCompare(b.name));
    
    // Get unique first letters
    const letters = Array.from(new Set(
      sorted.map(s => s.name.charAt(0).toUpperCase())
    )).sort();
    
    // Create "fake" parent categories for each letter
    return letters.map(letter => {
      const letterSpecialties = sorted.filter(s => 
        s.name.charAt(0).toUpperCase() === letter
      );
      
      return {
        id: -1 * letter.charCodeAt(0), // Use negative ASCII code as ID to avoid conflicts
        name: `${letter}`,
        description: `Items starting with ${letter}`,
        parent_id: null,
        subcategories: letterSpecialties
      };
    });
  };
  
  // *** Essential utility functions ***

  // Find all subcategory IDs for a main category
  const getAllSubcategoryIds = (specialty: Specialty): number[] => {
    const ids: number[] = [];
    
    if (specialty.subcategories) {
      specialty.subcategories.forEach(sub => {
        ids.push(sub.id);
        // Recursively add any nested subcategories if they exist
        if (sub.subcategories && sub.subcategories.length > 0) {
          ids.push(...getAllSubcategoryIds(sub));
        }
      });
    }
    
    return ids;
  };

  // Find parent category ID for a subcategory
  const findParentIdForSubcategory = (specialtyId: number): number | null => {
    for (const specialty of specialties) {
      if (specialty.subcategories?.some(sub => sub.id === specialtyId)) {
        return specialty.id;
      }
    }
    return null;
  };

  // Toggle expand/collapse a category
  const toggleExpand = (categoryId: number) => {
    setExpandedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  // Clear all subcategories of a main category but keep the main category selected
  const clearSubcategories = (specialty: Specialty) => {
    if (!specialty.subcategories) return;
    
    const subIds = getAllSubcategoryIds(specialty);
    
    setSelectedIds(prev => {
      // Remove all subcategory IDs but keep main category ID
      const newIds = prev.filter(id => !subIds.includes(id));
      // Ensure main category is selected
      if (!newIds.includes(specialty.id)) {
        newIds.push(specialty.id);
      }

      // Notify parent component
      onChange(newIds);
      
      return newIds;
    });
  };
  
  // Select all subcategories of a main category
  const selectAllSubcategories = (specialty: Specialty) => {
    if (!specialty.subcategories) return;
    
    const subIds = getAllSubcategoryIds(specialty);
    
    setSelectedIds(prev => {
      // Start with all current IDs except any that might be in the subcategory list
      const newIds = [...prev.filter(id => !subIds.includes(id))];
      
      // Ensure main category is selected
      if (!newIds.includes(specialty.id)) {
        newIds.push(specialty.id);
      }
      
      // Add all subcategories
      subIds.forEach(id => {
        if (!newIds.includes(id)) {
          newIds.push(id);
        }
      });
      
      // Notify parent component
      onChange(newIds);
      
      return newIds;
    });
  };
  
  // Handle main category checkbox click - implements multi-state behavior
  const handleMainCategoryClick = (specialty: Specialty) => {
    const categoryId = specialty.id;
    const currentClickState = mainCategoryClickState[categoryId] || 0;
    const nextClickState = (currentClickState + 1) % 3; // Cycle through states 0, 1, 2
    
    // Update click state for this category
    setMainCategoryClickState(prev => ({
      ...prev,
      [categoryId]: nextClickState
    }));
    
    switch (nextClickState) {
      case 1: // First click: select all subcategories but keep them hidden
        selectAllSubcategories(specialty);
        // Collapse subcategories
        setExpandedCategories(prev => prev.filter(id => id !== categoryId));
        break;
        
      case 2: // Second click: keep main category selected, show subcategories but uncheck them
        clearSubcategories(specialty);
        // Expand to show subcategories
        if (!expandedCategories.includes(categoryId)) {
          setExpandedCategories(prev => [...prev, categoryId]);
        }
        break;
        
      case 0: // Third click: unselect main category and all subcategories, hide subcategories
        // Remove main category and all its subcategories from selected
        const subIds = getAllSubcategoryIds(specialty);
        const newIds = selectedIds.filter(id => !subIds.includes(id) && id !== categoryId);
        setSelectedIds(newIds);
        onChange(newIds); // Notify parent
        
        // Collapse subcategories
        setExpandedCategories(prev => prev.filter(id => id !== categoryId));
        break;
    }
  };
  
  // Toggle individual subcategory selection
  const toggleSubcategory = (subId: number, parentId: number) => {
    setSelectedIds(prev => {
      let newIds: number[];
      
      if (prev.includes(subId)) {
        // Remove this subcategory
        newIds = prev.filter(id => id !== subId);
      } else {
        // Add this subcategory
        newIds = [...prev, subId];
      }
      
      // Always ensure parent category is selected when any subcategory is selected
      if (!newIds.includes(parentId) && newIds.some(id => {
        const specialty = specialties.find(s => s.id === parentId);
        return specialty?.subcategories?.some(sub => sub.id === id);
      })) {
        newIds.push(parentId);
      }
      
      // Notify parent immediately
      onChange(newIds);
      
      return newIds;
    });
  };
  
  // Toggle all subcategories in a group
  const toggleAllSubcategories = (specialty: Specialty) => {
    if (!specialty.subcategories) return;
    
    // Check if any subcategories are currently selected
    const anySelected = specialty.subcategories.some(sub => selectedIds.includes(sub.id));
    
    if (anySelected) {
      // If any are selected, clear all subcategories
      clearSubcategories(specialty);
    } else {
      // If none are selected, select all subcategories
      selectAllSubcategories(specialty);
    }
  };
  
  // Clear all filters
  const clearAllFilters = () => {
    setSelectedIds([]);
    onChange([]);
  };

  // Render the loading state
  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  // Render empty state
  if (specialties.length === 0) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <p className="text-gray-500">No specialties available</p>
      </div>
    );
  }

  // Main render
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <div className="space-y-3">
        {specialties.map(specialty => (
          <div key={specialty.id} className="pb-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id={`specialty-${specialty.id}`}
                checked={selectedIds.includes(specialty.id)}
                onChange={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleMainCategoryClick(specialty);
                }}
                className="mr-2 h-4 w-4 rounded border-gray-300 focus:ring-indigo-500"
                onClick={(e) => e.stopPropagation()}
              />
              <label 
                htmlFor={`specialty-${specialty.id}`}
                className="text-sm font-medium text-gray-700 flex-grow cursor-pointer"
              >
                {specialty.name}
              </label>
              
              {mode === 'advanced' && specialty.subcategories && specialty.subcategories.length > 0 && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleExpand(specialty.id);
                  }}
                  className="ml-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  type="button"
                >
                  {expandedCategories.includes(specialty.id) ? (
                    <span className="h-4 w-4 inline-flex items-center justify-center">▼</span>
                  ) : (
                    <span className="h-4 w-4 inline-flex items-center justify-center">▶</span>
                  )}
                </button>
              )}
            </div>
            
            {/* Show subcategories when expanded */}
            {mode === 'advanced' && 
             expandedCategories.includes(specialty.id) && 
             specialty.subcategories && 
             specialty.subcategories.length > 0 && (
              <div className="ml-6 mt-1 space-y-1">
                {/* Subcategory Toggle Button */}
                <div className="flex justify-between items-center mb-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleAllSubcategories(specialty);
                    }}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 focus:outline-none"
                  >
                    {specialty.subcategories.some(sub => selectedIds.includes(sub.id))
                      ? 'Clear All'
                      : 'Select All'
                    }
                  </button>
                  <span className="text-xs text-gray-500">
                    {specialty.subcategories.filter(sub => selectedIds.includes(sub.id)).length} of {specialty.subcategories.length} selected
                  </span>
                </div>
                
                {/* Subcategory Checkboxes */}
                {specialty.subcategories.map(sub => (
                  <div key={sub.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`specialty-${sub.id}`}
                      checked={selectedIds.includes(sub.id)}
                      onChange={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleSubcategory(sub.id, specialty.id);
                      }}
                      className="mr-2 h-4 w-4 rounded border-gray-300 focus:ring-indigo-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <label 
                      htmlFor={`specialty-${sub.id}`}
                      className="text-sm text-gray-600 cursor-pointer"
                    >
                      {sub.name}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {mode === 'advanced' && (
        <div className="mt-4 text-sm text-gray-500">
          <p>Tip: Click on the arrows to expand/collapse subcategories</p>
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="mt-4">
          <button
            onClick={clearAllFilters}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            Clear all filters
          </button>
          <span className="ml-2 text-sm text-gray-500">
            ({selectedIds.length} {selectedIds.length === 1 ? 'specialty' : 'specialties'} selected)
          </span>
        </div>
      )}
    </div>
  );
}
