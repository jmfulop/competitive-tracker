'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RefreshCw, Zap, Eye, MessageSquare, Activity, AlertTriangle, Clock, ChevronDown, ChevronRight, Radio, TrendingUp } from 'lucide-react';

interface Signal {
  id: number;
  vendor_tag: string;
  title: string;
  observation: string;
  source_type: string;
  signal_type: string;
  urgency: 'high' | 'medium' | 'low';
  recommended_action: 'respond' | 'investigate' | 'monitor';
  action_detail: string;
  roadmap_implication: string;
  roadmap_detail: string;
  is_leading_indicator: boolean;
  leading_indicator_horizon_months: number | null;
  detected_by: string;
  confidence: number;
  spotted_at: string;
}

const URGENCY = {
  high:   { cls: 'bg-red-900/50 text-red-300 border border-red-800',         label: 'High'   },
  medium: { cls: 'bg-yellow-900/50 text-yellow-300 border border-yellow-800', label: 'Medium' },
  low:    { cls: 'bg-gray-800 text-gray-400 border border-gray-700',          label: 'Low'    },
};

const ACTION = {
  respond:     { cls: 'bg-red-950/80 text-red-300',       label: 'Respond',     icon: <MessageSquare size={10} /> },
  investigate: { cls: 'bg-yellow-950/80 text-yellow-300', label: 'Investigate', icon: <Eye size={10} />           },
  monitor:     { cls: 'bg-gray-900 text-gray-500',        label: 'Monitor',     icon: <Activity size={10} />      },
};

const ROADMAP_COLOR: Record<string, string> = {
  accelerate:      'text-red-400',
  differentiate:   'text-purple-400',
  monitor:         'text-gray-400',
  deprioritise:    'text-gray-500',
  new_opportunity: 'text-green-400',
};

const SOURCE_LABEL: Record<string, string> = {
  job_postings: 'Job Postings', changelog: 'Changelog', g2_reviews: 'G2 Reviews',
  pricing_page: 'Pricing Page', developer_docs: 'Dev Docs', community: 'Community',
  press_releases: 'Press', events: 'Events', github: 'GitHub', partner_network: 'Partners',
};

export default function SignalsPage() {
  const supabase = createClient();

  const [signals, setSignals]     = useState<Signal[]>([]);
  const [loading, setLoading]     = useState(true);
  const [scanning, setScanning]   = useState(false);
  const [filter, setFilter]       = useState('all');
  const [expanded, setExpanded]   = useState<Set<number>>(new Set());
  const [digest, setDigest]       = useState<Record<string, unknown> | null>(null);
  const [genDigest, setGenDigest] = useState(false);
  const [vendors, setVendors]     = useState<string[]>([]);
  const [scanVendor, setScanVendor] = useState('Oracle NetSuite');
  const [scanResult, setScanResult] = useState<{ inserted: number; skipped: number } | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from('weak_signals')
      .select('*')
      .order('spotted_at', { ascending: false })
      .limit(100);
    setSignals((data ?? []) as Signal[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const loadVendors = async () => {
      const { data } = await supabase
        .from('scan_sources')
        .select('vendor_name')
        .eq('is_active', true);
      const unique = [...new Set((data ?? []).map(r => r.vendor_name))].sort();
      setVendors(unique);
      if (unique.length) setScanVendor(unique[0]);
    };
    loadVendors();
  }, []);

  const toggle = (id: number) =>
    setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch('/api/signals/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor: scanVendor }),
      });
      const data = await res.json();
      setScanResult({ inserted: data.inserted ?? 0, skipped: data.skipped ?? 0 });
      await load();
    } finally {
      setScanning(false);
    }
  };

  const handleDigest = async () => {
    setGenDigest(true);
    try {
      const res = await fetch('/api/signals/digest', { method: 'POST' });
      const data = await res.json();
      setDigest(data.digest);
    } finally {
      setGenDigest(false);
    }
  };

  const filtered = signals.filter(s => {
    if (filter === 'high')    return s.urgency === 'high';
    if (filter === 'pattern') return s.detected_by === 'ai_pattern';
    if (filter === 'leading') return s.is_leading_indicator;
    if (filter === 'respond') return s.recommended_action === 'respond';
    return true;
  });

  const stats = [
    { label: 'Total Signals',   value: signals.length,                                           icon: <Radio size={16} className="text-indigo-400" />    },
    { label: 'High Urgency',    value: signals.filter(s => s.urgency === 'high').length,          icon: <AlertTriangle size={16} className="text-red-400" />   },
    { label: 'Patterns',        value: signals.filter(s => s.detected_by === 'ai_pattern').length,icon: <TrendingUp size={16} className="text-purple-400" /> },
    { label: 'Leading Signals', value: signals.filter(s => s.is_leading_indicator).length,        icon: <Clock size={16} className="text-yellow-400" />    },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Signals</h1>
          <p className="text-gray-400 text-sm mt-0.5">AI-detected competitive signals — sources no one else is watching</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleDigest} disabled={genDigest}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded-lg text-sm transition-colors">
            <Zap size={13} className={genDigest ? 'animate-pulse text-indigo-400' : ''} />
            {genDigest ? 'Generating…' : 'Weekly Digest'}
          </button>
          <select
            value={scanVendor}
            onChange={e => setScanVendor(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
          >
            {vendors.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <button onClick={handleScan} disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm transition-colors">
            <RefreshCw size={13} className={scanning ? 'animate-spin' : ''} />
            {scanning ? 'Scanning…' : 'Run Detection'}
          </button>
        </div>
      </div>

      {scanResult && (
        <div className="mb-4 flex items-center gap-3 bg-green-950/40 border border-green-800 rounded-lg px-4 py-3 text-sm">
          <span className="text-green-400 font-medium">Scan complete —</span>
          <span className="text-gray-300">{scanResult.inserted} new signals detected</span>
          <span className="text-gray-600">·</span>
          <span className="text-gray-500">{scanResult.skipped} duplicates skipped</span>
          <button onClick={() => setScanResult(null)} className="ml-auto text-gray-600 hover:text-gray-400">✕</button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center gap-3">
            {s.icon}
            <div>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-gray-400">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5 mb-5 bg-gray-900 border border-gray-800 rounded-lg p-1 w-fit">
        {[['all','All'],['high','High Urgency'],['pattern','Patterns'],['leading','Leading'],['respond','Action Required']].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors
              ${filter === v ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 gap-3 text-gray-500">
          <RefreshCw size={18} className="animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-gray-600">
          <p className="mb-4">No signals yet.</p>
          <button onClick={handleScan} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm transition-colors">
            Run first detection →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => {
            const urg  = URGENCY[s.urgency] ?? URGENCY.low;
            const act  = ACTION[s.recommended_action] ?? ACTION.monitor;
            const isExp = expanded.has(s.id);
            const isPattern = s.detected_by === 'ai_pattern';

            return (
              <div key={s.id} className={`bg-gray-900 rounded-xl border overflow-hidden transition-colors
                ${isPattern ? 'border-purple-800/60' : 'border-gray-800 hover:border-gray-700'}`}>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        {isPattern && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-900/60 border border-purple-700 text-purple-300 rounded text-xs font-semibold">
                            <TrendingUp size={10} /> MACRO PATTERN
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${urg.cls}`}>{urg.label}</span>
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${act.cls}`}>{act.icon}{act.label}</span>
                        <span className="text-xs text-gray-500">{s.vendor_tag}</span>
                        {s.source_type && <span className="text-xs text-gray-600">{SOURCE_LABEL[s.source_type] ?? s.source_type}</span>}
                        {s.is_leading_indicator && s.leading_indicator_horizon_months && (
                          <span className="flex items-center gap-1 text-xs text-yellow-500 bg-yellow-950/40 border border-yellow-900 px-2 py-0.5 rounded">
                            <Clock size={9} /> {s.leading_indicator_horizon_months}mo leading
                          </span>
                        )}
                        <span className="text-xs text-gray-600 ml-auto">
                          {new Date(s.spotted_at).toLocaleDateString('en-AU')}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-white mb-1">{s.title || s.observation?.slice(0, 80)}</h3>
                      <p className="text-sm text-gray-400 leading-relaxed">{s.observation}</p>
                      {s.roadmap_implication && (
                        <div className="mt-2 flex items-start gap-2">
                          <span className={`text-xs font-semibold uppercase tracking-wider shrink-0 ${ROADMAP_COLOR[s.roadmap_implication] ?? 'text-gray-400'}`}>
                            ▸ {s.roadmap_implication.replace('_', ' ')}
                          </span>
                          {s.roadmap_detail && <span className="text-xs text-gray-400">{s.roadmap_detail}</span>}
                        </div>
                      )}
                    </div>
                    <button onClick={() => toggle(s.id)}
                      className="shrink-0 p-1.5 hover:bg-gray-800 rounded text-gray-500 hover:text-gray-300 transition-colors">
                      {isExp ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  </div>
                </div>

                {isExp && (
                  <div className="border-t border-gray-800 px-4 pb-4 pt-3 grid sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Confidence</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(s.confidence / 10) * 100}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-indigo-400">{s.confidence}/10</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Detected By</p>
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium
                        ${s.detected_by === 'ai_pattern' ? 'bg-purple-950 border-purple-700 text-purple-300'
                          : s.detected_by === 'ai_auto' ? 'bg-indigo-950 border-indigo-800 text-indigo-300'
                          : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                        {s.detected_by === 'ai_auto' ? 'AI auto-scan' : s.detected_by === 'ai_pattern' ? 'AI pattern' : 'Manual'}
                      </span>
                    </div>
                    {s.action_detail && (
                      <div className="sm:col-span-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Recommended Action</p>
                        <p className="text-sm text-gray-300">{s.action_detail}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {digest && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setDigest(null)}>
          <div className="bg-gray-900 border border-indigo-800 rounded-xl w-full max-w-xl p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-indigo-400 font-semibold">Weekly Intelligence Digest</span>
                <h2 className="text-base font-bold mt-0.5">{new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</h2>
              </div>
              <button onClick={() => setDigest(null)} className="text-gray-500 hover:text-gray-300 text-lg">✕</button>
            </div>
            <p className="text-sm font-semibold text-indigo-200 italic mb-4">{digest.headline as string}</p>
            <div className="bg-gray-800/50 rounded-lg p-4 mb-3">
              <h3 className="text-xs font-semibold text-gray-400 mb-2">TL;DR</h3>
              <p className="text-sm text-gray-300">{digest.tldr as string}</p>
            </div>
            {(digest.opportunities as string[])?.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-4 mb-3">
                <h3 className="text-xs font-semibold text-green-400 mb-2">Opportunities</h3>
                <ul className="space-y-1">{(digest.opportunities as string[]).map((o, i) => <li key={i} className="text-sm text-gray-300 flex gap-2"><span>✓</span>{o}</li>)}</ul>
              </div>
            )}
            {(digest.watch_list as string[])?.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-xs font-semibold text-yellow-400 mb-2">Watch Next Week</h3>
                <ul className="space-y-1">{(digest.watch_list as string[]).map((w, i) => <li key={i} className="text-sm text-gray-300 flex gap-2"><span>👁</span>{w}</li>)}</ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}