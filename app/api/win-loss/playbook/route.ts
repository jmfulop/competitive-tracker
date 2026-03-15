import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const client = new Anthropic();

export async function POST(req: Request) {
  const { competitor } = await req.json();
  if (!competitor) return NextResponse.json({ error: 'competitor required' }, { status: 400 });

  const supabase = createClient();

  const { data: entries } = await supabase
    .from('win_loss_entries')
    .select('outcome, deal_size, industry, primary_reason, notes')
    .eq('competitor', competitor)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!entries?.length) {
    return NextResponse.json({ error: 'No win/loss data for this competitor yet' }, { status: 400 });
  }

  const wins    = entries.filter(e => e.outcome === 'won');
  const losses  = entries.filter(e => e.outcome === 'lost');
  const winRate = Math.round((wins.length / entries.length) * 100);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    system: `You are a competitive strategist for MYOB Acumatica, ANZ mid-market ERP (50-500 employee businesses).
Analyse win/loss data and generate a positioning playbook. Respond ONLY with valid JSON - no markdown, no preamble.
Schema:
{
  "headline": "string (one sentence framing MYOB Acumatica's position vs this competitor)",
  "win_patterns": ["string (2-4 patterns in deals we win)"],
  "loss_patterns": ["string (2-4 patterns in deals we lose)"],
  "segments_we_win": ["string (industries/deal sizes where we consistently win)"],
  "segments_at_risk": ["string (industries/deal sizes where we consistently lose)"],
  "top_objections": [
    { "objection": "string", "response": "string" }
  ],
  "messaging_hooks": ["string (3-4 ANZ-specific messages that resonate in wins)"],
  "qualification_flags": ["string (2-3 early signals this is a deal worth fighting for)"],
  "recommended_actions": ["string (2-3 specific actions for the PM/sales team)"]
}`,
    messages: [{
      role: 'user',
      content: `Competitor: ${competitor}
Win rate: ${winRate}% (${wins.length} wins, ${losses.length} losses)

Win data:\n${JSON.stringify(wins, null, 2)}

Loss data:\n${JSON.stringify(losses, null, 2)}

Generate a positioning playbook for MYOB Acumatica vs ${competitor} in the ANZ mid-market.`
    }]
  });

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('');

  try {
    const playbook = JSON.parse(text.replace(/```json|```/g, '').trim());
    return NextResponse.json({ playbook, meta: { wins: wins.length, losses: losses.length, winRate } });
  } catch {
    return NextResponse.json({ error: 'Parse failed', raw: text }, { status: 500 });
  }
}