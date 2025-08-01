'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

interface Specialty {
  id: number;
  name: string;
  description: string;
  parent_id: number | null;
  subcategories?: Specialty[];
  place_count?: number; // Count of places with this specialty
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
    
    // Set selected IDs to match the initial IDs from parent
    setSelectedIds(initialSelectedIds);
    
    // Reset click state tracking when selections change externally or are cleared
    if (initialSelectedIds.length === 0) {
      setMainCategoryClickState({});
      setExpandedCategories([]);
    }
    
    // Auto-expand categories that have selected subcategories
    if (initialSelectedIds.length > 0 && specialties.length > 0) {
      const parentIdsToExpand = new Set<number>();
      
      // Figure out which main categories have selected subcategories
      initialSelectedIds.forEach(id => {
        specialties.forEach(specialty => {
          if (specialty.subcategories?.some(sub => sub.id === id)) {
            parentIdsToExpand.add(specialty.id);
            
            // If we have selected subcategories, set click state to 2 (second click state)
            // This ensures we show the subcategories list
            setMainCategoryClickState(prev => ({
              ...prev,
              [specialty.id]: 2
            }));
          }
        });
      });
      
      // For main categories that are selected but don't have subcategories selected
      // set them to click state 1 (first click - all subcategories selected but hidden)
      initialSelectedIds.forEach(id => {
        const mainCategory = specialties.find(s => s.id === id && !s.parent_id);
        if (mainCategory && !parentIdsToExpand.has(id)) {
          setMainCategoryClickState(prev => ({
            ...prev,
            [id]: 1
          }));
        }
      });
      
      // Expand categories as needed
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
        
        let data = await response.json();
        
        // Fetch specialty counts
        const countsResponse = await fetch('/api/specialty-counts');
        if (countsResponse.ok) {
          const counts = await countsResponse.json();
          const countMap = new Map();
          counts.forEach((item: { id: number, place_count: number }) => {
            countMap.set(item.id, item.place_count);
          });
          
          // Add place_count to each specialty
          const addCountsToSpecialties = (specialties: Specialty[]): Specialty[] => {
            return specialties.map(specialty => ({
              ...specialty,
              place_count: countMap.get(specialty.id) || 0,
              subcategories: specialty.subcategories 
                ? addCountsToSpecialties(specialty.subcategories)
                : undefined
            }));
          };
          
          data = addCountsToSpecialties(data);
        }
        
        // Check if we got a proper hierarchical structure
        const hasHierarchy = data.length > 0 && data.some(item => 
          item.subcategories && item.subcategories.length > 0
        );
        
        if (hasHierarchy) {
          // We have proper hierarchical data
          setSpecialties(data);
        } else {
          // Fallback: Group specialties by first letter for better UX
          const grouped = groupSpecialtiesByFirstLetter(data);
          setSpecialties(grouped);
        }
      } catch (error) {
        console.error('Error fetching specialties:', error);
        setError('Failed to fetch specialties');
      } finally {
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
        // When expanding, find the category
        try {
          if (specialties && specialties.length > 0) {
            const category = specialties.find(s => s.id === categoryId);
            if (category && category.subcategories && category.subcategories.length > 0) {
              // Auto-select subcategories that have associated places
              const subcategoriesWithPlaces = category.subcategories
                .filter(sub => (sub.place_count || 0) > 0)
                .map(sub => sub.id);
              
              // Only add IDs that aren't already selected
              const newIds = subcategoriesWithPlaces.filter(id => !selectedIds.includes(id));
              
              if (newIds.length > 0) {
                setSelectedIds(prev => [...prev, ...newIds]);
                // Use callback form to ensure we have the latest state
                onChange([...selectedIds, ...newIds]);
              }
            }
          }
        } catch (error) {
          console.error('Error in toggleExpand:', error);
          // Continue without auto-selecting
        }
        
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
    const hasNoSubcategories = !specialty.subcategories || specialty.subcategories.length === 0;
    
    // For categories without subcategories, just toggle on/off (2-state)
    if (hasNoSubcategories) {
      // Simple toggle for categories with no subcategories
      const isCurrentlySelected = selectedIds.includes(categoryId);
      
      console.log(`Simple toggle for category without subcategories: ${specialty.name} (${categoryId}) - currently ${isCurrentlySelected ? 'selected' : 'unselected'}`);
      
      if (isCurrentlySelected) {
        // Remove from selection
        const newIds = selectedIds.filter(id => id !== categoryId);
        setSelectedIds(newIds);
        onChange(newIds); // Notify parent
        
        // Reset click state
        setMainCategoryClickState(prev => {
          const newState = {...prev};
          delete newState[categoryId];
          return newState;
        });
      } else {
        // Add to selection
        const newIds = [...selectedIds, categoryId];
        setSelectedIds(newIds);
        onChange(newIds); // Notify parent
        
        // Set click state to 1 for consistency
        setMainCategoryClickState(prev => ({
          ...prev,
          [categoryId]: 1
        }));
      }
      return;
    }
    
    // Normal 3-state handling for categories with subcategories
    const currentClickState = mainCategoryClickState[categoryId] || 0;
    const nextClickState = (currentClickState + 1) % 4; // Cycle through states 0, 1, 2, 3
    
    console.log(`Main category ${specialty.name} (${categoryId}) click: State ${currentClickState} -> ${nextClickState}`);
    
    // Update click state for this category
    setMainCategoryClickState(prev => ({
      ...prev,
      [categoryId]: nextClickState
    }));
    
    // Different behavior based on the click state
    switch (nextClickState) {
      case 0: // Reset state - deselect everything
        // Remove this category and all its subcategories
        clearSubcategories(specialty);
        
        // Also remove the main category itself
        setSelectedIds(prev => {
          const newIds = prev.filter(id => id !== categoryId);
          // Notify parent
          onChange(newIds);
          return newIds;
        });
        
        // No need to keep expanded when nothing is selected
        setExpandedCategories(prev => 
          prev.filter(id => id !== categoryId)
        );
        break;
        
      case 1: // First click: select main category only and show unchecked subcategories
        // Just select the main category, but NOT its subcategories
        setSelectedIds(prev => {
          const newIds = [...prev];
          if (!newIds.includes(categoryId)) {
            newIds.push(categoryId);
          }
          // Notify parent
          onChange(newIds);
          return newIds;
        });
        
        // Always expand to show subcategories in this state
        if (!expandedCategories.includes(categoryId)) {
          setExpandedCategories(prev => [...prev, categoryId]);
        }
        break;
        
      case 2: // Second click: keep main category selected, select all subcategories
        selectAllSubcategories(specialty);
        
        // Keep expanded so user can see all selected subcategories
        if (!expandedCategories.includes(categoryId)) {
          setExpandedCategories(prev => [...prev, categoryId]);
        }
        break;
        
      case 3: // Third click: collapse but keep selections
        // Just collapse, don't change selection state
        setExpandedCategories(prev => 
          prev.filter(id => id !== categoryId)
        );
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
    const allSelected = specialty.subcategories.every(sub => selectedIds.includes(sub.id));
    
    console.log('Toggling subcategories:', {
      specialtyId: specialty.id,
      anySelected,
      allSelected,
      currentSelectedCount: specialty.subcategories.filter(sub => selectedIds.includes(sub.id)).length,
      totalSubcategories: specialty.subcategories.length
    });
    
    // Ensure this category stays expanded regardless of selection changes
    if (!expandedCategories.includes(specialty.id)) {
      setExpandedCategories(prev => [...prev, specialty.id]);
    }
    
    if (anySelected) {
      // If any are selected, clear all subcategories but keep main category
      const newIds = selectedIds.filter(id => {
        // Keep all IDs that are not subcategories of this specialty
        const isSubcategory = specialty.subcategories?.some(sub => sub.id === id);
        return !isSubcategory;
      });
      
      // Make sure the main category stays selected
      if (!newIds.includes(specialty.id)) {
        newIds.push(specialty.id);
      }
      
      // Update state
      setSelectedIds(newIds);
      onChange(newIds);
    } else {
      // If none are selected, select all subcategories
      selectAllSubcategories(specialty);
    }
    
    // Update the click state to maintain consistency
    setMainCategoryClickState(prev => ({
      ...prev,
      [specialty.id]: anySelected ? 1 : 2 // Toggle between states 1 and 2
    }));
  };
  
  // Keep track of the last time filters were cleared to prevent feedback loops
  const lastClearTimestampRef = useRef<number>(0);
  const CLEAR_COOLDOWN_MS = 1000; // 1 second cooldown between clear operations

  // Clear all filters with safeguards against rapid re-clearing
  const clearAllFilters = useCallback(() => {
    // Prevent rapid re-clearing
    const now = Date.now();
    if (now - lastClearTimestampRef.current < CLEAR_COOLDOWN_MS) {
      console.log('Clear filters called too soon in HierarchicalSpecialtyFilter, ignoring');
      return;
    }
    
    // Update timestamp
    lastClearTimestampRef.current = now;
    
    // Clear local state first
    setSelectedIds([]);
    setMainCategoryClickState({});
    setExpandedCategories([]);
    
    // Then notify parent - do this with slight delay to avoid state update collisions
    setTimeout(() => {
      onChange([]);
    }, 50);
  }, [onChange]);

  // Add debouncing to prevent rapid filter changes
  const debouncedSelectedIds = useMemo(() => {
    console.log('Selected IDs updated:', selectedIds);
    return selectedIds;
  }, [selectedIds]);

  // Pass the stable reference to the onChange handler
  useEffect(() => {
    if (onChange) {
      onChange(debouncedSelectedIds);
    }
  }, [debouncedSelectedIds, onChange]);
  
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
    <div className="p-4 bg-white rounded-lg shadow specialty-filter">
      <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
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
            
            {/* Show subcategories when expanded (they're unchecked on first click, checked on second click) */}
            {mode === 'advanced' && 
             expandedCategories.includes(specialty.id) && 
             (mainCategoryClickState[specialty.id] === 1 || mainCategoryClickState[specialty.id] === 2) && 
             specialty.subcategories && 
             specialty.subcategories.length > 0 && (
              <div className="ml-6 mt-1 space-y-1">
                {/* Subcategory Toggle Button */}
                <div className="flex justify-between items-center mb-2">
                  {/* Toggle button label */}
                  <button
                    type="button"
                    onClick={(e) => toggleAllSubcategories(specialty)}
                    className="hover:bg-gray-50 text-xs text-gray-600 py-1 px-2 rounded"
                  >
                    {specialty.subcategories?.some(sub => selectedIds.includes(sub.id)) ? 'Clear All' : 'Select All'}
                    <span className="ml-1 text-xs">
                      ({specialty.subcategories?.filter(sub => selectedIds.includes(sub.id)).length || 0}/{specialty.subcategories?.length || 0})
                    </span>
                  </button>
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
                      {sub.name} {typeof sub.place_count !== 'undefined' && sub.place_count > 0 && (
                        <span className="text-gray-500">({sub.place_count})</span>
                      )}
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
