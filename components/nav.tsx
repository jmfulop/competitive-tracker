'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Radio, GitCompare, CreditCard,
  TrendingUp, Activity, Sun, Moon, Download, HelpCircle,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

const PRIMARY_NAV = [
  { href: '/',            label: 'Dashboard',   icon: <LayoutDashboard size={15} /> },
  { href: '/signals',     label: 'Signals',     icon: <Radio size={15} />, badge: 'signals' },
  { href: '/compare',     label: 'Compare',     icon: <GitCompare size={15} /> },
  { href: '/battlecards', label: 'Battlecards', icon: <CreditCard size={15} /> },
  { href: '/win-loss',    label: 'Win / Loss',  icon: <TrendingUp size={15} /> },
];

const SECONDARY_NAV = [
  { href: '/activity', label: 'Activity', icon: <Activity size={14} /> },
  { href: '/help',     label: 'Help',     icon: <HelpCircle size={14} /> },
];

export default function Nav() {
  const pathname = usePathname();
  const supabase = createClient();

  const [dark, setDark]         = useState(true);
  const [signalBadge, setSignalBadge] = useState(0);
  const [userEmail, setUserEmail]     = useState<string | null>(null);

  // Live badge — count of high urgency "respond" signals in last 7 days
  useEffect(() => {
    const load = async () => {
      const { count } = await supabase
        .from('weak_signals')
        .select('*', { count: 'exact', head: true })
        .eq('urgency', 'high')
        .eq('recommended_action', 'respond')
        .gte('spotted_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      setSignalBadge(count ?? 0);
    };

    load();

    const channel = supabase
      .channel('nav_badge')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'weak_signals' }, load)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  // Sync dark mode with document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const badgeCounts: Record<string, number> = { signals: signalBadge };

  return (
    <nav className="sticky top-0 z-40 flex items-center justify-between
      bg-gray-950/95 backdrop-blur border-b border-gray-800 px-4 h-14">

      {/* Left — brand + primary nav */}
      <div className="flex items-center gap-5">
        <Link href="/" className="flex flex-col leading-tight shrink-0">
          <span className="text-sm font-bold text-white">ERP Competitive Tracker</span>
          <span className="text-xs text-gray-500">
            {userEmail ? userEmail.split('@')[0] : 'Jean Fulop'} · {new Date().toLocaleDateString('en-AU')}
          </span>
        </Link>

        <div className="flex items-center gap-0.5">
          {PRIMARY_NAV.map(item => {
            const active     = isActive(item.href);
            const badgeCount = item.badge ? (badgeCounts[item.badge] ?? 0) : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                  ${active
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                  }`}
              >
                {item.icon}
                {item.label}
                {badgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1
                    bg-red-500 text-white text-[10px] font-bold rounded-full
                    flex items-center justify-center">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Right — secondary nav + tools */}
      <div className="flex items-center gap-0.5">
        {SECONDARY_NAV.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors
              ${isActive(item.href)
                ? 'text-white bg-gray-800'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
              }`}
          >
            {item.icon}
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        ))}

        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
          text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors">
          <Download size={14} />
          <span className="hidden sm:inline">Export</span>
        </button>

        <button
          onClick={() => setDark(d => !d)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
            text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
        >
          {dark ? <Sun size={14} /> : <Moon size={14} />}
          <span className="hidden sm:inline">{dark ? 'Light' : 'Dark'}</span>
        </button>
      </div>
    </nav>
  );
}