'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Dashboard', icon: '📊' },
    { href: '/supervisors', label: 'Supervisors', icon: '🤖' },
    { href: '/runs', label: 'Runs', icon: '🚀' },
  ];

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-700/50 flex flex-col h-full">
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2">
          <span className="text-indigo-500 text-2xl">🧠</span>
          Order Supervisor
        </h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {links.map((link) => {
          const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/50 border border-transparent'
              }`}
            >
              <span>{link.icon}</span>
              <span className="font-medium">{link.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 text-xs text-center text-gray-600">
        Order Supervisor &copy; 2026
      </div>
    </div>
  );
}
