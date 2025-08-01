import { getPlaces } from '@/lib/data-utils';
import OpeningHoursEditor from './OpeningHoursEditor';

export default async function OpeningHoursPage() {
  // Fetch all places on the server
  const places = await getPlaces();
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-edinburgh-blue mb-6">
        Opening Hours Editor
      </h1>
      <p className="mb-6 text-gray-700">
        Use this tool to update opening hours for all places. The data is validated to prevent leading zeros and formatting issues.
      </p>
      
      <OpeningHoursEditor initialPlaces={places} />
    </div>
  );
}
