import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity-log';

const client = new Anthropic();

export async function POST(req: Request) {
  const { signal_id, observation, vendor_tag } = await req.json();
  if (!observation) return NextResponse.json({ error: 'observation required' }, { status: 400 });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 600,
    system: `You are a competitive intelligence analyst for MYOB Acumatica, ANZ mid-market ERP.
Analyse a weak signal and classify it. Respond ONLY with valid JSON - no markdown, no preamble.
Schema:
{
  "signal_type": "product"|"pricing"|"personnel"|"partnership"|"market",
  "urgency": "high"|"medium"|"low",
  "recommended_action": "respond"|"investigate"|"monitor",
  "action_detail": "string (one specific next step for the MYOB Acumatica PM team)",
  "confidence": number (1-10),
  "roadmap_implication": "accelerate"|"differentiate"|"monitor"|"deprioritise"|"new_opportunity",
  "roadmap_detail": "string (explicit implication for MYOB Acumatica roadmap)",
  "triage_summary": "string (one plain-English sentence)"
}`,
    messages: [{
      role: 'user',
      content: `Vendor: ${vendor_tag}\nSignal: ${observation}\n\nClassify this competitive signal for MYOB Acumatica ANZ mid-market.`
    }]
  });

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('');

  let triage: Record<string, unknown>;
  try {
    triage = JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    return NextResponse.json({ error: 'Parse failed', raw: text }, { status: 500 });
  }

  if (signal_id) {
    const supabase = createClient();

    const { data: existing } = await supabase
      .from('weak_signals')
      .select('urgency, recommended_action, triage_history, triage_count')
      .eq('id', signal_id)
      .maybeSingle();

    const prevUrgency = existing?.urgency ?? null;
    const history: unknown[] = existing?.triage_history ?? [];

    if (prevUrgency) {
      history.push({
        triaged_at:         new Date().toISOString(),
        urgency:            existing?.urgency,
        recommended_action: existing?.recommended_action,
      });
    }

    await supabase
      .from('weak_signals')
      .update({
        signal_type:         triage.signal_type,
        urgency:             triage.urgency,
        confidence:          triage.confidence,
        recommended_action:  triage.recommended_action,
        action_detail:       triage.action_detail,
        roadmap_implication: triage.roadmap_implication,
        roadmap_detail:      triage.roadmap_detail,
        triage_summary:      triage.triage_summary,
        triage_history:      history,
        triage_count:        (existing?.triage_count ?? 0) + 1,
        triaged_at:          new Date().toISOString(),
        updated_at:          new Date().toISOString(),
      })
      .eq('id', signal_id);

    const isRetriage = (existing?.triage_count ?? 0) > 0;
    const urgencyChanged = prevUrgency && prevUrgency !== triage.urgency;

    await logActivity({
      entity_type: 'signal_triage',
      entity_id:   String(signal_id),
      vendor:      vendor_tag,
      action:      isRetriage ? 'signal_retriaged' : 'signal_triaged',
      summary:     isRetriage
        ? `Signal re-triaged for ${vendor_tag}${urgencyChanged ? ` - urgency ${prevUrgency} to ${triage.urgency}` : ''}`
        : `Signal triaged for ${vendor_tag} - ${triage.urgency} - ${triage.recommended_action}`,
      previous:    prevUrgency ? { urgency: prevUrgency, recommended_action: existing?.recommended_action } : null,
      current:     { urgency: triage.urgency, recommended_action: triage.recommended_action, roadmap_implication: triage.roadmap_implication },
      meta:        { model: 'claude-sonnet-4-20250514' },
    });
  }

  return NextResponse.json({ triage });
}