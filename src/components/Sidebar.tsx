import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  return (
    <aside className="w-full md:w-64 bg-gray-100 md:min-h-screen p-6">
      <h2 className="text-xl font-semibold mb-6 text-edinburgh-blue">Categories</h2>
      <nav className="flex flex-col space-y-3">
        <SidebarLink href="/places?type=1" label="Antique Shops" />
        <SidebarLink href="/places?type=2" label="Auction Houses" />
        <SidebarLink href="/places?type=3" label="Book Shops" />
        <SidebarLink href="/places?type=4" label="Record Shops" />
        <SidebarLink href="/places?type=5" label="Vintage Clothing" />
        <SidebarLink href="/places?type=6" label="Antique Fairs" />
      </nav>
      
      <div className="my-6 border-t border-gray-300"></div>
      
      <h2 className="text-xl font-semibold mb-6 text-edinburgh-blue">Admin</h2>
      <nav className="flex flex-col space-y-3">
        <SidebarLink href="/places/new" label="Add New Place" />
        <SidebarLink href="/types/new" label="Add Place Type" />
      </nav>
    </aside>
  );
}

function SidebarLink({ href, label }: { href: string; label: string }) {
  // In a client component, we would use:
  // const pathname = usePathname();
  // const isActive = pathname === href;
  // 
  // But for server component rendering, we'll just render without active states
  return (
    <Link 
      href={href} 
      className="p-2 rounded hover:bg-edinburgh-stone hover:text-edinburgh-blue transition-colors"
    >
      {label}
    </Link>
  );
}
