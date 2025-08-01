import Link from 'next/link';

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-edinburgh-blue mb-2">Admin Dashboard</h1>
        <p className="text-lg text-gray-600">
          Manage your antique places and categories.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AdminCard
          title="Manage Places"
          description="Add, edit, or delete antique shops and establishments"
          link="/admin/places"
          icon="🏪"
        />
        <AdminCard
          title="Manage Opening Hours"
          description="Edit opening hours for all places"
          link="/admin/opening-hours"
          icon="🕒"
        />

        <AdminCard
          title="Manage Categories"
          description="Add, edit, or delete place categories"
          link="/admin/place-types"
          icon="📋"
        />
        <AdminCard
          title="CSV Import"
          description="Import data from CSV files"
          link="/admin/import"
          icon="📤"
        />
      </div>
    </div>
  );
}

function AdminCard({ 
  title, 
  description, 
  link, 
  icon 
}: { 
  title: string; 
  description: string; 
  link: string; 
  icon: string; 
}) {
  return (
    <Link href={link} className="card hover:shadow-lg transition-shadow flex flex-col">
      <div className="flex items-center space-x-4 mb-4">
        <span className="text-3xl">{icon}</span>
        <h3 className="text-xl font-semibold">{title}</h3>
      </div>
      <p className="text-gray-600">{description}</p>
    </Link>
  );
}
