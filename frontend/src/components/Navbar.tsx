'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  
  const links = [
    { name: 'Dashboard', path: '/' },
    { name: 'Supervisors', path: '/supervisors' },
    { name: 'Runs', path: '/runs' },
  ];

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="font-bold text-lg text-gray-900">Order Supervisor</span>
            </div>
            <div className="ml-6 flex space-x-8">
              {links.map((link) => {
                const isActive = pathname === link.path || (link.path !== '/' && pathname.startsWith(link.path));
                return (
                  <Link
                    key={link.path}
                    href={link.path}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm ${
                      isActive
                        ? 'border-blue-500 text-blue-600 font-medium'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
