import { notFound } from 'next/navigation';
import TypeForm from '@/components/TypeForm';
import { getPlaceTypeById, getPlaceTypes } from '@/lib/data-utils';

export default async function EditTypePage({ params }: { params: { id: string } }) {
  const typeId = parseInt(params.id);
  
  if (isNaN(typeId)) {
    notFound();
  }
  
  // Fetch the type to edit and all existing types
  const [type, existingTypes] = await Promise.all([
    getPlaceTypeById(typeId),
    getPlaceTypes()
  ]);
  
  if (!type) {
    notFound();
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-edinburgh-blue mb-1">Edit Category</h1>
        <p className="text-lg text-gray-600">
          Update category details
        </p>
      </div>
      
      <div className="card">
        <TypeForm 
          existingTypes={existingTypes} 
          initialData={{
            id: type.id,
            name: type.name
          }} 
        />
      </div>
    </div>
  );
}
