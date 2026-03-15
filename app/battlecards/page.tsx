'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Clock, ChevronRight, Zap, History, X } from 'lucide-react';

interface Battlecard {
  id: string;
  vendor_b: string;
  vendors: string[];
  version: number;
  headline: string;
  content: {
    our_strengths: string[];
    their_strengths: string[];
    their_weaknesses: string[];
    landmines: string[];
    our_traps: string[];
    deal_tips: string[];
  };
  created_at: string;
}

const BORDER_COLORS: Record<string, string> = {
  'Oracle NetSuite':                    'border-l-blue-500',
  'SAP Business One':                   'border-l-orange-500',
  'SAP S/4HANA Cloud':                  'border-l-orange-400',
  'Microsoft Dynamics 365 Business Central': 'border-l-cyan-500',
  'Microsoft Dynamics 365 Finance':     'border-l-cyan-400',
  'Workday':                            'border-l-yellow-500',
  'Oracle Fusion Cloud ERP':            'border-l-red-500',
  'WIISE':                              'border-l-green-500',
};

const COLOR_MAP: Record<string, string> = {
  green: 'text-green-400', red: 'text-red-400', blue: 'text-blue-400',
  orange: 'text-orange-400', purple: 'text-purple-400', yellow: 'text-yellow-400',
};

function BattlecardSection({ title, items, color, icon }: { title: string; items: string[]; color: string; icon: string }) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <h3 className={`text-sm font-semibold mb-3 ${COLOR_MAP[color] ?? 'text-gray-300'}`}>{title}</h3>
      <ul className="space-y-2">
        {items?.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-gray-300"><span className="shrink-0">{icon}</span>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function BattlecardsPage() {
  const supabase = createClient();
  const router   = useRouter();

  const [cards, setCards]           = useState<Battlecard[]>([]);
  const [selected, setSelected]     = useState<Battlecard | null>(null);
  const [history, setHistory]       = useState<Battlecard[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading]       = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('battlecards')
      .select('*')
      .order('vendor_b')
      .order('version', { ascending: false });

    const latest = Object.values(
      (data ?? []).reduce<Record<string, Battlecard>>((acc, card) => {
        if (!acc[card.vendor_b]) acc[card.vendor_b] = card;
        return acc;
      }, {})
    );
    setCards(latest);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCard = async (card: Battlecard) => {
    setSelected(card);
    setShowHistory(false);
    const { data } = await supabase
      .from('battlecards')
      .select('id, version, headline, created_at')
      .eq('vendor_b', card.vendor_b)
      .order('version', { ascending: false });
    setHistory((data as Battlecard[]) ?? []);
  };

  const loadVersion = async (id: string) => {
    const { data } = await supabase.from('battlecards').select('*').eq('id', id).single();
    if (data) setSelected(data);
    setShowHistory(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <p className="text-gray-500">Loading battlecards…</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Battlecards</h1>
        <p className="text-gray-400 text-sm mt-0.5">AI-generated positioning cards — versioned and saved from the Compare page</p>
      </div>

      {cards.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-gray-500 mb-4">No battlecards saved yet.</p>
          <button onClick={() => router.push('/compare')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm transition-colors">
            Generate your first battlecard →
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(card => (
            <div key={card.id} onClick={() => openCard(card)}
              className={`bg-gray-900 border border-gray-800 border-l-4 ${BORDER_COLORS[card.vendor_b] ?? 'border-l-indigo-500'}
                rounded-xl p-5 cursor-pointer hover:border-gray-600 transition-all group`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">MYOB Acumatica vs</p>
                  <h2 className="text-base font-bold text-white mt-0.5">{card.vendor_b}</h2>
                </div>
                <span className="text-xs bg-gray-800 text-gray-400 border border-gray-700 px-2 py-0.5 rounded-full">v{card.version}</span>
              </div>
              <p className="text-sm text-gray-400 italic leading-snug line-clamp-2 mb-4">"{card.headline}"</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Clock size={11} />
                  {new Date(card.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={e => { e.stopPropagation(); router.push(`/compare?regenerate=${encodeURIComponent(card.vendor_b)}`); }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-indigo-900/50 hover:bg-indigo-700 border border-indigo-800 rounded-lg text-xs text-indigo-400 transition-colors">
                    <Zap size={10} /> Regenerate
                  </button>
                  <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {card.content.our_strengths?.slice(0, 2).map((s, i) => (
                  <span key={i} className="text-xs bg-green-950/60 text-green-400 border border-green-900 px-2 py-0.5 rounded-full truncate max-w-full">
                    ✓ {s.length > 40 ? s.slice(0, 40) + '…' : s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-end z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl h-full max-h-[calc(100vh-2rem)] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-5 z-10">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-indigo-400 uppercase tracking-wider font-semibold">Battlecard</span>
                    <span className="text-xs bg-gray-800 text-gray-400 border border-gray-700 px-2 py-0.5 rounded-full">v{selected.version}</span>
                  </div>
                  <h2 className="text-lg font-bold">MYOB Acumatica vs {selected.vendor_b}</h2>
                  <p className="text-sm text-indigo-200 italic mt-1">"{selected.headline}"</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(selected.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {history.length > 1 && (
                    <button onClick={() => setShowHistory(!showHistory)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-400 transition-colors">
                      <History size={12} /> History ({history.length})
                    </button>
                  )}
                  <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-gray-800 rounded">
                    <X size={16} className="text-gray-500" />
                  </button>
                </div>
              </div>

              {showHistory && (
                <div className="mt-3 bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                  {history.map(h => (
                    <button key={h.id} onClick={() => loadVersion(h.id)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-700 transition-colors border-b border-gray-700/50 last:border-0
                        ${h.id === selected.id ? 'bg-indigo-950/40' : ''}`}>
                      <span className="text-sm text-gray-300">
                        v{h.version}
                        {h.id === selected.id && <span className="ml-2 text-xs text-indigo-400">current</span>}
                      </span>
                      <div className="text-right">
                        <p className="text-xs text-gray-400 line-clamp-1 max-w-xs">{h.headline}</p>
                        <p className="text-xs text-gray-600">{new Date(h.created_at).toLocaleDateString('en-AU')}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 grid sm:grid-cols-2 gap-4">
              <BattlecardSection title="Our Strengths"      items={selected.content.our_strengths}    color="green"  icon="✓" />
              <BattlecardSection title="Their Strengths"    items={selected.content.their_strengths}  color="yellow" icon="⚡" />
              <BattlecardSection title="Their Weaknesses"   items={selected.content.their_weaknesses} color="red"    icon="✗" />
              <BattlecardSection title="Deal Tips (ANZ)"    items={selected.content.deal_tips}        color="blue"   icon="💡" />
              <BattlecardSection title="Landmines to Plant" items={selected.content.landmines}        color="orange" icon="💣" />
              <BattlecardSection title="Traps & Responses"  items={selected.content.our_traps}        color="purple" icon="🛡" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}