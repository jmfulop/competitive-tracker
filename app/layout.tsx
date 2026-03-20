'use client';

import Nav from '@/components/nav';
import { usePathname } from 'next/navigation';
import './globals.css';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isTracker = pathname === '/tracker' || pathname === '/';

  return (
    <body className="bg-gray-950 text-white min-h-screen" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {!isTracker && <Nav />}
      <main className={!isTracker ? 'max-w-7xl mx-auto px-4 py-6' : ''}>
        {children}
      </main>
    </body>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <LayoutContent>{children}</LayoutContent>
    </html>
  );
}