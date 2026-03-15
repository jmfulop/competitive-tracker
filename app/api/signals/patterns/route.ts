import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity-log';

const client = new Anthropic();

export async function GET(req: Request) {
  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const supabase = createClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: recentSignals } = await supabase
    .from('weak_signals')
    .select('vendor_tag, observation, signal_type, urgency, source_type, roadmap_implication, confidence, spotted_at')
    .gte('spotted_at', since)
    .eq('detected_by', 'ai_auto')
    .order('spotted_at', { ascending: false });

  if (!recentSignals?.length) {
    return NextResponse.json({ message: 'No recent auto-detected signals to analyse' });
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: `You are a strategic analyst for MYOB Acumatica ANZ mid-market ERP.
Analyse a batch of competitive signals across multiple vendors to identify macro patterns and market trends.
Focus on: convergent behaviour (multiple vendors doing the same thing), market inflection points, strategic windows.
Respond ONLY with valid JSON - no markdown, no preamble.
Schema:
{
  "macro_patterns": [
    {
      "title": "string",
      "description": "string (what is happening across vendors)",
      "vendors_involved": ["string"],
      "pattern_type": "convergence"|"arms_race"|"market_gap"|"customer_shift"|"ecosystem_move",
      "urgency": "high"|"medium"|"low",
      "strategic_window_months": number|null,
      "myob_implication": "string (specific MYOB Acumatica roadmap/strategy implication)",
      "recommended_response": "string"
    }
  ],
  "market_narrative": "string (2-3 sentences on where ANZ mid-market ERP is heading)",
  "biggest_threat": "string",
  "biggest_opportunity": "string"
}`,
    messages: [{
      role: 'user',
      content: `Analyse these ${recentSignals.length} signals from the past 7 days:\n\n${JSON.stringify(recentSignals, null, 2)}`
    }]
  });

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('');

  let patterns: Record<string, unknown>;
  try {
    patterns = JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    return NextResponse.json({ error: 'Parse failed', raw: text }, { status: 500 });
  }

  for (const p of (patterns.macro_patterns as Record<string, unknown>[] ?? [])) {
    const vendors = (p.vendors_involved as string[]).join(', ');
    await supabase.from('weak_signals').insert({
      vendor_tag:           vendors,
      observation:          p.description,
      title:                p.title,
      signal_type:          'market',
      urgency:              p.urgency,
      confidence:           p.urgency === 'high' ? 9 : p.urgency === 'medium' ? 6 : 3,
      recommended_action:   'investigate',
      action_detail:        p.recommended_response,
      roadmap_implication:  'monitor',
      roadmap_detail:       p.myob_implication,
      detected_by:          'ai_pattern',
      is_leading_indicator: true,
      status:               'new',
      spotted_at:           new Date().toISOString(),
      triage_history:       '[]',
    });
  }

  await logActivity({
    entity_type: 'signal_triage',
    vendor:      'all',
    action:      'signal_triaged',
    summary:     `Pattern analysis complete - ${(patterns.macro_patterns as unknown[])?.length ?? 0} macro patterns across ${recentSignals.length} signals`,
    current: {
      market_narrative:    patterns.market_narrative,
      biggest_threat:      patterns.biggest_threat,
      biggest_opportunity: patterns.biggest_opportunity,
    },
    meta: { detected_by: 'ai_pattern', signals_analysed: recentSignals.length },
  });

  return NextResponse.json({ success: true, patterns });
}

export async function POST() {
  return GET(new Request('http://localhost', {
    headers: { 'x-cron-secret': process.env.CRON_SECRET ?? '' }
  }));
}