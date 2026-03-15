'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Download, Zap, X, ChevronDown, ChevronRight } from 'lucide-react';

type SupportLevel = 'full' | 'partial' | 'roadmap' | 'none';

interface FeatureRow {
  vendor_name: string;
  category: string;
  feature_name: string;
  support_level: SupportLevel;
  notes: string;
}

interface Battlecard {
  competitor: string;
  headline: string;
  our_strengths: string[];
  their_strengths: string[];
  their_weaknesses: string[];
  landmines: string[];
  our_traps: string[];
  deal_tips: string[];
}

const BADGE: Record<SupportLevel, { label: string; cls: string }> = {
  full:    { label: '✓ Full',    cls: 'bg-green-900/60 text-green-300 border border-green-700'   },
  partial: { label: '~ Partial', cls: 'bg-yellow-900/60 text-yellow-300 border border-yellow-700' },
  roadmap: { label: '◷ Roadmap', cls: 'bg-blue-900/60 text-blue-300 border border-blue-700'     },
  none:    { label: '✗ None',    cls: 'bg-gray-800 text-gray-500 border border-gray-700'         },
};

function SupportBadge({ level, notes }: { level: SupportLevel; notes?: string }) {
  const b = BADGE[level] ?? BADGE.none;
  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${b.cls}`}>{b.label}</span>
      {notes && <span className="text-xs text-gray-500">{notes}</span>}
    </div>
  );
}

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

export default function ComparePage() {
  const supabase = createClient();

  const [allVendors, setAllVendors] = useState<string[]>([]);
  const [selected, setSelected]     = useState<string[]>(['MYOB Acumatica']);
  const [matrix, setMatrix]         = useState<FeatureRow[]>([]);
  const [collapsed, setCollapsed]   = useState<Record<string, boolean>>({});
  const [battlecard, setBattlecard] = useState<Battlecard | null>(null);
  const [bcLoading, setBcLoading]   = useState(false);
  const [bcError, setBcError]       = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    const loadVendors = async () => {
      const { data } = await supabase.from('vendors').select('name').order('name');
      const names = (data ?? []).map(v => v.name);
      setAllVendors(['MYOB Acumatica', ...names.filter(n => n !== 'MYOB Acumatica')]);
    };
    loadVendors();
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('feature_matrix')
        .select('*')
        .in('vendor_name', selected)
        .order('category')
        .order('feature_name');
      setMatrix(data ?? []);
      setLoading(false);
    };
    if (selected.length) load();
  }, [selected]);

  const grouped = matrix.reduce<Record<string, FeatureRow[]>>((acc, row) => {
    (acc[row.category] ??= []).push(row);
    return acc;
  }, {});

  const toggleVendor = (v: string) => {
    if (v === 'MYOB Acumatica') return;
    setSelected(prev =>
      prev.includes(v)
        ? prev.length > 2 ? prev.filter(x => x !== v) : prev
        : prev.length < 4 ? [...prev, v] : prev
    );
    setBattlecard(null);
  };

  const exportCSV = () => {
    const cols = ['Category', 'Feature', ...selected];
    const rows = [cols.join(',')];
    Object.entries(grouped).forEach(([cat, feats]) => {
      const featureNames = [...new Set(feats.map(f => f.feature_name))];
      featureNames.forEach(fname => {
        const row = [cat, fname];
        selected.forEach(v => {
          const match = feats.find(f => f.vendor_name === v && f.feature_name === fname);
          row.push(match?.support_level ?? 'none');
        });
        rows.push(row.map(c => `"${c}"`).join(','));
      });
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'erp-comparison.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const generateBattlecard = useCallback(async () => {
    setBcLoading(true); setBcError(null); setBattlecard(null);
    try {
      const res = await fetch('/api/compare/battlecard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendors: selected, matrixData: grouped }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBattlecard(data.battlecard);
    } catch (e: unknown) {
      setBcError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBcLoading(false);
    }
  }, [selected, grouped]);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Feature Comparison</h1>
          <p className="text-gray-400 text-sm mt-1">ANZ Mid-Market ERP — select 2–4 vendors</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={generateBattlecard} disabled={bcLoading || selected.length < 2}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm transition-colors">
            <Zap size={14} className={bcLoading ? 'animate-pulse' : ''} />
            {bcLoading ? 'Generating…' : 'AI Battlecard'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 max-h-24 overflow-y-auto pr-1">
        {allVendors.map(v => {
          const active = selected.includes(v);
          const isMYOB = v === 'MYOB Acumatica';
          return (
            <button key={v} onClick={() => toggleVendor(v)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-all
                ${isMYOB ? 'bg-purple-700 border-purple-500 text-white cursor-default'
                  : active ? 'bg-indigo-700 border-indigo-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}>
              {v}{active && !isMYOB && <X size={11} />}
            </button>
          );
        })}
        <span className="text-xs text-gray-600 self-center">{selected.length}/4 selected</span>
      </div>

      {Object.keys(grouped).length === 0 && !loading ? (
        <div className="text-center py-24 text-gray-600">
          <p className="mb-2">No feature matrix data yet.</p>
          <p className="text-sm">Run the seed script: <code className="text-indigo-400">npx ts-node scripts/seed-feature-matrix.ts</code></p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden border border-gray-800">
          <div className="grid bg-gray-900 border-b border-gray-800"
            style={{ gridTemplateColumns: `20% repeat(${selected.length}, 1fr)` }}>
            <div className="p-4 text-xs uppercase tracking-wider text-gray-500 font-semibold">Feature</div>
            {selected.map(v => (
              <div key={v} className={`p-4 text-sm font-semibold text-center ${v === 'MYOB Acumatica' ? 'text-purple-300' : 'text-gray-200'}`}>
                {v}
              </div>
            ))}
          </div>

          {Object.entries(grouped).map(([cat, rows]) => {
            const featureNames = [...new Set(rows.map(r => r.feature_name))];
            const isOpen = !collapsed[cat];
            return (
              <div key={cat} className="border-b border-gray-800 last:border-0">
                <button onClick={() => setCollapsed(p => ({ ...p, [cat]: !p[cat] }))}
                  className="w-full flex items-center gap-2 p-3 bg-gray-900/60 hover:bg-gray-900 text-left transition-colors">
                  {isOpen ? <ChevronDown size={13} className="text-gray-500" /> : <ChevronRight size={13} className="text-gray-500" />}
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{cat}</span>
                </button>
                {isOpen && featureNames.map((fname, fi) => (
                  <div key={fname}
                    className={`grid items-start hover:bg-gray-900/40 transition-colors ${fi % 2 === 0 ? 'bg-gray-950' : 'bg-gray-900/20'}`}
                    style={{ gridTemplateColumns: `20% repeat(${selected.length}, 1fr)` }}>
                    <div className="p-3 text-sm text-gray-300 self-center">{fname}</div>
                    {selected.map(v => {
                      const match = rows.find(r => r.vendor_name === v && r.feature_name === fname);
                      return (
                        <div key={v} className={`p-3 flex justify-center ${v === 'MYOB Acumatica' ? 'bg-purple-950/10' : ''}`}>
                          <SupportBadge level={(match?.support_level ?? 'none') as SupportLevel} notes={match?.notes} />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-3 mt-4 text-xs text-gray-500">
        {Object.entries(BADGE).map(([k, v]) => (
          <span key={k} className={`px-2 py-0.5 rounded ${v.cls}`}>{v.label}</span>
        ))}
      </div>

      {bcError && (
        <div className="mt-6 bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">{bcError}</div>
      )}

      {battlecard && (
        <div className="mt-8 bg-gray-900 rounded-xl p-6 border border-indigo-800">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-xs uppercase tracking-wider text-indigo-400 font-semibold">AI Battlecard</span>
              <h2 className="text-xl font-bold mt-1">MYOB Acumatica vs {battlecard.competitor}</h2>
              <p className="text-indigo-200 mt-1 italic">"{battlecard.headline}"</p>
            </div>
            <button onClick={() => setBattlecard(null)} className="p-1 hover:bg-gray-800 rounded">
              <X size={16} className="text-gray-500" />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <BattlecardSection title="Our Strengths"      items={battlecard.our_strengths}    color="green"  icon="✓" />
            <BattlecardSection title="Their Strengths"    items={battlecard.their_strengths}  color="yellow" icon="⚡" />
            <BattlecardSection title="Their Weaknesses"   items={battlecard.their_weaknesses} color="red"    icon="✗" />
            <BattlecardSection title="Deal Tips (ANZ)"    items={battlecard.deal_tips}        color="blue"   icon="💡" />
            <BattlecardSection title="Landmines to Plant" items={battlecard.landmines}        color="orange" icon="💣" />
            <BattlecardSection title="Traps & Responses"  items={battlecard.our_traps}        color="purple" icon="🛡" />
          </div>
        </div>
      )}
    </div>
  );
}