import TypeForm from '@/components/TypeForm';
import { getPlaceTypes } from '@/lib/data-utils';

export default async function NewTypePage() {
  // Get existing types for reference
  const existingTypes = await getPlaceTypes();
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-edinburgh-blue mb-1">Add New Category</h1>
        <p className="text-lg text-gray-600">
          Create a new place type/category
        </p>
      </div>
      
      <div className="card">
        <TypeForm existingTypes={existingTypes} />
      </div>
    </div>
  );
}
