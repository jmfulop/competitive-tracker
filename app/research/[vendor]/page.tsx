'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Zap, Globe, DollarSign, Rocket, Users, Star } from 'lucide-react';

const DIMENSION_META: Record<string, { label: string; color: string }> = {
  ai_capability:            { label: 'AI Capability',          color: 'text-purple-400' },
  anz_presence:             { label: 'ANZ Presence',           color: 'text-blue-400'   },
  pricing_competitiveness:  { label: 'Pricing',                color: 'text-green-400'  },
  product_velocity:         { label: 'Product Velocity',       color: 'text-orange-400' },
  implementation_ecosystem: { label: 'Implementation Network', color: 'text-teal-400'   },
  customer_sentiment:       { label: 'Customer Sentiment',     color: 'text-yellow-400' },
};

function ScoreBar({ score }: { score: number }) {
  const color = score >= 7 ? 'bg-green-500' : score >= 4 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${(score / 10) * 100}%` }} />
      </div>
      <span className="text-sm font-semibold w-8 text-right">{score.toFixed(1)}</span>
    </div>
  );
}

type DimensionScore = { score: number; rationale: string };
type ResearchResult = {
  summary: string;
  overall_score: number;
  dimension_scores: Record<string, DimensionScore>;
  key_strengths: string[];
  key_weaknesses: string[];
  anz_specific_notes: string;
  recent_signals: string[];
  sources: string[];
  scored_at?: string;
};

export default function VendorResearchPage() {
  const { vendor } = useParams<{ vendor: string }>();
  const router = useRouter();
  const vendorName = decodeURIComponent(vendor);

  const [result, setResult]   = useState<ResearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [cached, setCached]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const runResearch = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor: vendorName, forceRefresh }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data.result);
      setCached(data.cached);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Research failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { runResearch(); }, [vendorName]);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{vendorName}</h1>
            <p className="text-gray-400 text-sm">ANZ Mid-Market ERP Analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {cached && result?.scored_at && (
            <span className="text-xs text-gray-500">
              Cached · {new Date(result.scored_at).toLocaleDateString('en-AU')}
            </span>
          )}
          <button onClick={() => runResearch(true)} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Researching…' : 'Refresh Research'}
          </button>
        </div>
      </div>

      {loading && !result && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
          <RefreshCw size={32} className="animate-spin text-indigo-400" />
          <p>Running AI research with live web search…</p>
          <p className="text-sm text-gray-600">This takes 15–30 seconds</p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">{error}</div>
      )}

      {result && !loading && (
        <div className="space-y-6">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-4xl font-bold text-indigo-400">{result.overall_score.toFixed(1)}</span>
              <span className="text-gray-500">/10</span>
            </div>
            <p className="text-gray-300 leading-relaxed">{result.summary}</p>
            {result.anz_specific_notes && (
              <p className="mt-3 text-sm text-blue-300 bg-blue-950/40 rounded-lg p-3">
                🇦🇺 <span className="font-medium">ANZ context:</span> {result.anz_specific_notes}
              </p>
            )}
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold mb-4">Dimension Scores</h2>
            <div className="space-y-4">
              {Object.entries(result.dimension_scores ?? {}).map(([key, dim]) => {
                const meta = DIMENSION_META[key];
                return (
                  <div key={key}>
                    <div className={`text-sm font-medium mb-1 ${meta?.color ?? 'text-gray-300'}`}>
                      {meta?.label ?? key}
                    </div>
                    <ScoreBar score={dim.score} />
                    <p className="text-xs text-gray-500 mt-1">{dim.rationale}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-3 text-green-400">Strengths</h2>
              <ul className="space-y-2">
                {result.key_strengths?.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-300">
                    <span className="text-green-500 mt-0.5">✓</span>{s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-3 text-red-400">Weaknesses</h2>
              <ul className="space-y-2">
                {result.key_weaknesses?.map((w, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-300">
                    <span className="text-red-500 mt-0.5">✗</span>{w}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {result.recent_signals?.length > 0 && (
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-3 text-yellow-400">Recent Signals</h2>
              <ul className="space-y-2">
                {result.recent_signals.map((s, i) => (
                  <li key={i} className="text-sm text-gray-300 flex gap-2">
                    <span className="text-yellow-500">⚡</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.sources?.length > 0 && (
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h2 className="text-sm font-semibold mb-2 text-gray-500 uppercase tracking-wide">Sources</h2>
              <ul className="space-y-1">
                {result.sources.map((url, i) => (
                  <li key={i}>
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 underline break-all">
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}