import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface SpecialtyData {
  id: number;
  name: string;
  parent_id: number | null;
}

interface FormattedSpecialties {
  mainCategories: SpecialtyData[];
  subcategories: SpecialtyData[];
}

interface FormattedSpecialtiesProps {
  placeId: number;
  fallbackText?: string; // Original specialties string as fallback
}

export default function FormattedSpecialties({ placeId, fallbackText }: FormattedSpecialtiesProps) {
  // All state hooks must be declared at the top level
  const [specialtyData, setSpecialtyData] = useState<FormattedSpecialties | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parentCategories, setParentCategories] = useState<Record<number, string>>({});
  
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Helper function to create filter URL for a specialty
  const createSpecialtyFilterUrl = (specialtyId: number) => {
    const params = new URLSearchParams();
    params.set('specialties', specialtyId.toString());
    return `/places?${params.toString()}`;
  };
  
  // Fetch specialty data
  useEffect(() => {
    async function fetchSpecialtyData() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/place-specialties?place_id=${placeId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch specialty data');
        }
        const data = await response.json();
        console.log('Specialty data fetched:', data);
        setSpecialtyData(data);
      } catch (err) {
        console.error('Error fetching specialties:', err);
        setError('Could not load specialties');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchSpecialtyData();
  }, [placeId]);
  
  // Fetch parent category names for any subcategories that don't have their parent in mainCategories
  useEffect(() => {
    async function fetchParentCategories() {
      if (!specialtyData) return;
      
      // Find subcategories that don't have their parent in mainCategories
      const orphanedSubcats = specialtyData.subcategories.filter(subcat => 
        subcat.parent_id && !specialtyData.mainCategories.some(main => main.id === subcat.parent_id)
      );
      
      // If there are no orphaned subcategories, we don't need to fetch parent info
      if (orphanedSubcats.length === 0) return;
      
      // Get unique parent IDs we need to fetch (avoiding Set spread operator for TypeScript compatibility)
      const parentIdsSet = new Set<number>();
      orphanedSubcats.forEach(sub => {
        if (sub.parent_id) parentIdsSet.add(sub.parent_id);
      });
      const parentIdsToFetch = Array.from(parentIdsSet);
      
      try {
        const response = await fetch(`/api/specialties?ids=${parentIdsToFetch.join(',')}`);
        if (!response.ok) throw new Error('Failed to fetch parent categories');
        
        const parentData = await response.json();
        
        // Create a map of parent ID to parent name
        const parentMap: Record<number, string> = {};
        parentData.forEach((parent: SpecialtyData) => {
          parentMap[parent.id] = parent.name;
        });
        
        setParentCategories(parentMap);
      } catch (error) {
        console.error('Failed to fetch parent category info:', error);
      }
    }
    
    fetchParentCategories();
  }, [specialtyData]);
  
  // Show fallback text if there's an error or we're still loading
  if (error || isLoading) {
    return (
      <p className="text-sm mt-2 italic">
        <span className="font-medium">Specialties:</span> {fallbackText || ''}
      </p>
    );
  }
  
  // If no specialty data or no specialties found
  if (!specialtyData || 
      (specialtyData.mainCategories.length === 0 && specialtyData.subcategories.length === 0)) {
    if (fallbackText) {
      return (
        <p className="text-sm mt-2 italic">
          <span className="font-medium">Specialties:</span> {fallbackText}
        </p>
      );
    }
    return null; // No specialties to display and no fallback
  }
  
  // Group subcategories by their parent category if possible
  const getSubcategoriesByParent = () => {
    if (!specialtyData) return {};
    
    const subcategoriesByParent: Record<number, SpecialtyData[]> = {};
    
    // Find parent for each subcategory
    specialtyData.subcategories.forEach(subcat => {
      if (subcat.parent_id) {
        if (!subcategoriesByParent[subcat.parent_id]) {
          subcategoriesByParent[subcat.parent_id] = [];
        }
        subcategoriesByParent[subcat.parent_id].push(subcat);
      }
    });
    
    // Sort subcategories alphabetically within each parent group
    Object.keys(subcategoriesByParent).forEach(parentId => {
      subcategoriesByParent[Number(parentId)].sort((a, b) => 
        a.name.localeCompare(b.name));
    });
    
    return subcategoriesByParent;
  };
  
  const subcategoriesByParent = getSubcategoriesByParent();
  
  // Format the specialties for display
  return (
    <div className="text-sm mt-2 italic">
      
      {/* Each main category with its subcategories on the same line (natural wrapping) */}
      {[...specialtyData.mainCategories]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((mainCat) => {
        // Find subcategories for this main category
        const relatedSubcategories = subcategoriesByParent[mainCat.id] || [];
        
        return (
          <div key={mainCat.id}>
            <a 
              href={createSpecialtyFilterUrl(mainCat.id)}
              className="font-bold hover:underline text-blue-600"
              onClick={(e) => {
                e.stopPropagation(); // Prevent propagation to parent Link
              }}
            >
              {mainCat.name}
            </a>
            
            {relatedSubcategories.length > 0 && (
              <> : {
                relatedSubcategories.map((subcat, idx) => (
                  <span key={subcat.id}>
                    <a 
                      href={createSpecialtyFilterUrl(subcat.id)}
                      className="hover:underline text-blue-600"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent propagation to parent Link
                      }}
                    >
                      {subcat.name}
                    </a>
                    {idx < relatedSubcategories.length - 1 && ', '}
                  </span>
                ))}
              </>
            )}
          </div>
        );
      })}
      
      {/* Group orphaned subcategories by their actual parent categories */}
      {specialtyData.subcategories.some(sub => 
        !specialtyData.mainCategories.some(main => main.id === sub.parent_id)) && (
        <>
          {/* Group orphaned subcategories by parent category */}
          {Object.entries(parentCategories).map(([parentIdStr, parentName]) => {
            const parentId = Number(parentIdStr);
            // Find subcategories with this parent ID
            const subcats = specialtyData.subcategories.filter(
              sub => sub.parent_id === parentId && 
              !specialtyData.mainCategories.some(main => main.id === parentId)
            );
            
            if (subcats.length === 0) return null;
            
            return (
              <div key={parentId} className="mt-1">
                <a 
                  href={createSpecialtyFilterUrl(parentId)}
                  className="font-bold hover:underline text-blue-600"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent propagation to parent Link
                  }}
                >
                  {parentName}
                </a>
                
                <>: {
                  subcats
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((subcat, idx) => (
                      <span key={subcat.id}>
                        <a 
                          href={createSpecialtyFilterUrl(subcat.id)}
                          className="hover:underline text-blue-600"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent propagation to parent Link
                          }}
                        >
                          {subcat.name}
                        </a>
                        {idx < subcats.length - 1 && ', '}
                      </span>
                    ))
                }</>
              </div>
            );
          })}
          
          {/* Fallback to 'Other' for any subcategories without resolved parent */}
          {specialtyData.subcategories
            .filter(sub => 
              sub.parent_id && 
              !specialtyData.mainCategories.some(main => main.id === sub.parent_id) &&
              !parentCategories[sub.parent_id]
            ).length > 0 && (
            <div className="mt-1">
              <span className="font-medium">Other: </span>
              {specialtyData.subcategories
                .filter(sub => 
                  sub.parent_id && 
                  !specialtyData.mainCategories.some(main => main.id === sub.parent_id) &&
                  !parentCategories[sub.parent_id]
                )
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((subcat, idx, filteredList) => (
                  <span key={subcat.id}>
                    <a 
                      href={createSpecialtyFilterUrl(subcat.id)}
                      className="hover:underline text-blue-600"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent propagation to parent Link
                      }}
                    >
                      {subcat.name}
                    </a>
                    {idx < filteredList.length - 1 && ', '}
                  </span>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
