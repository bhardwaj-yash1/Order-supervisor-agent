import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Order Supervisor',
  description: 'Manage and monitor autonomous order supervisors',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-gray-100 h-screen flex overflow-hidden`}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gray-950">
          <div className="p-8 max-w-7xl mx-auto min-h-full">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
