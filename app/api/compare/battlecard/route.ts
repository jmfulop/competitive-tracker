import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity-log';

const client = new Anthropic();

export async function POST(req: Request) {
  const { vendors, matrixData } = await req.json();
  if (!vendors?.length) return NextResponse.json({ error: 'vendors required' }, { status: 400 });

  const competitors = vendors.filter((v: string) => v !== 'MYOB Acumatica');
  const primaryCompetitor = competitors[0];
  const supabase = createClient();

  const { data: previous } = await supabase
    .from('battlecards')
    .select('id, version, headline, content, created_at')
    .eq('vendor_b', primaryCompetitor)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    system: `You are a competitive strategist for MYOB Acumatica, ANZ mid-market ERP (50-500 employees).
Generate a concise sales battlecard. Respond ONLY with valid JSON - no markdown, no preamble.
Schema:
{
  "competitor":       "string",
  "headline":         "string (one punchy positioning line)",
  "our_strengths":    ["string"],
  "their_strengths":  ["string"],
  "their_weaknesses": ["string"],
  "landmines":        ["string"],
  "our_traps":        ["string"],
  "deal_tips":        ["string"]
}`,
    messages: [{
      role: 'user',
      content: `Generate a battlecard for MYOB Acumatica vs ${competitors.join(' and ')} in ANZ mid-market.
Feature matrix context:\n${JSON.stringify(matrixData, null, 2)}
Focus on ANZ angles: local support, compliance (ATO, STP, GST, PEPPOL), AUD pricing.`
    }]
  });

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('');

  let battlecard: Record<string, unknown>;
  try {
    battlecard = JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    return NextResponse.json({ error: 'Parse failed', raw: text }, { status: 500 });
  }

  const { data: saved, error } = await supabase
    .from('battlecards')
    .insert({
      vendor_b:  primaryCompetitor,
      vendors:   vendors,
      headline:  battlecard.headline,
      content:   battlecard,
    })
    .select()
    .maybeSingle();

  if (error) console.error('Supabase insert error:', error);

  await logActivity({
    entity_type: 'battlecard',
    entity_id:   String(saved?.id ?? ''),
    vendor:      primaryCompetitor,
    action:      previous ? 'battlecard_regenerated' : 'battlecard_generated',
    summary:     previous
      ? `Battlecard regenerated for vs ${primaryCompetitor} - now v${saved?.version} (was v${previous.version})`
      : `Battlecard generated for vs ${primaryCompetitor} (v1)`,
    previous:    previous ? { id: previous.id, version: previous.version, headline: previous.headline } : null,
    current:     { id: saved?.id, version: saved?.version, headline: battlecard.headline },
    meta:        { vendors, model: 'claude-sonnet-4-20250514' },
  });

  return NextResponse.json({
    battlecard,
    saved_id: saved?.id,
    version:  saved?.version,
  });
}