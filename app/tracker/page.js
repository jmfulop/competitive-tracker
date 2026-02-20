'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Download, Edit2, RefreshCw, Radio, AlertTriangle, TrendingUp, Shield, Zap, X, HelpCircle, BookOpen, BarChart2, Cpu, CheckCircle, PenLine } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const MATURITY_CONFIG = {
  'Advanced':   { color: 'bg-green-500',  text: 'text-green-400',  bar: 'w-full',  score: 4, tooltip: 'Fully deployed AI at scale, proven in production across modules.' },
  'Ambitious':  { color: 'bg-blue-500',   text: 'text-blue-400',   bar: 'w-3/4',   score: 3, tooltip: 'Strong AI strategy, but real-world deployment is still catching up.' },
  'Developing': { color: 'bg-yellow-500', text: 'text-yellow-400', bar: 'w-1/2',   score: 2, tooltip: 'Early stage AI — limited features in production, roadmap in progress.' },
  'Limited':    { color: 'bg-slate-500',  text: 'text-slate-400',  bar: 'w-1/4',   score: 1, tooltip: 'Minimal AI capability — basic automation or early experimentation only.' },
};

const IMPACT_CONFIG = {
  High:   { color: 'bg-red-500/20 text-red-300 border-red-500/30',    dot: 'bg-red-400',    priority: 1 },
  Medium: { color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', dot: 'bg-yellow-400', priority: 2 },
  Low:    { color: 'bg-slate-500/20 text-slate-300 border-slate-500/30',  dot: 'bg-slate-400',  priority: 3 },
};

const STATUS_CONFIG = {
  Monitoring:  { color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  Validated:   { color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  Invalidated: { color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
};

const EMPTY_SIGNAL = { observation: '', source: '', vendor_tag: '', confidence: 50, timeline: '6 months', impact: 'Medium', notes: '', status: 'Monitoring' };

export default function CompetitiveTracker() {
  const [tab, setTab] = useState('dashboard');
  const [vendors, setVendors] = useState([]);
  const [signals, setSignals] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiUpdating, setAiUpdating] = useState(false);
  const [lastAiUpdate, setLastAiUpdate] = useState(null); // ── NEW: track last AI update time
  const [newCapability, setNewCapability] = useState('');
  const [newSource, setNewSource] = useState('');
  const [signalFilter, setSignalFilter] = useState('All');
  const [impactFilter, setImpactFilter] = useState('All');
  const [showHelp, setShowHelp] = useState(false);
  const [toast, setToast] = useState(null); // ── NEW: { message, type }
  const [editingSignal, setEditingSignal] = useState(null); // ── NEW: signal being edited
  const [newSignal, setNewSignal] = useState(EMPTY_SIGNAL);

  useEffect(() => { fetchVendors(); fetchSignals(); }, []);

  // ── Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const { data: vendorsData } = await supabase.from('vendors').select('*');
      const vendorsWithData = await Promise.all(
        vendorsData.map(async (vendor) => {
          const { data: caps } = await supabase.from('capabilities').select('*').eq('vendor_id', vendor.id);
          const { data: srcs } = await supabase.from('sources').select('*').eq('vendor_id', vendor.id);
          return { ...vendor, capabilities: caps || [], sources: srcs || [] };
        })
      );
      setVendors(vendorsWithData);
      if (vendorsWithData.length > 0) setSelectedVendorId(vendorsWithData[0].id);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchSignals = async () => {
    const { data } = await supabase.from('weak_signals').select('*').order('spotted_at', { ascending: false });
    setSignals(data || []);
  };

  const handleAiUpdate = async () => {
    const pin = window.prompt('Enter PIN to run AI Update:');
    if (pin !== '0832') {
      if (pin !== null) alert('Incorrect PIN.');
      return;
    }
    try {
      setAiUpdating(true);
      const res = await fetch('/api/ai-update', { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        await fetchVendors();
        setLastAiUpdate(new Date()); // ── NEW: record update time
        showToast(`✅ Updated ${result.vendorCount} vendors!`);
      } else {
        showToast('Update failed: ' + result.error, 'error');
      }
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    finally { setAiUpdating(false); }
  };

  const addSignal = async () => {
    if (!newSignal.observation.trim()) return;
    await supabase.from('weak_signals').insert([newSignal]);
    setNewSignal(EMPTY_SIGNAL);
    await fetchSignals();
    showToast('✓ Signal logged successfully'); // ── NEW: success feedback
  };

  // ── NEW: save edits to an existing signal
  const saveEditedSignal = async () => {
    if (!editingSignal) return;
    await supabase.from('weak_signals').update({
      observation: editingSignal.observation,
      source: editingSignal.source,
      vendor_tag: editingSignal.vendor_tag,
      confidence: editingSignal.confidence,
      timeline: editingSignal.timeline,
      impact: editingSignal.impact,
      notes: editingSignal.notes,
      updated_at: new Date().toISOString(),
    }).eq('id', editingSignal.id);
    setEditingSignal(null);
    await fetchSignals();
    showToast('✓ Signal updated');
  };

  const updateSignalStatus = async (id, status) => {
    await supabase.from('weak_signals').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    fetchSignals();
  };

  // ── NEW: delete with confirmation
  const deleteSignal = async (id) => {
    if (!window.confirm('Delete this signal? This cannot be undone.')) return;
    await supabase.from('weak_signals').delete().eq('id', id);
    await fetchSignals();
    showToast('Signal deleted', 'error');
  };

  const selectedVendor = vendors.find(v => v.id === selectedVendorId);

  const updateVendor = async (field, value) => {
    if (!selectedVendor) return;
    await supabase.from('vendors').update({ [field]: value, updated_at: new Date() }).eq('id', selectedVendor.id);
    fetchVendors();
  };

  const addCapability = async () => {
    if (!newCapability.trim() || !selectedVendor) return;
    await supabase.from('capabilities').insert([{ vendor_id: selectedVendor.id, capability: newCapability }]);
    setNewCapability(''); fetchVendors();
  };

  const removeCapability = async (id) => {
    await supabase.from('capabilities').delete().eq('id', id); fetchVendors();
  };

  const addSource = async () => {
    if (!newSource.trim() || !selectedVendor) return;
    await supabase.from('sources').insert([{ vendor_id: selectedVendor.id, source: newSource }]);
    setNewSource(''); fetchVendors();
  };

  const removeSource = async (id) => {
    await supabase.from('sources').delete().eq('id', id); fetchVendors();
  };

  const downloadAsJSON = () => {
    const blob = new Blob([JSON.stringify({ vendors, signals }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `erp-tracker-${new Date().toISOString().split('T')[0]}.json`; a.click();
  };

  const goToSignals = (statusFilter = 'All', impactF = 'All') => {
    setTab('signals'); setSignalFilter(statusFilter); setImpactFilter(impactF);
  };

  const clearFilters = () => { setSignalFilter('All'); setImpactFilter('All'); };
  const hasActiveFilter = signalFilter !== 'All' || impactFilter !== 'All';

  const sortedSignals = [...signals].sort((a, b) => (IMPACT_CONFIG[a.impact]?.priority || 3) - (IMPACT_CONFIG[b.impact]?.priority || 3));
  const filteredSignals = sortedSignals
    .filter(s => signalFilter === 'All' || s.status === signalFilter)
    .filter(s => impactFilter === 'All' || s.impact === impactFilter);

  const validatedSignals = signals.filter(s => s.status === 'Validated');
  const highImpactSignals = signals.filter(s => s.impact === 'High');
  const topVendors = [...vendors].sort((a, b) => (MATURITY_CONFIG[b.ai_maturity]?.score || 0) - (MATURITY_CONFIG[a.ai_maturity]?.score || 0));

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400">Loading tracker...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* ── TOAST NOTIFICATION ── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium transition-all ${
          toast.type === 'error'
            ? 'bg-red-950 border-red-700 text-red-200'
            : 'bg-green-950 border-green-700 text-green-200'
        }`}>
          <CheckCircle size={16} />
          {toast.message}
        </div>
      )}

      {/* ── EDIT SIGNAL MODAL ── */}
      {editingSignal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={() => setEditingSignal(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-5 border-b border-slate-800">
              <h2 className="font-bold text-white flex items-center gap-2"><PenLine size={16} className="text-blue-400" /> Edit Signal</h2>
              <button onClick={() => setEditingSignal(null)} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              <textarea value={editingSignal.observation}
                onChange={e => setEditingSignal({...editingSignal, observation: e.target.value})}
                className="w-full bg-slate-800 text-white rounded-lg p-3 border border-slate-700 h-20 text-sm resize-none focus:outline-none focus:border-blue-500" />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={editingSignal.source || ''}
                  onChange={e => setEditingSignal({...editingSignal, source: e.target.value})}
                  placeholder="Source"
                  className="bg-slate-800 text-white rounded-lg p-2.5 border border-slate-700 text-sm focus:outline-none focus:border-blue-500" />
                <select value={editingSignal.vendor_tag || ''}
                  onChange={e => setEditingSignal({...editingSignal, vendor_tag: e.target.value})}
                  className="bg-slate-800 text-white rounded-lg p-2.5 border border-slate-700 text-sm focus:outline-none focus:border-blue-500">
                  <option value="">No vendor tag</option>
                  {vendors.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                  <option value="Acumatica">Acumatica</option>
                  <option value="General Market">General Market</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 text-xs mb-1.5 block">Confidence: {editingSignal.confidence}%</label>
                  <input type="range" min="0" max="100" value={editingSignal.confidence}
                    onChange={e => setEditingSignal({...editingSignal, confidence: parseInt(e.target.value)})}
                    className="w-full accent-blue-500" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1.5 block">Timeline</label>
                  <select value={editingSignal.timeline}
                    onChange={e => setEditingSignal({...editingSignal, timeline: e.target.value})}
                    className="w-full bg-slate-800 text-white rounded-lg p-2 border border-slate-700 text-sm focus:outline-none focus:border-blue-500">
                    <option>Now</option><option>3 months</option><option>6 months</option><option>12 months</option><option>12-18 months</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1.5 block">Impact</label>
                  <select value={editingSignal.impact}
                    onChange={e => setEditingSignal({...editingSignal, impact: e.target.value})}
                    className="w-full bg-slate-800 text-white rounded-lg p-2 border border-slate-700 text-sm focus:outline-none focus:border-blue-500">
                    <option>Low</option><option>Medium</option><option>High</option>
                  </select>
                </div>
              </div>
              <textarea value={editingSignal.notes || ''}
                onChange={e => setEditingSignal({...editingSignal, notes: e.target.value})}
                placeholder="Why does this matter? What would validate it?"
                className="w-full bg-slate-800 text-white rounded-lg p-3 border border-slate-700 h-14 text-sm resize-none focus:outline-none focus:border-blue-500" />
              <div className="flex gap-2 justify-end pt-1">
                <button onClick={() => setEditingSignal(null)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-all">Cancel</button>
                <button onClick={saveEditedSignal} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HELP MODAL ── */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={() => setShowHelp(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-slate-800 sticky top-0 bg-slate-900 rounded-t-2xl">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><HelpCircle size={20} className="text-blue-400" /> How to use this tracker</h2>
              <button onClick={() => setShowHelp(false)} className="text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-blue-400 font-semibold mb-2 flex items-center gap-2"><BarChart2 size={16} /> What is this tracker?</h3>
                <p className="text-slate-300 text-sm leading-relaxed">This is a competitive intelligence tool built for the Product Management team. It tracks how major ERP vendors are positioning their AI capabilities and helps you spot early market trends before they become obvious. Use it to inform roadmap decisions, prepare executive briefings, and stay ahead of competitor moves.</p>
              </div>
              <div>
                <h3 className="text-blue-400 font-semibold mb-3 flex items-center gap-2"><BookOpen size={16} /> The three tabs</h3>
                <div className="space-y-3">
                  {[
                    { tab: 'Dashboard', color: 'text-blue-300', desc: 'Your high-level view. Shows KPI cards (click them to filter Signals), vendor AI maturity rankings, and strategic opportunities vs threats. Start here for a quick read of the competitive landscape.' },
                    { tab: 'Signals', color: 'text-purple-300', desc: 'Your weak signals journal. Log observations from customer calls, release notes, analyst reports, or anything that hints at where the market is heading. Rate confidence and impact, then validate or dismiss over time.' },
                    { tab: 'Editor', color: 'text-slate-300', desc: 'Manage vendor data manually. Update AI maturity ratings, add/remove capabilities, log sources, and write strategic notes per vendor. Use this after researching a competitor.' },
                  ].map(({ tab, color, desc }) => (
                    <div key={tab} className="bg-slate-800 rounded-xl p-4">
                      <div className={`font-semibold text-sm ${color} mb-1`}>{tab}</div>
                      <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-blue-400 font-semibold mb-2 flex items-center gap-2"><Radio size={16} /> Logging weak signals</h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-3">Signals are logged <strong className="text-white">manually by you</strong> in the Signals tab. Log an observation as <strong className="text-white">Monitoring</strong> when you first spot it. Mark it <strong className="text-white">Validated</strong> if it proves true, or <strong className="text-white">Invalidated</strong> if it doesn't. Validated signals surface automatically on the Dashboard.</p>
                <p className="text-slate-400 text-sm mb-2">Good signals to log:</p>
                <ul className="space-y-1.5">
                  {['A customer asks about a feature a competitor just announced','A vendor quietly changes their pricing or packaging','A partner starts recommending a competitor more often','An analyst mentions a market shift in passing'].map((ex, i) => (
                    <li key={i} className="text-slate-400 text-sm flex items-start gap-2"><span className="text-purple-400 mt-0.5">→</span>{ex}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-blue-400 font-semibold mb-2 flex items-center gap-2"><Cpu size={16} /> AI Update button</h3>
                <p className="text-slate-300 text-sm leading-relaxed">The AI Update button refreshes <strong className="text-white">vendor capabilities and notes</strong> using the Claude AI API. It only updates vendor data — it does <strong className="text-white">not</strong> log signals for you. Signals always require manual input. PIN protected — contact the tracker admin if you need access.</p>
              </div>
            </div>
          </div>
        </div>
      )}

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
                { key: 'signals',   label: `Signals (${signals.length})`, icon: <Radio size={15} /> },
                { key: 'editor',    label: 'Editor', icon: <Edit2 size={15} /> },
              ].map(({ key, label, icon }) => (
                <button key={key} onClick={() => setTab(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    tab === key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}>
                  {icon}{label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex gap-3 items-center">
            <button onClick={() => setShowHelp(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
              <HelpCircle size={15} /> Help
            </button>
            <button onClick={downloadAsJSON} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
              <Download size={15} /> Export
            </button>
            {/* ── AI Update with last updated timestamp */}
            <div className="flex flex-col items-end">
              <button onClick={handleAiUpdate} disabled={aiUpdating}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 hover:bg-teal-700 disabled:opacity-50 transition-all">
                <RefreshCw size={15} className={aiUpdating ? 'animate-spin' : ''} />
                {aiUpdating ? 'Updating...' : 'AI Update'}
              </button>
              {lastAiUpdate && (
                <span className="text-xs text-slate-500 mt-0.5">
                  Updated {lastAiUpdate.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* ══════════════════════════════
            DASHBOARD TAB
        ══════════════════════════════ */}
        {tab === 'dashboard' && (
          <div className="space-y-8">
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Vendors Tracked', value: vendors.length, icon: <Shield size={20} />, color: 'text-blue-400', border: 'hover:border-blue-500/50', hint: 'View vendor grid ↓', action: () => document.getElementById('vendor-grid')?.scrollIntoView({ behavior: 'smooth' }) },
                { label: 'Active Signals', value: signals.filter(s => s.status === 'Monitoring').length, icon: <Radio size={20} />, color: 'text-purple-400', border: 'hover:border-purple-500/50', hint: 'View monitoring signals →', action: () => goToSignals('Monitoring', 'All') },
                { label: 'Validated Signals', value: validatedSignals.length, icon: <TrendingUp size={20} />, color: 'text-green-400', border: 'hover:border-green-500/50', hint: 'View validated signals →', action: () => goToSignals('Validated', 'All') },
                { label: 'High Impact Threats', value: highImpactSignals.length, icon: <AlertTriangle size={20} />, color: 'text-red-400', border: 'hover:border-red-500/50', hint: 'View high impact signals →', action: () => goToSignals('All', 'High') },
              ].map(({ label, value, icon, color, border, hint, action }) => (
                <button key={label} onClick={action} className={`bg-slate-900 border border-slate-800 ${border} rounded-xl p-5 text-left transition-all cursor-pointer hover:scale-105 active:scale-100 group`}>
                  <div className={`${color} mb-3 transition-transform group-hover:scale-110`}>{icon}</div>
                  <div className="text-3xl font-bold text-white mb-1">{value}</div>
                  <div className="text-sm text-slate-400 group-hover:text-slate-300">{label}</div>
                  <div className="text-xs text-slate-600 group-hover:text-slate-500 mt-1.5 transition-colors">{hint}</div>
                </button>
              ))}
            </div>

            {validatedSignals.length > 0 && (
              <div className="bg-green-950/50 border border-green-800/50 rounded-xl p-6">
                <h2 className="text-green-400 font-semibold mb-3 flex items-center gap-2"><TrendingUp size={18} /> Validated Signals This Period</h2>
                <ul className="space-y-2">
                  {validatedSignals.map(s => (
                    <li key={s.id} className="text-slate-200 text-sm flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span>{s.vendor_tag && <strong className="text-white">[{s.vendor_tag}]</strong>} {s.observation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div id="vendor-grid">
              <h2 className="text-xl font-bold text-white mb-4">Vendor AI Maturity</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topVendors.map(vendor => {
                  const m = MATURITY_CONFIG[vendor.ai_maturity] || MATURITY_CONFIG['Limited'];
                  return (
                    <div key={vendor.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-600 transition-all">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-white">{vendor.name}</h3>
                        <span className={`relative group/badge text-xs font-semibold px-2 py-1 rounded-full ${m.color} text-white cursor-default`}>
                          {vendor.ai_maturity || 'Unknown'}
                          <span className="absolute bottom-full right-0 mb-2 w-56 bg-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 shadow-xl border border-slate-700 opacity-0 group-hover/badge:opacity-100 transition-opacity pointer-events-none z-10 leading-relaxed">
                            <strong className="text-white block mb-0.5">{vendor.ai_maturity}</strong>
                            {m.tooltip}
                          </span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 mb-4">
                        <div className={`${m.color} h-1.5 rounded-full ${m.bar}`} />
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {vendor.capabilities.slice(0, 3).map((cap, i) => (
                          <span key={i} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded-md">{cap.capability}</span>
                        ))}
                        {vendor.capabilities.length > 3 && <span className="text-xs text-slate-500 px-2 py-1">+{vendor.capabilities.length - 3} more</span>}
                      </div>
                      {vendor.capabilities.length === 0 && <p className="text-xs text-slate-500 italic mb-3">No capabilities yet — run AI Update</p>}
                      <p className="text-xs text-slate-400 line-clamp-2">{vendor.notes || 'No notes yet.'}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-green-400 font-semibold mb-4 flex items-center gap-2"><Zap size={16} /> Opportunities</h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">→</span> Faster agentic adoption could differentiate vs enterprise vendors</li>
                  <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">→</span> Mid-market focus = less competition on agentic features</li>
                  <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">→</span> Simpler deployment = competitive advantage in speed-to-value</li>
                  <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">→</span> SAP's low Joule adoption is a direct positioning opportunity</li>
                </ul>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-red-400 font-semibold mb-4 flex items-center gap-2"><AlertTriangle size={16} /> Threats</h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">→</span> Competitors moving faster on agentic capabilities</li>
                  <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">→</span> Microsoft Copilot bundling makes AI appear free to M365 customers</li>
                  <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">→</span> Customer expectations rising rapidly on AI features</li>
                  <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">→</span> Odoo growing fast as low-cost alternative in lower mid-market</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════
            SIGNALS TAB
        ══════════════════════════════ */}
        {tab === 'signals' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white">Weak Signal Journal</h2>
                {hasActiveFilter && (
                  <button onClick={clearFilters} className="flex items-center gap-1.5 px-3 py-1 bg-blue-600/20 border border-blue-500/40 text-blue-300 rounded-full text-xs font-medium hover:bg-blue-600/30 transition-all">
                    {impactFilter !== 'All' ? `${impactFilter} Impact` : ''}{impactFilter !== 'All' && signalFilter !== 'All' ? ' · ' : ''}{signalFilter !== 'All' ? signalFilter : ''}
                    <X size={12} />
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {['All', 'Monitoring', 'Validated', 'Invalidated'].map(f => (
                  <button key={f} onClick={() => setSignalFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${signalFilter === f ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{f}</button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Impact:</span>
              {['All', 'High', 'Medium', 'Low'].map(f => (
                <button key={f} onClick={() => setImpactFilter(f)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    impactFilter === f
                      ? f === 'High' ? 'bg-red-600/40 text-red-300 border border-red-500/50'
                        : f === 'Medium' ? 'bg-yellow-600/40 text-yellow-300 border border-yellow-500/50'
                        : f === 'Low' ? 'bg-slate-600 text-slate-300'
                        : 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}>{f}</button>
              ))}
              <span className="text-xs text-slate-600 ml-1">{filteredSignals.length} signal{filteredSignals.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="font-semibold text-white mb-4">Log New Signal</h3>
              <div className="space-y-3">
                <textarea value={newSignal.observation}
                  onChange={e => setNewSignal({...newSignal, observation: e.target.value})}
                  placeholder="What did you observe? Be specific — the more detail, the better..."
                  className="w-full bg-slate-800 text-white rounded-lg p-3 border border-slate-700 h-20 text-sm resize-none focus:outline-none focus:border-blue-500" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" value={newSignal.source}
                    onChange={e => setNewSignal({...newSignal, source: e.target.value})}
                    placeholder="Source (customer call, release notes, analyst report...)"
                    className="bg-slate-800 text-white rounded-lg p-2.5 border border-slate-700 text-sm focus:outline-none focus:border-blue-500" />
                  <select value={newSignal.vendor_tag}
                    onChange={e => setNewSignal({...newSignal, vendor_tag: e.target.value})}
                    className="bg-slate-800 text-white rounded-lg p-2.5 border border-slate-700 text-sm focus:outline-none focus:border-blue-500">
                    <option value="">No vendor tag</option>
                    {vendors.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                    <option value="Acumatica">Acumatica</option>
                    <option value="General Market">General Market</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-400 text-xs mb-1.5 block">Confidence: {newSignal.confidence}%</label>
                    <input type="range" min="0" max="100" value={newSignal.confidence}
                      onChange={e => setNewSignal({...newSignal, confidence: parseInt(e.target.value)})}
                      className="w-full accent-blue-500" />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs mb-1.5 block">Timeline</label>
                    <select value={newSignal.timeline}
                      onChange={e => setNewSignal({...newSignal, timeline: e.target.value})}
                      className="w-full bg-slate-800 text-white rounded-lg p-2 border border-slate-700 text-sm focus:outline-none focus:border-blue-500">
                      <option>Now</option><option>3 months</option><option>6 months</option><option>12 months</option><option>12-18 months</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs mb-1.5 block">Impact</label>
                    <select value={newSignal.impact}
                      onChange={e => setNewSignal({...newSignal, impact: e.target.value})}
                      className="w-full bg-slate-800 text-white rounded-lg p-2 border border-slate-700 text-sm focus:outline-none focus:border-blue-500">
                      <option>Low</option><option>Medium</option><option>High</option>
                    </select>
                  </div>
                </div>
                <textarea value={newSignal.notes}
                  onChange={e => setNewSignal({...newSignal, notes: e.target.value})}
                  placeholder="Why does this matter? What would validate it?"
                  className="w-full bg-slate-800 text-white rounded-lg p-3 border border-slate-700 h-14 text-sm resize-none focus:outline-none focus:border-blue-500" />
                <button onClick={addSignal}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-all">
                  <Plus size={15} /> Log Signal
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {filteredSignals.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  No signals match the current filter.{' '}
                  {hasActiveFilter && <button onClick={clearFilters} className="text-blue-400 hover:text-blue-300 underline ml-1">Clear filters</button>}
                </div>
              )}
              {filteredSignals.map(signal => {
                const impact = IMPACT_CONFIG[signal.impact] || IMPACT_CONFIG.Low;
                const status = STATUS_CONFIG[signal.status] || STATUS_CONFIG.Monitoring;
                return (
                  <div key={signal.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-600 transition-all">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {signal.vendor_tag && <span className="text-xs font-semibold bg-slate-800 text-slate-200 px-2 py-1 rounded-md">{signal.vendor_tag}</span>}
                          <span className={`text-xs font-medium px-2 py-1 rounded-md border ${impact.color}`}>
                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${impact.dot} mr-1.5`} />{signal.impact} Impact
                          </span>
                          <span className={`text-xs font-medium px-2 py-1 rounded-md border ${status.color}`}>{signal.status}</span>
                          <span className="text-xs text-slate-500">🎯 {signal.confidence}% confident</span>
                          <span className="text-xs text-slate-500">⏱ {signal.timeline}</span>
                        </div>
                        <p className="text-white font-medium mb-1">{signal.observation}</p>
                        {signal.notes && <p className="text-slate-400 text-sm italic">{signal.notes}</p>}
                        {signal.source && <p className="text-slate-500 text-xs mt-1">📎 {signal.source}</p>}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {signal.status === 'Monitoring' && <>
                          <button onClick={() => updateSignalStatus(signal.id, 'Validated')} className="bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-600/30 text-xs px-3 py-1.5 rounded-lg transition-all">✓ Validate</button>
                          <button onClick={() => updateSignalStatus(signal.id, 'Invalidated')} className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs px-3 py-1.5 rounded-lg transition-all">✗ Dismiss</button>
                        </>}
                        {signal.status !== 'Monitoring' && (
                          <button onClick={() => updateSignalStatus(signal.id, 'Monitoring')} className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-600/30 text-xs px-3 py-1.5 rounded-lg transition-all">↩ Reopen</button>
                        )}
                        {/* ── NEW: Edit button */}
                        <button onClick={() => setEditingSignal({...signal})} className="text-slate-600 hover:text-blue-400 transition-colors p-1.5"><PenLine size={15} /></button>
                        <button onClick={() => deleteSignal(signal.id)} className="text-slate-600 hover:text-red-400 transition-colors p-1.5"><Trash2 size={15} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════
            EDITOR TAB
        ══════════════════════════════ */}
        {tab === 'editor' && (
          <div className="grid grid-cols-4 gap-6">
            <div className="col-span-1 space-y-2">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Vendors</h2>
              {vendors.map(vendor => {
                const m = MATURITY_CONFIG[vendor.ai_maturity] || MATURITY_CONFIG['Limited'];
                return (
                  <button key={vendor.id} onClick={() => setSelectedVendorId(vendor.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all border ${
                      selectedVendorId === vendor.id ? 'bg-blue-600/20 border-blue-500/50 text-white' : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}>
                    <div className="font-medium text-sm">{vendor.name}</div>
                    <div className={`text-xs mt-1 ${m.text}`}>{vendor.ai_maturity || 'Unknown'}</div>
                  </button>
                );
              })}
            </div>

            {selectedVendor && (
              <div className="col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-white">{selectedVendor.name}</h2>
                  <select value={selectedVendor.ai_maturity || ''} onChange={e => updateVendor('ai_maturity', e.target.value)}
                    className="bg-slate-800 text-white rounded-lg p-2 border border-slate-700 text-sm">
                    <option value="">Select maturity</option>
                    <option>Limited</option><option>Developing</option><option>Advanced</option><option>Ambitious</option>
                  </select>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">AI Capabilities</h3>
                  <div className="space-y-2 mb-3">
                    {selectedVendor.capabilities.map(cap => (
                      <div key={cap.id} className="flex justify-between items-center bg-slate-800 p-3 rounded-lg">
                        <span className="text-slate-200 text-sm">{cap.capability}</span>
                        <button onClick={() => removeCapability(cap.id)} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={15} /></button>
                      </div>
                    ))}
                    {selectedVendor.capabilities.length === 0 && <p className="text-slate-500 text-sm italic">No capabilities yet — run AI Update or add manually</p>}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={newCapability} onChange={e => setNewCapability(e.target.value)}
                      placeholder="Add capability..." onKeyPress={e => e.key === 'Enter' && addCapability()}
                      className="flex-1 bg-slate-800 text-white rounded-lg p-2.5 border border-slate-700 text-sm focus:outline-none focus:border-blue-500" />
                    <button onClick={addCapability} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all"><Plus size={15} /></button>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Implementation Claims</h3>
                  <textarea value={selectedVendor.implementation_claims || ''} onChange={e => updateVendor('implementation_claims', e.target.value)}
                    className="w-full bg-slate-800 text-white rounded-lg p-3 border border-slate-700 h-20 text-sm resize-none focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Sources</h3>
                  <div className="space-y-2 mb-3">
                    {selectedVendor.sources.map(src => (
                      <div key={src.id} className="flex justify-between items-center bg-slate-800 p-3 rounded-lg">
                        <span className="text-slate-200 text-sm">{src.source}</span>
                        <button onClick={() => removeSource(src.id)} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={15} /></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={newSource} onChange={e => setNewSource(e.target.value)}
                      placeholder="Add source URL or title..." onKeyPress={e => e.key === 'Enter' && addSource()}
                      className="flex-1 bg-slate-800 text-white rounded-lg p-2.5 border border-slate-700 text-sm focus:outline-none focus:border-blue-500" />
                    <button onClick={addSource} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all"><Plus size={15} /></button>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Strategic Notes</h3>
                  <textarea value={selectedVendor.notes || ''} onChange={e => updateVendor('notes', e.target.value)}
                    className="w-full bg-slate-800 text-white rounded-lg p-3 border border-slate-700 h-28 text-sm resize-none focus:outline-none focus:border-blue-500" />
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}