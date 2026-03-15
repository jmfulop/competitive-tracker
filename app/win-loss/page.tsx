'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Plus, Zap, X, TrendingUp, TrendingDown, Minus } from 'lucide-react';

type Outcome  = 'won' | 'lost' | 'no_decision';
type DealSize = 'smb' | 'mid' | 'enterprise';

interface Entry {
  id: string;
  outcome: Outcome;
  competitor: string;
  deal_size: DealSize;
  industry: string;
  primary_reason: string;
  notes: string;
  created_at: string;
}

interface Playbook {
  headline: string;
  win_patterns: string[];
  loss_patterns: string[];
  segments_we_win: string[];
  segments_at_risk: string[];
  top_objections: { objection: string; response: string }[];
  messaging_hooks: string[];
  qualification_flags: string[];
  recommended_actions: string[];
}

const INDUSTRIES  = ['Manufacturing', 'Construction', 'Distribution', 'Professional Services', 'Retail', 'Not-for-Profit', 'Other'];
const DEAL_SIZES: DealSize[] = ['smb', 'mid', 'enterprise'];

const OUTCOME_STYLE: Record<Outcome, { label: string; color: string; icon: React.ReactNode }> = {
  won:         { label: 'Won',         color: 'text-green-400', icon: <TrendingUp size={13} />   },
  lost:        { label: 'Lost',        color: 'text-red-400',   icon: <TrendingDown size={13} /> },
  no_decision: { label: 'No Decision', color: 'text-gray-400',  icon: <Minus size={13} />        },
};

const COLORS: Record<string, string> = {
  green:'text-green-400', red:'text-red-400', blue:'text-blue-400',
  orange:'text-orange-400', purple:'text-purple-400', yellow:'text-yellow-400',
};

function WinRatePill({ rate }: { rate: number }) {
  const color = rate >= 60 ? 'text-green-400' : rate >= 40 ? 'text-yellow-400' : 'text-red-400';
  return <span className={`text-lg font-bold ${color}`}>{rate}%</span>;
}

function PlaybookSection({ title, items, color, icon }: { title: string; items: string[]; color: string; icon: string }) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <h3 className={`text-sm font-semibold mb-3 ${COLORS[color] ?? 'text-gray-300'}`}>{title}</h3>
      <ul className="space-y-1.5">
        {items?.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-gray-300"><span className="shrink-0">{icon}</span>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function WinLossPage() {
  const supabase = createClient();

  const [entries, setEntries]       = useState<Entry[]>([]);
  const [vendors, setVendors]       = useState<string[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [selectedComp, setSelectedComp] = useState<string | null>(null);
  const [playbook, setPlaybook]     = useState<Playbook | null>(null);
  const [pbMeta, setPbMeta]         = useState<{ wins: number; losses: number; winRate: number } | null>(null);
  const [pbLoading, setPbLoading]   = useState(false);
  const [pbError, setPbError]       = useState<string | null>(null);

  const [form, setForm] = useState({
    outcome:        'won' as Outcome,
    competitor:     '',
    deal_size:      'mid' as DealSize,
    industry:       INDUSTRIES[0],
    primary_reason: '',
    notes:          '',
  });

  const load = async () => {
    setLoading(true);
    const [{ data: entriesData }, { data: vendorsData }] = await Promise.all([
      supabase.from('win_loss_entries').select('*').order('created_at', { ascending: false }),
      supabase.from('vendors').select('name').order('name'),
    ]);
    setEntries(entriesData ?? []);
    setVendors((vendorsData ?? []).map(v => v.name));
    if (!form.competitor && vendorsData?.length) setForm(f => ({ ...f, competitor: vendorsData[0].name }));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const winRate = (comp?: string) => {
    const filtered = comp ? entries.filter(e => e.competitor === comp) : entries;
    if (!filtered.length) return 0;
    return Math.round((filtered.filter(e => e.outcome === 'won').length / filtered.length) * 100);
  };

  const handleSubmit = async () => {
    if (!form.primary_reason.trim()) return;
    await supabase.from('win_loss_entries').insert(form);
    setShowForm(false);
    load();
  };

  const generatePlaybook = async (competitor: string) => {
    setPbLoading(true); setPbError(null); setPlaybook(null); setSelectedComp(competitor);
    try {
      const res = await fetch('/api/win-loss/playbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitor }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPlaybook(data.playbook);
      setPbMeta(data.meta);
    } catch (e: unknown) {
      setPbError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setPbLoading(false);
    }
  };

  const chartData = vendors
    .filter(v => entries.some(e => e.competitor === v))
    .map(v => ({
      name:  v.length > 12 ? v.slice(0, 12) + '…' : v,
      full:  v,
      rate:  winRate(v),
      total: entries.filter(e => e.competitor === v).length,
    }));

  const reasons = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.primary_reason] = (acc[e.primary_reason] ?? 0) + 1;
    return acc;
  }, {});
  const topReasons = Object.entries(reasons).sort(([, a], [, b]) => b - a).slice(0, 6);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Win / Loss Analysis</h1>
          <p className="text-gray-400 text-sm mt-0.5">Track deal outcomes and generate AI positioning playbooks</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm transition-colors">
          <Plus size={14} /> Log Deal
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Deals',      value: entries.length,                                  vc: 'text-white'    },
          { label: 'Overall Win Rate', value: <WinRatePill rate={winRate()} />,                vc: ''              },
          { label: 'Losses',           value: entries.filter(e => e.outcome === 'lost').length, vc: 'text-red-400' },
          { label: 'No Decision',      value: entries.filter(e => e.outcome === 'no_decision').length, vc: 'text-gray-400' },
        ].map(c => (
          <div key={c.label} className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <div className={`text-3xl font-bold mb-1 ${c.vc}`}>{c.value}</div>
            <div className="text-sm text-gray-300">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-base font-semibold mb-4">Win Rate by Competitor</h2>
          {chartData.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={28}>
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  content={({ active, payload }) => active && payload?.length ? (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs">
                      <p className="font-semibold text-white">{payload[0].payload.full}</p>
                      <p className="text-green-400 font-bold">{payload[0].value}% win rate</p>
                      <p className="text-gray-500">{payload[0].payload.total} deals</p>
                    </div>
                  ) : null} />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                  {chartData.map(d => <Cell key={d.name} fill={d.rate >= 60 ? '#22c55e' : d.rate >= 40 ? '#eab308' : '#ef4444'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-600 text-sm text-center py-16">No data yet — log your first deal</p>
          )}
        </div>

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-base font-semibold mb-4">Top Decision Reasons</h2>
          {topReasons.length ? (
            <div className="space-y-3">
              {topReasons.map(([reason, count]) => (
                <div key={reason}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300 truncate">{reason}</span>
                    <span className="text-gray-500 ml-2 shrink-0">{count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(count / entries.length) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-sm text-center py-16">No reasons logged yet</p>
          )}
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 mb-8 overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-base font-semibold">By Competitor</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-gray-500 border-b border-gray-800">
              <th className="text-left p-4">Competitor</th>
              <th className="text-center p-4">Deals</th>
              <th className="text-center p-4">Won</th>
              <th className="text-center p-4">Lost</th>
              <th className="text-center p-4">Win Rate</th>
              <th className="text-right p-4">Playbook</th>
            </tr>
          </thead>
          <tbody>
            {vendors.filter(v => entries.some(e => e.competitor === v)).map(v => {
              const ces = entries.filter(e => e.competitor === v);
              return (
                <tr key={v} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30 transition-colors">
                  <td className="p-4 text-gray-200 font-medium">{v}</td>
                  <td className="p-4 text-center text-gray-400">{ces.length}</td>
                  <td className="p-4 text-center text-green-400">{ces.filter(e => e.outcome === 'won').length}</td>
                  <td className="p-4 text-center text-red-400">{ces.filter(e => e.outcome === 'lost').length}</td>
                  <td className="p-4 text-center"><WinRatePill rate={winRate(v)} /></td>
                  <td className="p-4 text-right">
                    <button onClick={() => generatePlaybook(v)}
                      disabled={pbLoading && selectedComp === v}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-900/60 hover:bg-indigo-700 border border-indigo-700 rounded-lg text-xs text-indigo-300 transition-colors ml-auto disabled:opacity-50">
                      <Zap size={11} className={pbLoading && selectedComp === v ? 'animate-pulse' : ''} />
                      {pbLoading && selectedComp === v ? 'Generating…' : 'AI Playbook'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!entries.length && <p className="text-center text-gray-600 text-sm py-10">No deals logged yet</p>}
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-base font-semibold">Recent Deals</h2>
        </div>
        <div className="divide-y divide-gray-800">
          {entries.slice(0, 10).map(e => {
            const os = OUTCOME_STYLE[e.outcome];
            return (
              <div key={e.id} className="p-4 flex items-start gap-4">
                <span className={`flex items-center gap-1 text-xs font-medium mt-0.5 shrink-0 ${os.color}`}>
                  {os.icon} {os.label}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-200">{e.competitor}</span>
                  <span className="text-xs text-gray-500 ml-2">{e.industry} · {e.deal_size}</span>
                  <p className="text-sm text-gray-400 mt-0.5 truncate">{e.primary_reason}</p>
                </div>
                <span className="text-xs text-gray-600 shrink-0">
                  {new Date(e.created_at).toLocaleDateString('en-AU')}
                </span>
              </div>
            );
          })}
          {!entries.length && <p className="text-center text-gray-600 text-sm py-8">No deals logged yet</p>}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Log Deal Outcome</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-800 rounded"><X size={16} className="text-gray-500" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1.5">Outcome</label>
                <div className="flex gap-2">
                  {(['won', 'lost', 'no_decision'] as Outcome[]).map(o => (
                    <button key={o} onClick={() => setForm(f => ({ ...f, outcome: o }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors
                        ${form.outcome === o
                          ? o === 'won' ? 'bg-green-900/60 border-green-600 text-green-300'
                            : o === 'lost' ? 'bg-red-900/60 border-red-600 text-red-300'
                            : 'bg-gray-700 border-gray-500 text-gray-300'
                          : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-600'}`}>
                      {OUTCOME_STYLE[o].label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1.5">Competitor</label>
                <select value={form.competitor} onChange={e => setForm(f => ({ ...f, competitor: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500">
                  {vendors.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1.5">Deal Size</label>
                  <select value={form.deal_size} onChange={e => setForm(f => ({ ...f, deal_size: e.target.value as DealSize }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500">
                    {DEAL_SIZES.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1.5">Industry</label>
                  <select value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500">
                    {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1.5">Primary Reason *</label>
                <input value={form.primary_reason} onChange={e => setForm(f => ({ ...f, primary_reason: e.target.value }))}
                  placeholder="e.g. Lost on price, Won on ANZ compliance depth…"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  placeholder="Any additional context…"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none" />
              </div>
              <button onClick={handleSubmit}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors">
                Save Deal
              </button>
            </div>
          </div>
        </div>
      )}

      {pbError && (
        <div className="fixed bottom-6 right-6 bg-red-900/90 border border-red-700 rounded-lg p-4 text-red-300 text-sm max-w-sm">
          {pbError}
          <button onClick={() => setPbError(null)} className="ml-3 text-red-500 hover:text-red-300">✕</button>
        </div>
      )}

      {playbook && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-end z-50 p-4">
          <div className="bg-gray-900 border border-indigo-800 rounded-xl w-full max-w-xl h-full max-h-[calc(100vh-2rem)] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-indigo-400 font-semibold">AI Playbook</span>
                <h2 className="text-lg font-bold mt-1">vs {selectedComp}</h2>
                {pbMeta && <p className="text-sm text-gray-400 mt-0.5">{pbMeta.winRate}% win rate · {pbMeta.wins}W / {pbMeta.losses}L</p>}
                <p className="text-indigo-200 mt-2 italic text-sm">"{playbook.headline}"</p>
              </div>
              <button onClick={() => setPlaybook(null)} className="p-1 hover:bg-gray-800 rounded shrink-0 ml-4">
                <X size={16} className="text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <PlaybookSection title="Why We Win"           items={playbook.win_patterns}        color="green"  icon="✓" />
              <PlaybookSection title="Why We Lose"          items={playbook.loss_patterns}       color="red"    icon="✗" />
              <PlaybookSection title="Segments to Target"   items={playbook.segments_we_win}     color="blue"   icon="🎯" />
              <PlaybookSection title="Segments at Risk"     items={playbook.segments_at_risk}    color="orange" icon="⚠️" />
              <PlaybookSection title="Messaging Hooks"      items={playbook.messaging_hooks}     color="purple" icon="💬" />
              <PlaybookSection title="Qualification Flags"  items={playbook.qualification_flags} color="yellow" icon="🚦" />
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-teal-400 mb-3">Top Objections</h3>
                <div className="space-y-3">
                  {playbook.top_objections?.map((o, i) => (
                    <div key={i} className="text-sm">
                      <p className="text-gray-400 font-medium">"{o.objection}"</p>
                      <p className="text-gray-300 mt-0.5 pl-3 border-l border-teal-700">{o.response}</p>
                    </div>
                  ))}
                </div>
              </div>
              <PlaybookSection title="Recommended Actions" items={playbook.recommended_actions} color="green" icon="→" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}