import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const client = new Anthropic();

export async function POST() {
  const supabase = createClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: signals } = await supabase
    .from('weak_signals')
    .select('vendor_tag, observation, signal_type, urgency, recommended_action, roadmap_implication, confidence, spotted_at')
    .gte('spotted_at', since)
    .order('confidence', { ascending: false })
    .limit(30);

  if (!signals?.length) {
    return NextResponse.json({
      digest: { headline: 'No signals this week.', tldr: '', sections: [], opportunities: [], watch_list: [] }
    });
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    system: `You are a competitive intelligence analyst for MYOB Acumatica, ANZ mid-market ERP.
Write a concise weekly digest for the product and sales leadership team.
Respond ONLY with valid JSON - no markdown, no preamble.
Schema:
{
  "headline": "string (one punchy sentence summarising the week)",
  "tldr": "string (2-3 sentences - key takeaways for a busy exec)",
  "sections": [
    {
      "vendor": "string",
      "urgency": "high"|"medium"|"low",
      "key_moves": ["string"],
      "so_what": "string (implication for MYOB Acumatica)",
      "recommended_action": "string"
    }
  ],
  "opportunities": ["string (2-3 strategic opportunities this week's signals reveal)"],
  "watch_list": ["string (2-3 things to watch next week)"]
}`,
    messages: [{
      role: 'user',
      content: `This week's competitive signals (${signals.length} total):\n${JSON.stringify(signals, null, 2)}\n\nWrite a weekly competitive digest for the MYOB Acumatica ANZ mid-market PM team.`
    }]
  });

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('');

  try {
    const digest = JSON.parse(text.replace(/```json|```/g, '').trim());
    return NextResponse.json({ digest });
  } catch {
    return NextResponse.json({ error: 'Parse failed', raw: text }, { status: 500 });
  }
}