import type { Metadata } from 'next';
import Nav from '@/components/nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'ERP Competitive Tracker',
  description: 'AI-powered competitive intelligence for ANZ mid-market ERP — MYOB Acumatica',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-white min-h-screen" style={{ fontFamily: 'system-ui, sans-serif' }}>
        <Nav />
        <main className="max-w-7xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}