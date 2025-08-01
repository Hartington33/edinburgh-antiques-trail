import { getDashboardStats, getPlaces } from '@/lib/data-utils';
import Link from 'next/link';
import DashboardMap from '@/components/DashboardMap';
import { initializeDatabase } from '@/lib/schema';

export default async function Dashboard() {
  // Initialize database if it doesn't exist yet
  try {
    await initializeDatabase();
  } catch (error) {
    console.error('Failed to initialize database', error);
  }
  
  const stats = await getDashboardStats();
  const places = await getPlaces();
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-edinburgh-blue mb-2">Edinburgh Antiques Trail</h1>
        <p className="text-lg text-gray-600">
          Discover Edinburgh&apos;s rich heritage of antiques, vintage items, and collectibles.
        </p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard title="Total Places" value={stats.totalPlaces} link="/places" />
        <StatsCard title="Categories" value={stats.totalPlaceTypes} link="/types" />
        <StatsCard 
          title="Explore Map" 
          value="All Locations" 
          link="/map" 
          color="bg-antique-gold text-white"
        />
      </div>
      
      {/* Main Content Area */}
      <div className="grid grid-cols-1 gap-8">
        {/* Featured Locations Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Featured Locations</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {places.slice(0, 8).map(place => (
              <Link 
                key={place.id}
                href={`/places/${place.id}`}
                className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                <h3 className="font-semibold text-edinburgh-blue">{place.name}</h3>
                <p className="text-sm text-gray-600">{place.type_name}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm">{place.address.split(',')[0]}</span>
                  {place.price_range && (
                    <span className="bg-edinburgh-stone px-2 py-1 rounded text-sm">
                      {place.price_range}
                    </span>
                  )}
                </div>
              </Link>
            ))}
            <Link 
              href="/places" 
              className="bg-edinburgh-stone/30 p-4 rounded-lg flex items-center justify-center hover:bg-edinburgh-stone/50 transition-colors"
            >
              <span className="font-medium">View All {places.length} Locations →</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ 
  title, 
  value, 
  link, 
  color = "bg-white" 
}: { 
  title: string; 
  value: string | number; 
  link: string; 
  color?: string; 
}) {
  return (
    <Link href={link} className={`card ${color} hover:shadow-lg transition-shadow`}>
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </Link>
  );
}
