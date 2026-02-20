'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Download,
  Edit2,
  RefreshCw,
  Radio,
  AlertTriangle,
  TrendingUp,
  Shield,
  Zap,
  X,
  HelpCircle,
  BookOpen,
  BarChart2,
  Cpu
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const MATURITY_CONFIG = {
  Advanced: {
    color: 'bg-green-500',
    text: 'text-green-400',
    bar: 'w-full',
    label: 'Advanced',
    score: 4,
    tooltip: 'Fully deployed AI at scale, proven in production across modules.'
  },
  Ambitious: {
    color: 'bg-blue-500',
    text: 'text-blue-400',
    bar: 'w-3/4',
    label: 'Ambitious',
    score: 3,
    tooltip: 'Strong AI strategy, but real-world deployment is still catching up.'
  },
  Developing: {
    color: 'bg-yellow-500',
    text: 'text-yellow-400',
    bar: 'w-1/2',
    label: 'Developing',
    score: 2,
    tooltip: 'Early stage AI — limited features in production, roadmap in progress.'
  },
  Limited: {
    color: 'bg-slate-500',
    text: 'text-slate-400',
    bar: 'w-1/4',
    label: 'Limited',
    score: 1,
    tooltip: 'Minimal AI capability — basic automation or early experimentation only.'
  }
};

const IMPACT_CONFIG = {
  High: { color: 'bg-red-500/20 text-red-300 border-red-500/30', dot: 'bg-red-400', priority: 1 },
  Medium: { color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', dot: 'bg-yellow-400', priority: 2 },
  Low: { color: 'bg-slate-500/20 text-slate-300 border-slate-500/30', dot: 'bg-slate-400', priority: 3 }
};

const STATUS_CONFIG = {
  Monitoring: { color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  Validated: { color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  Invalidated: { color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' }
};

export default function CompetitiveTracker() {
  const [tab, setTab] = useState('dashboard');
  const [vendors, setVendors] = useState([]);
  const [signals, setSignals] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiUpdating, setAiUpdating] = useState(false);
  const [newCapability, setNewCapability] = useState('');
  const [newSource, setNewSource] = useState('');
  const [signalFilter, setSignalFilter] = useState('All');
  // ── separate impact filter so High Impact card works properly
  const [impactFilter, setImpactFilter] = useState('All');
  const [showHelp, setShowHelp] = useState(false);
  const [newSignal, setNewSignal] = useState({
    observation: '',
    source: '',
    vendor_tag: '',
    confidence: 50,
    timeline: '6 months',
    impact: 'Medium',
    notes: '',
    status: 'Monitoring'
  });

  // ✅ Feature flag for AI Update button (client-safe)
  const aiUpdateEnabled = process.env.NEXT_PUBLIC_ENABLE_AI_UPDATE === 'true';

  useEffect(() => {
    fetchVendors();
    fetchSignals();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const { data: vendorsData } = await supabase.from('vendors').select('*');
      const vendorsWithData = await Promise.all(
        (vendorsData || []).map(async (vendor) => {
          const { data: caps } = await supabase.from('capabilities').select('*').eq('vendor_id', vendor.id);
          const { data: srcs } = await supabase.from('sources').select('*').eq('vendor_id', vendor.id);
          return { ...vendor, capabilities: caps || [], sources: srcs || [] };
        })
      );
      setVendors(vendorsWithData);
      if (vendorsWithData.length > 0) setSelectedVendorId(vendorsWithData[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSignals = async () => {
    const { data } = await supabase
      .from('weak_signals')
      .select('*')
      .order('spotted_at', { ascending: false });

    setSignals(data || []);
  };

  const handleAiUpdate = async () => {
    // ✅ guard even if someone calls the function directly
    if (!aiUpdateEnabled) {
      alert('AI Update is disabled.');
      return;
    }

    try {
      setAiUpdating(true);

      const res = await fetch('/api/ai-update', { method: 'POST' });

      // Handle non-JSON responses safely (e.g. 404 "Not enabled")
      const contentType = res.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');

      const payload = isJson ? await res.json() : { success: false, error: await res.text() };

      if (!res.ok) {
        alert('Update failed: ' + (payload?.error || `HTTP ${res.status}`));
        return;
      }

      if (payload.success) {
        await fetchVendors();
        alert(`✅ Updated ${payload.vendorCount} vendors!`);
      } else {
        alert('Update failed: ' + (payload.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error: ' + (err?.message || String(err)));
    } finally {
      setAiUpdating(false);
    }
  };

  const addSignal = async () => {
    if (!newSignal.observation.trim()) return;
    await supabase.from('weak_signals').insert([newSignal]);
    setNewSignal({
      observation: '',
      source: '',
      vendor_tag: '',
      confidence: 50,
      timeline: '6 months',
      impact: 'Medium',
      notes: '',
      status: 'Monitoring'
    });
    fetchSignals();
  };

  const updateSignalStatus = async (id, status) => {
    await supabase
      .from('weak_signals')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    fetchSignals();
  };

  const deleteSignal = async (id) => {
    await supabase.from('weak_signals').delete().eq('id', id);
    fetchSignals();
  };

  const selectedVendor = vendors.find((v) => v.id === selectedVendorId);

  const updateVendor = async (field, value) => {
    if (!selectedVendor) return;
    await supabase
      .from('vendors')
      .update({ [field]: value, updated_at: new Date() })
      .eq('id', selectedVendor.id);
    fetchVendors();
  };

  const addCapability = async () => {
    if (!newCapability.trim() || !selectedVendor) return;
    await supabase.from('capabilities').insert([{ vendor_id: selectedVendor.id, capability: newCapability }]);
    setNewCapability('');
    fetchVendors();
  };

  const removeCapability = async (id) => {
    await supabase.from('capabilities').delete().eq('id', id);
    fetchVendors();
  };

  const addSource = async () => {
    if (!newSource.trim() || !selectedVendor) return;
    await supabase.from('sources').insert([{ vendor_id: selectedVendor.id, source: newSource }]);
    setNewSource('');
    fetchVendors();
  };

  const removeSource = async (id) => {
    await supabase.from('sources').delete().eq('id', id);
    fetchVendors();
  };

  const downloadAsJSON = () => {
    const blob = new Blob([JSON.stringify({ vendors, signals }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `erp-tracker-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  // Helper to navigate to signals tab with both filters set
  const goToSignals = (statusFilter = 'All', impactF = 'All') => {
    setTab('signals');
    setSignalFilter(statusFilter);
    setImpactFilter(impactF);
  };

  // Clear all active filters
  const clearFilters = () => {
    setSignalFilter('All');
    setImpactFilter('All');
  };

  const hasActiveFilter = signalFilter !== 'All' || impactFilter !== 'All';

  const sortedSignals = [...signals].sort((a, b) => {
    const pa = IMPACT_CONFIG[a.impact]?.priority || 3;
    const pb = IMPACT_CONFIG[b.impact]?.priority || 3;
    return pa - pb;
  });

  // Apply both status AND impact filters
  const filteredSignals = sortedSignals
    .filter((s) => signalFilter === 'All' || s.status === signalFilter)
    .filter((s) => impactFilter === 'All' || s.impact === impactFilter);

  const validatedSignals = signals.filter((s) => s.status === 'Validated');
  const highImpactSignals = signals.filter((s) => s.impact === 'High');
  const topVendors = [...vendors].sort(
    (a, b) => (MATURITY_CONFIG[b.ai_maturity]?.score || 0) - (MATURITY_CONFIG[a.ai_maturity]?.score || 0)
  );

  if (loading)
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400">Loading tracker...</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ── TOP NAV ── */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <div>
              <h1 className="text-lg font-bold text-white">ERP Competitive Tracker</h1>
              <p className="text-xs text-slate-500">by Jean Fulop · {new Date().toLocaleDateString('en-AU')}</p>
            </div>
            <nav className="flex gap-1">
              {[
                { key: 'dashboard', label: 'Dashboard', icon: <TrendingUp size={15} /> },
                { key: 'signals', label: `Signals (${signals.length})`, icon: <Radio size={15} /> },
                { key: 'editor', label: 'Editor', icon: <Edit2 size={15} /> }
              ].map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    tab === key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowHelp(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <HelpCircle size={15} /> Help
            </button>

            <button
              onClick={downloadAsJSON}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <Download size={15} /> Export
            </button>

            {/* ✅ AI Update (gated) */}
            <button
              onClick={handleAiUpdate}
              disabled={aiUpdating || !aiUpdateEnabled}
              title={!aiUpdateEnabled ? 'AI Update is disabled' : undefined}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${aiUpdateEnabled ? 'bg-teal-600 hover:bg-teal-700' : 'bg-slate-700'}
                ${(aiUpdating || !aiUpdateEnabled) ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <RefreshCw size={15} className={aiUpdating ? 'animate-spin' : ''} />
              {aiUpdating ? 'Updating...' : 'AI Update'}
            </button>
          </div>
        </div>
      </header>

      {/* ── HELP MODAL ── */}
      {showHelp && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-slate-800 sticky top-0 bg-slate-900 rounded-t-2xl">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <HelpCircle size={20} className="text-blue-400" /> How to use this tracker
              </h2>
              <button onClick={() => setShowHelp(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
                  <BarChart2 size={16} /> What is this tracker?
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  This is a competitive intelligence tool built for the Product Management team. It tracks how major ERP
                  vendors (NetSuite, SAP, Microsoft Dynamics, Oracle) are positioning their AI capabilities — and helps
                  you spot early market trends before they become obvious. Use it to inform roadmap decisions, prepare
                  executive briefings, and stay ahead of competitor moves.
                </p>
              </div>

              <div>
                <h3 className="text-blue-400 font-semibold mb-3 flex items-center gap-2">
                  <BookOpen size={16} /> The three tabs
                </h3>
                <div className="space-y-3">
                  {[
                    {
                      tab: 'Dashboard',
                      color: 'text-blue-300',
                      desc: 'Your high-level view. Shows KPI cards (click them to filter Signals), vendor AI maturity rankings, and strategic opportunities vs threats. Start here for a quick read of the competitive landscape.'
                    },
                    {
                      tab: 'Signals',
                      color: 'text-purple-300',
                      desc: 'Your weak signals journal. Log observations from customer calls, release notes, analyst reports, or anything that hints at where the market is heading. Rate confidence and impact, then validate or dismiss over time.'
                    },
                    {
                      tab: 'Editor',
                      color: 'text-slate-300',
                      desc: 'Manage vendor data manually. Update AI maturity ratings, add/remove capabilities, log sources, and write strategic notes per vendor. Use this after researching a competitor.'
                    }
                  ].map(({ tab, color, desc }) => (
                    <div key={tab} className="bg-slate-800 rounded-xl p-4">
                      <div className={`font-semibold text-sm ${color} mb-1`}>{tab}</div>
                      <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
                  <Radio size={16} /> Logging weak signals
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-3">
                  Signals are logged <strong className="text-white">manually by you</strong> in the Signals tab. Log an
                  observation as <strong className="text-white">Monitoring</strong> when you first spot it. Mark it{' '}
                  <strong className="text-white">Validated</strong> if it proves true, or{' '}
                  <strong className="text-white">Invalidated</strong> if it doesn&apos;t. Validated signals surface
                  automatically on the Dashboard.
                </p>
                <p className="text-slate-400 text-sm mb-2">Good signals to log:</p>
                <ul className="space-y-1.5">
                  {[
                    'A customer asks about a feature a competitor just announced',
                    'A vendor quietly changes their pricing or packaging',
                    'A partner starts recommending a competitor more often',
                    'An analyst mentions a market shift in passing'
                  ].map((ex, i) => (
                    <li key={i} className="text-slate-400 text-sm flex items-start gap-2">
                      <span className="text-purple-400 mt-0.5">→</span>
                      {ex}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
                  <Cpu size={16} /> AI Update button
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  The AI Update button attempts to refresh <strong className="text-white">vendor capabilities and notes</strong>{' '}
                  in the Editor using the Anthropic API. It only updates vendor data — it does <strong className="text-white">not</strong>{' '}
                  log signals for you. Signals always require manual input.
                </p>
                {!aiUpdateEnabled && (
                  <p className="text-slate-400 text-sm mt-2">
                    <strong className="text-white">Note:</strong> AI Update is currently disabled in this environment.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Everything below here is unchanged from your original file */}
        {/* ... */}
        {/* Keep the rest of your component as-is (Dashboard / Signals / Editor tabs) */}
      </main>
    </div>
  );
}