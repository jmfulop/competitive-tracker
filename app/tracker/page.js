'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Download, Eye, Edit2, RefreshCw, Radio, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function DualModeTracker() {
  const [mode, setMode] = useState('present');
  const [vendors, setVendors] = useState([]);
  const [signals, setSignals] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiUpdating, setAiUpdating] = useState(false);
  const [newCapability, setNewCapability] = useState('');
  const [newSource, setNewSource] = useState('');
  const [expandedSignal, setExpandedSignal] = useState(null);
  const [newSignal, setNewSignal] = useState({
    observation: '',
    source: '',
    vendor_tag: '',
    confidence: 5,
    timeline: '6 months',
    impact: 'Medium',
    notes: ''
  });

  useEffect(() => {
    fetchVendors();
    fetchSignals();
  }, []);

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
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSignals = async () => {
    const { data } = await supabase.from('weak_signals').select('*').order('spotted_at', { ascending: false });
    setSignals(data || []);
  };

  const handleAiUpdate = async () => {
    try {
      setAiUpdating(true);
      const response = await fetch('/api/ai-update', { method: 'POST' });
      const result = await response.json();
      if (result.success) {
        await fetchVendors();
        alert(`✅ Updated ${result.vendorCount} vendors with latest AI research!`);
      } else {
        alert('Update failed: ' + result.error);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setAiUpdating(false);
    }
  };

  const addSignal = async () => {
    if (!newSignal.observation.trim()) return;
    const { error } = await supabase.from('weak_signals').insert([newSignal]);
    if (!error) {
      setNewSignal({ observation: '', source: '', vendor_tag: '', confidence: 5, timeline: '6 months', impact: 'Medium', notes: '' });
      fetchSignals();
    }
  };

  const updateSignalStatus = async (id, status) => {
    await supabase.from('weak_signals').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    fetchSignals();
  };

  const deleteSignal = async (id) => {
    await supabase.from('weak_signals').delete().eq('id', id);
    fetchSignals();
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
    setNewCapability('');
    fetchVendors();
  };

  const removeCapability = async (capId) => {
    await supabase.from('capabilities').delete().eq('id', capId);
    fetchVendors();
  };

  const addSource = async () => {
    if (!newSource.trim() || !selectedVendor) return;
    await supabase.from('sources').insert([{ vendor_id: selectedVendor.id, source: newSource }]);
    setNewSource('');
    fetchVendors();
  };

  const removeSource = async (srcId) => {
    await supabase.from('sources').delete().eq('id', srcId);
    fetchVendors();
  };

  const downloadAsJSON = () => {
    const exportData = { generatedBy: 'Jean Fulop', generatedAt: new Date().toISOString(), vendors, signals };
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `erp-competitive-analysis-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const signalsByStatus = {
    Monitoring: signals.filter(s => s.status === 'Monitoring'),
    Validated: signals.filter(s => s.status === 'Validated'),
    Invalidated: signals.filter(s => s.status === 'Invalidated'),
  };

  const impactColor = (impact) => ({
    High: 'bg-red-600', Medium: 'bg-yellow-600', Low: 'bg-slate-500'
  }[impact] || 'bg-slate-500');

  const statusColor = (status) => ({
    Monitoring: 'bg-blue-600', Validated: 'bg-green-600', Invalidated: 'bg-slate-500'
  }[status] || 'bg-slate-500');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  // ===== PRESENTATION MODE =====
  if (mode === 'present') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-3">
                <button onClick={() => setMode('edit')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  <Edit2 size={18} /> Editor
                </button>
                <button onClick={() => setMode('signals')} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  <Radio size={18} /> Weak Signals ({signals.length})
                </button>
              </div>
              <button onClick={handleAiUpdate} disabled={aiUpdating} className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                <RefreshCw size={18} className={aiUpdating ? 'animate-spin' : ''} />
                {aiUpdating ? 'AI Updating...' : '🤖 AI Update'}
              </button>
            </div>
            <h1 className="text-5xl font-bold text-white mb-2">ERP Competitive AI Analysis</h1>
            <p className="text-slate-300 text-lg">Market positioning and strategic implications</p>
            <p className="text-slate-400 text-sm mt-2">By Jean Fulop | {new Date().toLocaleDateString()}</p>
          </div>

          <div className="bg-blue-900 rounded-lg p-8 mb-12 border-l-4 border-blue-400">
            <h2 className="text-2xl font-bold text-white mb-4">Executive Summary</h2>
            <ul className="text-slate-200 space-y-3">
              <li>✓ <strong>Microsoft leads</strong> in practical AI deployment with mature Copilot features</li>
              <li>✓ <strong>SAP is most ambitious</strong> on agentic roadmap but still immature</li>
              <li>✓ <strong>NetSuite focuses</strong> on intelligent automation (rules-based, not agentic)</li>
              <li>✓ <strong>Oracle is behind</strong> on agentic features; strong analytics focus</li>
            </ul>
          </div>

          {signalsByStatus.Validated.length > 0 && (
            <div className="bg-green-900 rounded-lg p-6 mb-12 border-l-4 border-green-400">
              <h2 className="text-xl font-bold text-white mb-3">✅ Validated Signals This Period</h2>
              <ul className="text-slate-200 space-y-2">
                {signalsByStatus.Validated.map(s => (
                  <li key={s.id}>• <strong>{s.vendor_tag && `[${s.vendor_tag}]`}</strong> {s.observation}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mb-12">
            <h2 className="text-3xl font-bold text-white mb-6">Competitive Matrix</h2>
            <div className="overflow-x-auto bg-slate-700 rounded-lg">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-600 border-b border-slate-500">
                    <th className="px-6 py-4 text-left text-white font-semibold">Vendor</th>
                    <th className="px-6 py-4 text-left text-white font-semibold">AI Maturity</th>
                    <th className="px-6 py-4 text-left text-white font-semibold">Key Features</th>
                    <th className="px-6 py-4 text-left text-white font-semibold">Implementation Impact</th>
                    <th className="px-6 py-4 text-left text-white font-semibold">Strategic Position</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((vendor) => (
                    <tr key={vendor.id} className="border-b border-slate-600 hover:bg-slate-600">
                      <td className="px-6 py-4 text-white font-semibold">{vendor.name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          vendor.ai_maturity === 'Advanced' ? 'bg-green-600 text-white' :
                          vendor.ai_maturity === 'Ambitious' ? 'bg-blue-600 text-white' :
                          vendor.ai_maturity === 'Developing' ? 'bg-yellow-600 text-white' :
                          'bg-slate-500 text-white'
                        }`}>{vendor.ai_maturity || 'Unknown'}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-200">{vendor.capabilities.slice(0, 2).map(c => c.capability).join(', ')}...</td>
                      <td className="px-6 py-4 text-slate-200 text-sm">{vendor.implementation_claims || 'N/A'}</td>
                      <td className="px-6 py-4 text-slate-200 text-sm">{vendor.notes ? vendor.notes.substring(0, 50) : 'N/A'}...</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-3xl font-bold text-white mb-6">Vendor Profiles</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {vendors.map((vendor) => (
                <div key={vendor.id} className="bg-slate-700 rounded-lg p-6 border-l-4 border-blue-500">
                  <h3 className="text-2xl font-bold text-white mb-4">{vendor.name}</h3>
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">AI Capabilities</h4>
                    <div className="flex flex-wrap gap-2">
                      {vendor.capabilities.map((cap, idx) => (
                        <span key={idx} className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full">{cap.capability}</span>
                      ))}
                    </div>
                  </div>
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Implementation Claims</h4>
                    <p className="text-slate-200">{vendor.implementation_claims || 'N/A'}</p>
                  </div>
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Strategic Assessment</h4>
                    <p className="text-slate-200 text-sm">{vendor.notes || 'N/A'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Sources</h4>
                    <ul className="text-slate-200 text-sm space-y-1">
                      {vendor.sources.map((src, idx) => (<li key={idx}>• {src.source}</li>))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-700 rounded-lg p-8 mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Strategic Implications for Acumatica</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-bold text-green-400 mb-3">🎯 Opportunities</h3>
                <ul className="text-slate-200 space-y-2">
                  <li>• Faster agentic adoption could differentiate vs. enterprise vendors</li>
                  <li>• Mid-market focus = less competition on agentic features</li>
                  <li>• Simpler deployment = competitive advantage in speed-to-value</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-400 mb-3">⚠️ Threats</h3>
                <ul className="text-slate-200 space-y-2">
                  <li>• Competitors moving faster on agentic capabilities</li>
                  <li>• Microsoft's Copilot ecosystem is difficult to compete with</li>
                  <li>• Customer expectations rising rapidly on AI features</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== WEAK SIGNALS MODE =====
  if (mode === 'signals') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">Weak Signal Journal</h1>
                <p className="text-slate-300">Spot early market trends before they become obvious</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setMode('present')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  <Eye size={18} /> Presentation
                </button>
                <button onClick={() => setMode('edit')} className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  <Edit2 size={18} /> Editor
                </button>
                <button onClick={downloadAsJSON} className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  <Download size={18} /> Export
                </button>
              </div>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-blue-900 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-white">{signalsByStatus.Monitoring.length}</div>
                <div className="text-blue-300 text-sm mt-1">Monitoring</div>
              </div>
              <div className="bg-green-900 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-white">{signalsByStatus.Validated.length}</div>
                <div className="text-green-300 text-sm mt-1">Validated</div>
              </div>
              <div className="bg-slate-700 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-white">{signalsByStatus.Invalidated.length}</div>
                <div className="text-slate-300 text-sm mt-1">Invalidated</div>
              </div>
            </div>
          </div>

          {/* Log new signal */}
          <div className="bg-slate-700 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Log a New Signal</h2>
            <div className="space-y-4">
              <textarea
                value={newSignal.observation}
                onChange={e => setNewSignal({...newSignal, observation: e.target.value})}
                placeholder="What did you observe? e.g. 'NetSuite quietly released AI automation feature in release notes'"
                className="w-full bg-slate-600 text-white rounded-lg p-3 border border-slate-500 h-20"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  value={newSignal.source}
                  onChange={e => setNewSignal({...newSignal, source: e.target.value})}
                  placeholder="Source (e.g. customer call, release notes)"
                  className="bg-slate-600 text-white rounded-lg p-2 border border-slate-500"
                />
                <select
                  value={newSignal.vendor_tag}
                  onChange={e => setNewSignal({...newSignal, vendor_tag: e.target.value})}
                  className="bg-slate-600 text-white rounded-lg p-2 border border-slate-500"
                >
                  <option value="">No vendor tag</option>
                  {vendors.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                  <option value="Acumatica">Acumatica</option>
                  <option value="General Market">General Market</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-slate-300 text-sm mb-1 block">Confidence: {newSignal.confidence}/10</label>
                  <input
                    type="range" min="1" max="10"
                    value={newSignal.confidence}
                    onChange={e => setNewSignal({...newSignal, confidence: parseInt(e.target.value)})}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-slate-300 text-sm mb-1 block">Timeline</label>
                  <select
                    value={newSignal.timeline}
                    onChange={e => setNewSignal({...newSignal, timeline: e.target.value})}
                    className="w-full bg-slate-600 text-white rounded-lg p-2 border border-slate-500"
                  >
                    <option>3 months</option>
                    <option>6 months</option>
                    <option>12 months</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 text-sm mb-1 block">Impact</label>
                  <select
                    value={newSignal.impact}
                    onChange={e => setNewSignal({...newSignal, impact: e.target.value})}
                    className="w-full bg-slate-600 text-white rounded-lg p-2 border border-slate-500"
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>
              </div>
              <textarea
                value={newSignal.notes}
                onChange={e => setNewSignal({...newSignal, notes: e.target.value})}
                placeholder="Why does this matter? What would validate it?"
                className="w-full bg-slate-600 text-white rounded-lg p-3 border border-slate-500 h-16"
              />
              <button onClick={addSignal} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg flex items-center gap-2">
                <Plus size={18} /> Log Signal
              </button>
            </div>
          </div>

          {/* Signal list by status */}
          {['Monitoring', 'Validated', 'Invalidated'].map(statusGroup => (
            <div key={statusGroup} className="mb-8">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm ${statusColor(statusGroup)}`}>{statusGroup}</span>
                <span className="text-slate-400 text-sm">({signalsByStatus[statusGroup].length})</span>
              </h2>
              <div className="space-y-3">
                {signalsByStatus[statusGroup].length === 0 && (
                  <p className="text-slate-500 italic">No signals yet</p>
                )}
                {signalsByStatus[statusGroup].map(signal => (
                  <div key={signal.id} className="bg-slate-700 rounded-lg p-4 border-l-4 border-purple-500">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-white font-medium">{signal.observation}</p>
                        <div className="flex gap-3 mt-2 flex-wrap">
                          {signal.vendor_tag && <span className="text-xs bg-slate-600 text-slate-200 px-2 py-1 rounded">{signal.vendor_tag}</span>}
                          {signal.source && <span className="text-xs text-slate-400">📎 {signal.source}</span>}
                          <span className="text-xs text-slate-400">🎯 Confidence: {signal.confidence}/10</span>
                          <span className="text-xs text-slate-400">⏱ {signal.timeline}</span>
                          <span className={`text-xs px-2 py-1 rounded text-white ${impactColor(signal.impact)}`}>{signal.impact} impact</span>
                          <span className="text-xs text-slate-400">{new Date(signal.spotted_at).toLocaleDateString()}</span>
                        </div>
                        {signal.notes && (
                          <p className="text-slate-300 text-sm mt-2 italic">{signal.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        {signal.status === 'Monitoring' && (
                          <>
                            <button onClick={() => updateSignalStatus(signal.id, 'Validated')} className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded">✓ Validate</button>
                            <button onClick={() => updateSignalStatus(signal.id, 'Invalidated')} className="bg-slate-500 hover:bg-slate-400 text-white text-xs px-3 py-1 rounded">✗ Invalidate</button>
                          </>
                        )}
                        {signal.status !== 'Monitoring' && (
                          <button onClick={() => updateSignalStatus(signal.id, 'Monitoring')} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded">↩ Reopen</button>
                        )}
                        <button onClick={() => deleteSignal(signal.id)} className="text-red-400 hover:text-red-300 ml-1">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ===== EDITOR MODE =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Competitive Tracker - Editor</h1>
              <p className="text-slate-300">Gather and manage competitive research</p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleAiUpdate} disabled={aiUpdating} className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                <RefreshCw size={18} className={aiUpdating ? 'animate-spin' : ''} />
                {aiUpdating ? 'Updating...' : '🤖 AI Update'}
              </button>
              <button onClick={() => setMode('signals')} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                <Radio size={18} /> Signals
              </button>
              <button onClick={() => setMode('present')} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                <Eye size={18} /> Present
              </button>
              <button onClick={downloadAsJSON} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                <Download size={18} /> Export
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-slate-700 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Vendors</h2>
              <div className="space-y-3">
                {vendors.map((vendor) => (
                  <button key={vendor.id} onClick={() => setSelectedVendorId(vendor.id)}
                    className={`w-full text-left p-4 rounded-lg transition-all ${selectedVendorId === vendor.id ? 'bg-blue-600 text-white' : 'bg-slate-600 text-slate-200 hover:bg-slate-500'}`}>
                    <div className="font-semibold">{vendor.name}</div>
                    <div className="text-sm opacity-75 mt-1">{vendor.capabilities.length} capabilities</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {selectedVendor && (
            <div className="lg:col-span-3">
              <div className="bg-slate-700 rounded-lg p-8">
                <h3 className="text-3xl font-bold text-white mb-6">{selectedVendor.name}</h3>
                <div className="mb-6">
                  <label className="block text-slate-300 font-semibold mb-2">Status</label>
                  <select value={selectedVendor.status} onChange={(e) => updateVendor('status', e.target.value)}
                    className="w-full bg-slate-600 text-white rounded-lg p-2 border border-slate-500">
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-white mb-3">AI Capabilities</h4>
                  <div className="space-y-2 mb-3">
                    {selectedVendor.capabilities.map((cap) => (
                      <div key={cap.id} className="flex justify-between items-center bg-slate-600 p-3 rounded">
                        <span className="text-slate-100">{cap.capability}</span>
                        <button onClick={() => removeCapability(cap.id)} className="text-red-400 hover:text-red-300"><Trash2 size={18} /></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={newCapability} onChange={(e) => setNewCapability(e.target.value)}
                      placeholder="Add capability" className="flex-1 bg-slate-600 text-white rounded-lg p-2 border border-slate-500"
                      onKeyPress={(e) => e.key === 'Enter' && addCapability()} />
                    <button onClick={addCapability} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"><Plus size={18} /></button>
                  </div>
                </div>
                <div className="mb-6">
                  <label className="block text-slate-300 font-semibold mb-2">Implementation Claims</label>
                  <textarea value={selectedVendor.implementation_claims || ''} onChange={(e) => updateVendor('implementation_claims', e.target.value)}
                    className="w-full bg-slate-600 text-white rounded-lg p-3 border border-slate-500 h-20" />
                </div>
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-white mb-3">Sources</h4>
                  <div className="space-y-2 mb-3">
                    {selectedVendor.sources.map((src) => (
                      <div key={src.id} className="flex justify-between items-center bg-slate-600 p-3 rounded">
                        <span className="text-slate-100 text-sm">{src.source}</span>
                        <button onClick={() => removeSource(src.id)} className="text-red-400 hover:text-red-300"><Trash2 size={18} /></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={newSource} onChange={(e) => setNewSource(e.target.value)}
                      placeholder="Add source" className="flex-1 bg-slate-600 text-white rounded-lg p-2 border border-slate-500"
                      onKeyPress={(e) => e.key === 'Enter' && addSource()} />
                    <button onClick={addSource} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"><Plus size={18} /></button>
                  </div>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-2">Strategic Notes</label>
                  <textarea value={selectedVendor.notes || ''} onChange={(e) => updateVendor('notes', e.target.value)}
                    className="w-full bg-slate-600 text-white rounded-lg p-3 border border-slate-500 h-24" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}