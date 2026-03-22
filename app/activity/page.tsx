'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Search, RefreshCw, ChevronDown, ChevronRight,
  Zap, BarChart2, CreditCard, Activity, TrendingUp,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LogEntry {
  id: string;
  entity_type: string;
  entity_id: string | null;
  vendor: string | null;
  action: string;
  summary: string;
  previous: Record<string, unknown> | null;
  current: Record<string, unknown> | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const ACTION_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  research_run:           { label: 'Research Run',        color: 'text-purple-300', bg: 'bg-purple-950/60 border-purple-800', icon: <BarChart2 size={12}/> },
  battlecard_generated:   { label: 'Battlecard Created',  color: 'text-indigo-300', bg: 'bg-indigo-950/60 border-indigo-800', icon: <CreditCard size={12}/> },
  battlecard_regenerated: { label: 'Battlecard Updated',  color: 'text-blue-300',   bg: 'bg-blue-950/60 border-blue-800',     icon: <CreditCard size={12}/> },
  signal_triaged:         { label: 'Signal Triaged',      color: 'text-teal-300',   bg: 'bg-teal-950/60 border-teal-800',     icon: <Activity size={12}/> },
  signal_retriaged:       { label: 'Signal Re-triaged',   color: 'text-teal-300',   bg: 'bg-teal-950/60 border-teal-800',     icon: <Activity size={12}/> },
  deal_logged:            { label: 'Deal Logged',         color: 'text-green-300',  bg: 'bg-green-950/60 border-green-800',   icon: <TrendingUp size={12}/> },
};

const ENTITY_FILTERS = ['all', 'vendor_score', 'battlecard', 'signal_triage', 'win_loss'];
const PAGE_SIZE = 25;

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function DeltaBadge({ previous, current }: { previous: Record<string, unknown> | null; current: Record<string, unknown> | null }) {
  if (!previous || !current) return null;
  const prev = previous.overall_score as number | undefined;
  const curr = current.overall_score as number | undefined;
  if (prev == null || curr == null) return null;
  const delta = +(curr - prev).toFixed(1);
  if (delta === 0) return <span className="text-xs text-gray-500">no change</span>;
  const color = delta > 0 ? 'text-green-400' : 'text-red-400';
  return <span className={`text-xs font-semibold ${color}`}>{delta > 0 ? '+' : ''}{delta} score</span>;
}

function JsonDiff({ previous, current }: { previous: Record<string, unknown> | null; current: Record<string, unknown> | null }) {
  if (!previous && !current) return null;
  return (
    <div className="grid grid-cols-2 gap-3 mt-3">
      {previous && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Before</p>
          <pre className="text-xs text-gray-400 bg-gray-950 rounded p-2 overflow-auto max-h-32 leading-relaxed">
            {JSON.stringify(previous, null, 2)}
          </pre>
        </div>
      )}
      {current && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">After</p>
          <pre className="text-xs text-gray-300 bg-gray-950 rounded p-2 overflow-auto max-h-32 leading-relaxed">
            {JSON.stringify(current, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ActivityLogPage() {
  const supabase = createClient();

  const [entries, setEntries]         = useState<LogEntry[]>([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [page, setPage]               = useState(0);
  const [expanded, setExpanded]       = useState<Set<string>>(new Set());
  const [entityFilter, setEntityFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('');
  const [search, setSearch]           = useState('');

  const load = useCallback(async (p = 0, showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);

    let query = supabase
      .from('activity_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE - 1);

    if (entityFilter !== 'all') query = query.eq('entity_type', entityFilter);
    if (vendorFilter)           query = query.ilike('vendor', `%${vendorFilter}%`);
    if (search)                 query = query.ilike('summary', `%${search}%`);

    const { data, count } = await query;
    setEntries(data ?? []);
    setTotal(count ?? 0);
    setLoading(false);
    setRefreshing(false);
  }, [entityFilter, vendorFilter, search]);

  useEffect(() => { setPage(0); load(0); }, [entityFilter, vendorFilter]);
  useEffect(() => { load(page); }, [page]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => { setPage(0); load(0); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Live subscription — new log entries appear automatically
  useEffect(() => {
    const channel = supabase
      .channel('activity_log_feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' }, () => {
        load(0, true);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const toggleExpand = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Summary stats
  const stats = [
    { label: 'Total Events',      value: total },
    { label: 'Research Runs',     value: entries.filter(e => e.action === 'research_run').length },
    { label: 'Battlecards',       value: entries.filter(e => e.action.startsWith('battlecard')).length },
    { label: 'Signals Triaged',   value: entries.filter(e => e.action.includes('triage')).length },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Activity Log</h1>
          <p className="text-gray-400 text-sm mt-0.5">Every AI operation across the tracker — live feed</p>
        </div>
        <button
          onClick={() => load(page, true)}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin text-indigo-400' : ''}/>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        {/* Search */}
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 flex-1 min-w-48">
          <Search size={13} className="text-gray-500 shrink-0"/>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search summaries…"
            className="bg-transparent text-sm text-gray-300 placeholder-gray-600 focus:outline-none w-full"
          />
        </div>

        {/* Entity type filter */}
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
          {ENTITY_FILTERS.map(f => (
            <button key={f} onClick={() => setEntityFilter(f)}
              className={`px-3 py-1 rounded text-xs font-medium capitalize transition-colors
                ${entityFilter === f ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
              {f === 'all' ? 'All' : f.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Vendor filter */}
        <input
          value={vendorFilter}
          onChange={e => setVendorFilter(e.target.value)}
          placeholder="Filter by vendor…"
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-600 w-44"
        />
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex items-center justify-center py-24 gap-3 text-gray-500">
          <RefreshCw size={18} className="animate-spin"/> Loading…
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-24 text-gray-600">No activity found</div>
      ) : (
        <div className="space-y-2">
          {entries.map(entry => {
            const meta  = ACTION_META[entry.action] ?? { label: entry.action, color: 'text-gray-400', bg: 'bg-gray-800 border-gray-700', icon: <Zap size={12}/> };
            const isExp = expanded.has(entry.id);
            const hasDiff = entry.previous || entry.current;

            return (
              <div key={entry.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors">
                {/* Main row */}
                <div className="flex items-start gap-4 p-4">
                  {/* Timeline dot */}
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0"/>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {/* Action badge */}
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${meta.bg} ${meta.color}`}>
                        {meta.icon} {meta.label}
                      </span>
                      {/* Vendor */}
                      {entry.vendor && (
                        <span className="text-xs text-gray-400 font-medium">{entry.vendor}</span>
                      )}
                      {/* Score delta */}
                      <DeltaBadge previous={entry.previous} current={entry.current}/>
                      {/* Cached badge */}
                      {entry.meta?.cached && (
                        <span className="text-xs bg-gray-800 text-gray-500 border border-gray-700 px-2 py-0.5 rounded">cached</span>
                      )}
                      {/* Version badge for battlecards */}
                      {entry.current?.version && (
                        <span className="text-xs bg-indigo-950 text-indigo-400 border border-indigo-900 px-2 py-0.5 rounded">
                          v{entry.current.version as number}
                        </span>
                      )}
                    </div>

                    {/* Summary */}
                    <p className="text-sm text-gray-300 leading-snug">{entry.summary}</p>

                    {/* Meta row */}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-gray-600">
                        {new Date(entry.created_at).toLocaleString('en-AU', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                      <span className="text-xs text-gray-700">{timeAgo(entry.created_at)}</span>
                      {entry.meta?.model && (
                        <span className="text-xs text-gray-700">{entry.meta.model as string}</span>
                      )}
                    </div>
                  </div>

                  {/* Expand toggle */}
                  {hasDiff && (
                    <button
                      onClick={() => toggleExpand(entry.id)}
                      className="shrink-0 p-1.5 hover:bg-gray-800 rounded transition-colors text-gray-500 hover:text-gray-300"
                    >
                      {isExp ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                    </button>
                  )}
                </div>

                {/* Expanded diff */}
                {isExp && hasDiff && (
                  <div className="px-4 pb-4 border-t border-gray-800 pt-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Payload diff</p>
                    <JsonDiff previous={entry.previous} current={entry.current}/>
                    {entry.meta && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Meta</p>
                        <pre className="text-xs text-gray-500 bg-gray-950 rounded p-2 overflow-auto">
                          {JSON.stringify(entry.meta, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-6 text-sm text-gray-400">
          <span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 rounded-lg transition-colors">
              ← Prev
            </button>
            <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= total}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 rounded-lg transition-colors">
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
// force redeploy
/ /   r e f r e s h  
 