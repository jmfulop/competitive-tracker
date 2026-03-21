'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Radio, Sun, Moon, Download, TrendingUp, GitCompare, CreditCard, Activity, LayoutDashboard } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

const NAV_ITEMS = [
  { href: '/tracker',     label: 'Dashboard',   icon: <LayoutDashboard size={15} /> },
  { href: '/signals',     label: 'AI Signals',  icon: <Radio size={15} />,      badge: true },
  { href: '/compare',     label: 'Compare',     icon: <GitCompare size={15} />  },
  { href: '/battlecards', label: 'Battlecards', icon: <CreditCard size={15} />  },
  { href: '/win-loss',    label: 'Win / Loss',  icon: <TrendingUp size={15} />  },
  { href: '/activity',    label: 'Activity',    icon: <Activity size={15} />    },
];

export default function Nav() {
  const pathname = usePathname();
  const supabase = createClient();

  const [dark, setDark]               = useState(true);
  const [signalBadge, setSignalBadge] = useState(0);

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
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const isActive = (href: string) =>
    href === '/tracker'
      ? pathname === '/tracker' || pathname === '/'
      : pathname.startsWith(href);

  const navBtn    = 'text-slate-400 hover:text-white hover:bg-slate-800';
  const navActive = 'bg-blue-600 text-white';

  return (
    <header className="border-b bg-slate-900/80 border-slate-800 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">

        <div className="flex items-center gap-8">
          <div>
            <h1 className="text-lg font-bold text-white">ERP Competitive Tracker</h1>
            <p className="text-xs text-slate-500">
              by Jean Fulop · {new Date().toLocaleDateString('en-AU')}
            </p>
          </div>

          <nav className="flex gap-1 flex-wrap">
            {NAV_ITEMS.map(item => {
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${active ? navActive : navBtn}`}>
                  {item.icon}
                  {item.label}
                  {item.badge && signalBadge > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full">
                      {signalBadge > 9 ? '9+' : signalBadge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex gap-2 items-center">
          <button onClick={() => setDark(d => !d)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${navBtn} transition-all`}>
            {dark ? <Sun size={15} /> : <Moon size={15} />}
            {dark ? 'Light' : 'Dark'}
          </button>
          <button className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${navBtn} transition-all`}>
            <Download size={15} /> Export
          </button>
        </div>

      </div>
    </header>
  );
}