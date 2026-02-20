'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Download, Eye, Edit2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function DualModeTracker() {
  const [mode, setMode] = useState('present');
  const [vendors, setVendors] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newCapability, setNewCapability] = useState('');
  const [newSource, setNewSource] = useState('');

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      
      const { data: vendorsData } = await supabase
        .from('vendors')
        .select('*');

      const vendorsWithData = await Promise.all(
        vendorsData.map(async (vendor) => {
          const { data: caps } = await supabase
            .from('capabilities')
            .select('*')
            .eq('vendor_id', vendor.id);

          const { data: srcs } = await supabase
            .from('sources')
            .select('*')
            .eq('vendor_id', vendor.id);

          return {
            ...vendor,
            capabilities: caps || [],
            sources: srcs || []
          };
        })
      );

      setVendors(vendorsWithData);
      if (vendorsWithData.length > 0) {
        setSelectedVendorId(vendorsWithData[0].id);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedVendor = vendors.find(v => v.id === selectedVendorId);

  const updateVendor = async (field, value) => {
    if (!selectedVendor) return;

    const { error } = await supabase
      .from('vendors')
      .update({ [field]: value, updated_at: new Date() })
      .eq('id', selectedVendor.id);

    if (!error) {
      fetchVendors();
    }
  };

  const addCapability = async () => {
    if (!newCapability.trim() || !selectedVendor) return;

    const { error } = await supabase
      .from('capabilities')
      .insert([{ vendor_id: selectedVendor.id, capability: newCapability }]);

    if (!error) {
      setNewCapability('');
      fetchVendors();
    }
  };

  const removeCapability = async (capId) => {
    const { error } = await supabase
      .from('capabilities')
      .delete()
      .eq('id', capId);

    if (!error) {
      fetchVendors();
    }
  };

  const addSource = async () => {
    if (!newSource.trim() || !selectedVendor) return;

    const { error } = await supabase
      .from('sources')
      .insert([{ vendor_id: selectedVendor.id, source: newSource }]);

    if (!error) {
      setNewSource('');
      fetchVendors();
    }
  };

  const removeSource = async (srcId) => {
    const { error } = await supabase
      .from('sources')
      .delete()
      .eq('id', srcId);

    if (!error) {
      fetchVendors();
    }
  };

  const downloadAsJSON = () => {
    const exportData = {
      generatedBy: 'Jean Fulop',
      generatedAt: new Date().toISOString(),
      vendors: vendors
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `erp-competitive-analysis-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

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
          {/* Header */}
          <div className="mb-12">
            <button
              onClick={() => setMode('edit')}
              className="mb-6 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Edit2 size={18} /> Back to Editor
            </button>
            <h1 className="text-5xl font-bold text-white mb-2">ERP Competitive AI Analysis</h1>
            <p className="text-slate-300 text-lg">Market positioning and strategic implications</p>
            <p className="text-slate-400 text-sm mt-2">By Jean Fulop | {new Date().toLocaleDateString()}</p>
          </div>

          {/* Executive Summary */}
          <div className="bg-blue-900 rounded-lg p-8 mb-12 border-l-4 border-blue-400">
            <h2 className="text-2xl font-bold text-white mb-4">Executive Summary</h2>
            <ul className="text-slate-200 space-y-3">
              <li>✓ <strong>Microsoft leads</strong> in practical AI deployment with mature Copilot features</li>
              <li>✓ <strong>SAP is most ambitious</strong> on agentic roadmap but still immature</li>
              <li>✓ <strong>NetSuite focuses</strong> on intelligent automation (rules-based, not agentic)</li>
              <li>✓ <strong>Oracle is behind</strong> on agentic features; strong analytics focus</li>
            </ul>
          </div>

          {/* Competitive Matrix */}
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
                          vendor.name === 'Microsoft Dynamics 365' ? 'bg-green-600 text-white' :
                          vendor.name === 'SAP S/4HANA Cloud' ? 'bg-blue-600 text-white' :
                          'bg-yellow-600 text-white'
                        }`}>
                          {vendor.name === 'Microsoft Dynamics 365' ? 'Advanced' : vendor.name === 'SAP S/4HANA Cloud' ? 'Ambitious' : 'Limited'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-200">
                        {vendor.capabilities.slice(0, 2).join(', ')}...
                      </td>
                      <td className="px-6 py-4 text-slate-200 text-sm">{vendor.implementation_claims || 'N/A'}</td>
                      <td className="px-6 py-4 text-slate-200 text-sm">{vendor.notes ? vendor.notes.substring(0, 50) : 'N/A'}...</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Vendor Profiles */}
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
                        <span key={idx} className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full">
                          {cap.capability}
                        </span>
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
                      {vendor.sources.map((src, idx) => (
                        <li key={idx}>• {src.source}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Takeaways */}
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

  // ===== EDITOR MODE =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Competitive Tracker - Editor</h1>
              <p className="text-slate-300">Gather and manage competitive research</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setMode('present')}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Eye size={18} /> View Presentation
              </button>
              <button
                onClick={downloadAsJSON}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Download size={18} /> Export
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Vendor List */}
          <div className="lg:col-span-1">
            <div className="bg-slate-700 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Vendors</h2>
              <div className="space-y-3">
                {vendors.map((vendor) => (
                  <button
                    key={vendor.id}
                    onClick={() => setSelectedVendorId(vendor.id)}
                    className={`w-full text-left p-4 rounded-lg transition-all ${
                      selectedVendorId === vendor.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-600 text-slate-200 hover:bg-slate-500'
                    }`}
                  >
                    <div className="font-semibold">{vendor.name}</div>
                    <div className="text-sm opacity-75 mt-1">{vendor.capabilities.length} capabilities</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Vendor Editor */}
          {selectedVendor && (
            <div className="lg:col-span-3">
              <div className="bg-slate-700 rounded-lg p-8">
                <h3 className="text-3xl font-bold text-white mb-6">{selectedVendor.name}</h3>

                {/* Status */}
                <div className="mb-6">
                  <label className="block text-slate-300 font-semibold mb-2">Status</label>
                  <select
                    value={selectedVendor.status}
                    onChange={(e) => updateVendor('status', e.target.value)}
                    className="w-full bg-slate-600 text-white rounded-lg p-2 border border-slate-500"
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                {/* Capabilities */}
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-white mb-3">AI Capabilities</h4>
                  <div className="space-y-2 mb-3">
                    {selectedVendor.capabilities.map((cap) => (
                      <div key={cap.id} className="flex justify-between items-center bg-slate-600 p-3 rounded">
                        <span className="text-slate-100">{cap.capability}</span>
                        <button
                          onClick={() => removeCapability(cap.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCapability}
                      onChange={(e) => setNewCapability(e.target.value)}
                      placeholder="Add capability"
                      className="flex-1 bg-slate-600 text-white rounded-lg p-2 border border-slate-500"
                      onKeyPress={(e) => e.key === 'Enter' && addCapability()}
                    />
                    <button
                      onClick={addCapability}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                {/* Implementation Claims */}
                <div className="mb-6">
                  <label className="block text-slate-300 font-semibold mb-2">Implementation Claims</label>
                  <textarea
                    value={selectedVendor.implementation_claims || ''}
                    onChange={(e) => updateVendor('implementation_claims', e.target.value)}
                    className="w-full bg-slate-600 text-white rounded-lg p-3 border border-slate-500 h-20"
                  />
                </div>

                {/* Sources */}
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-white mb-3">Sources</h4>
                  <div className="space-y-2 mb-3">
                    {selectedVendor.sources.map((src) => (
                      <div key={src.id} className="flex justify-between items-center bg-slate-600 p-3 rounded">
                        <span className="text-slate-100 text-sm">{src.source}</span>
                        <button
                          onClick={() => removeSource(src.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSource}
                      onChange={(e) => setNewSource(e.target.value)}
                      placeholder="Add source"
                      className="flex-1 bg-slate-600 text-white rounded-lg p-2 border border-slate-500"
                      onKeyPress={(e) => e.key === 'Enter' && addSource()}
                    />
                    <button
                      onClick={addSource}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-2">Strategic Notes</label>
                  <textarea
                    value={selectedVendor.notes || ''}
                    onChange={(e) => updateVendor('notes', e.target.value)}
                    className="w-full bg-slate-600 text-white rounded-lg p-3 border border-slate-500 h-24"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}