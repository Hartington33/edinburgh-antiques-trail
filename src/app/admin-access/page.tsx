'use client';

import Link from 'next/link';

export default function AdminAccess() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-6">Edinburgh Antiques Trail Admin Access</h1>
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Admin Pages</h2>
        <div className="flex flex-col space-y-4">
          <Link 
            href="/admin" 
            className="bg-edinburgh-blue text-white py-2 px-4 rounded hover:bg-blue-600 text-center"
          >
            Main Admin Dashboard
          </Link>
          <Link 
            href="/admin/opening-hours" 
            className="bg-edinburgh-blue text-white py-2 px-4 rounded hover:bg-blue-600 text-center"
          >
            Opening Hours Editor
          </Link>
        </div>
        <div className="mt-8 pt-4 border-t">
          <Link 
            href="/" 
            className="text-edinburgh-blue hover:underline"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
