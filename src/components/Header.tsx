import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  return (
    <header className="bg-edinburgh-blue text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-antique-gold rounded-full flex items-center justify-center">
            <span className="text-edinburgh-blue font-bold text-xl">EA</span>
          </div>
          <span className="font-semibold text-xl">Edinburgh Antiques Trail</span>
        </Link>
        
        <nav className="hidden md:flex space-x-6">
          <Link href="/" className="hover:text-antique-gold transition-colors">
            Dashboard
          </Link>
          <Link href="/map" className="hover:text-antique-gold transition-colors">
            Map
          </Link>
          <Link href="/places" className="hover:text-antique-gold transition-colors">
            Places
          </Link>
          <Link href="/types" className="hover:text-antique-gold transition-colors">
            Categories
          </Link>
          <Link href="/admin" className="hover:text-antique-gold transition-colors font-bold border-b-2 border-antique-gold">
            ADMIN
          </Link>
        </nav>
        
        <div className="md:hidden">
          {/* Mobile menu button - would need JavaScript to toggle */}
          <button className="p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
