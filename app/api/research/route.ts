import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity-log';

export const maxDuration = 60;

const client = new Anthropic();

function clean(text: string): string {
  if (!text) return '';
  return text
    .replace(/<cite[^>]*>|<\/cite>/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export async function POST(req: Request) {
  const { vendor, forceRefresh = false } = await req.json();
  if (!vendor) return NextResponse.json({ error: 'vendor required' }, { status: 400 });

  const supabase = createClient();

  const { data: vendorRow } = await supabase
    .from('vendors')
    .select('id, name, ai_maturity, deployment_status, pricing_model, acumatica_gap, adoption_signal, implementation_claims, overall_score, dimension_scores, last_researched_at')
    .eq('name', vendor)
    .maybeSingle();

  if (!forceRefresh && vendorRow?.last_researched_at) {
    const age = Date.now() - new Date(vendorRow.last_researched_at).getTime();
    if (age < 7 * 24 * 60 * 60 * 1000) {
      await logActivity({
        entity_type: 'vendor_score',
        entity_id: String(vendorRow.id),
        vendor,
        action: 'research_run',
        summary: `Research served from cache for ${vendor} (score: ${vendorRow.overall_score})`,
        current: { overall_score: vendorRow.overall_score },
        meta: { cached: true },
      });
      return NextResponse.json({ result: vendorRow, cached: true });
    }
  }

  const previousScore = vendorRow?.overall_score ?? null;

  const existingContext = vendorRow ? `
Known context (from your tracker):
- AI maturity: ${vendorRow.ai_maturity ?? 'unknown'}
- Deployment: ${vendorRow.deployment_status ?? 'unknown'}
- Pricing model: ${vendorRow.pricing_model ?? 'unknown'}
- Acumatica gap: ${vendorRow.acumatica_gap ?? 'unknown'}
- Adoption signal: ${vendorRow.adoption_signal ?? 'unknown'}
- Implementation claims: ${vendorRow.implementation_claims ?? 'unknown'}
Use this as context but validate and update with your research.` : '';

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2500,
    tools: [{ type: 'web_search_20250305' as const, name: 'web_search' }],
    system: `You are a competitive intelligence analyst for MYOB Acumatica, ANZ mid-market ERP (50-500 employee businesses in Australia and New Zealand).
Respond ONLY with valid JSON - no markdown, no preamble.
Schema:
{
  "summary": "string (2-3 sentences)",
  "overall_score": number (0-10),
  "dimension_scores": {
    "ai_capability":            { "score": number, "rationale": "string" },
    "anz_presence":             { "score": number, "rationale": "string" },
    "pricing_competitiveness":  { "score": number, "rationale": "string" },
    "product_velocity":         { "score": number, "rationale": "string" },
    "implementation_ecosystem": { "score": number, "rationale": "string" },
    "customer_sentiment":       { "score": number, "rationale": "string" }
  },
  "key_strengths":      ["string"],
  "key_weaknesses":     ["string"],
  "anz_specific_notes": "string",
  "recent_signals":     ["string"],
  "sources":            ["url"]
}`,
    messages: [{
      role: 'user',
      content: `Research ${vendor} as an ANZ mid-market ERP competitor. Score 0-10 per dimension.
${existingContext}`
    }]
  });

  const rawText = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('');

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim());
  } catch {
    return NextResponse.json({ error: 'Parse failed', raw: rawText }, { status: 500 });
  }

  // Clean citation tags from all text fields
  const cleanDimensions = Object.fromEntries(
    Object.entries((parsed.dimension_scores as Record<string, { score: number; rationale: string }>) ?? {}).map(
      ([k, v]) => [k, { score: v.score, rationale: clean(v.rationale) }]
    )
  );

  const now = new Date().toISOString();

  if (vendorRow?.id) {
    await supabase
      .from('vendors')
      .update({
        overall_score:      parsed.overall_score,
        dimension_scores:   cleanDimensions,
        score_summary:      clean(parsed.summary as string),
        score_sources:      parsed.sources,
        last_researched_at: now,
        updated_at:         now,
      })
      .eq('id', vendorRow.id);
  }

  const { data: historyRow } = await supabase
    .from('vendor_score_history')
    .insert({
      vendor_id:        vendorRow?.id ?? null,
      vendor_name:      vendor,
      overall_score:    parsed.overall_score,
      dimension_scores: cleanDimensions,
      summary:          clean(parsed.summary as string),
      sources:          parsed.sources,
      raw_research:     JSON.stringify(parsed),
      scored_at:        now,
    })
    .select()
    .maybeSingle();

  const delta = previousScore != null
    ? ` (delta ${((parsed.overall_score as number) - previousScore) >= 0 ? '+' : ''}${((parsed.overall_score as number) - previousScore).toFixed(1)} vs last run)`
    : ' (first run)';

  await logActivity({
    entity_type: 'vendor_score',
    entity_id:   String(vendorRow?.id ?? historyRow?.id ?? ''),
    vendor,
    action:      'research_run',
    summary:     `Research refreshed for ${vendor} - score ${parsed.overall_score}/10${delta}`,
    previous:    previousScore != null ? { overall_score: previousScore } : null,
    current:     { overall_score: parsed.overall_score, dimension_scores: parsed.dimension_scores },
    meta:        { cached: false, forced: forceRefresh, model: 'claude-sonnet-4-20250514' },
  });

  return NextResponse.json({ result: { ...parsed, scored_at: now }, cached: false });
}