'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Download } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function Tracker() {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">Competitive Tracker</h1>
        <p className="text-slate-300 mb-8">Gather and manage competitive research</p>

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
                    <div className="text-sm opacity-75">{vendor.capabilities.length} capabilities</div>
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
                  <label className="block text-slate-300 font-semibold mb-2">Notes</label>
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