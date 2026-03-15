import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity-log';

const client = new Anthropic();

type SourceType =
  | 'job_postings' | 'github' | 'g2_reviews' | 'pricing_page'
  | 'changelog' | 'partner_network' | 'developer_docs' | 'community'
  | 'press_releases' | 'events';

function buildQuery(vendor: string, sourceType: SourceType): string {
  const queries: Record<SourceType, string> = {
    job_postings:    `${vendor} ERP job postings Australia AI machine learning engineering 2026`,
    github:          `${vendor} ERP github new repository SDK API 2026`,
    g2_reviews:      `${vendor} ERP G2 Capterra reviews 2026 sentiment AI features`,
    pricing_page:    `${vendor} ERP pricing changes new tier 2026 Australia`,
    changelog:       `${vendor} ERP release notes changelog new features AI 2026`,
    partner_network: `${vendor} ERP new partner integration marketplace Australia 2026`,
    developer_docs:  `${vendor} ERP developer API new endpoints documentation 2026`,
    community:       `${vendor} ERP Reddit community complaints feature requests 2026`,
    press_releases:  `${vendor} ERP press release announcement partnership 2026`,
    events:          `${vendor} ERP conference session webinar presentation 2026`,
  };
  return queries[sourceType];
}

interface DetectedSignal {
  title: string;
  observation: string;
  source: string;
  source_url: string;
  source_type: SourceType;
  signal_type: 'product' | 'pricing' | 'personnel' | 'partnership' | 'market';
  urgency: 'high' | 'medium' | 'low';
  confidence: number;
  recommended_action: 'respond' | 'investigate' | 'monitor';
  action_detail: string;
  roadmap_implication: 'accelerate' | 'differentiate' | 'monitor' | 'deprioritise' | 'new_opportunity';
  roadmap_detail: string;
  is_leading_indicator: boolean;
  leading_indicator_horizon_months: number | null;
}

// Strip citation markup from AI responses
function cleanText(text: string): string {
  return text
    .replace(/<cite[^>]*>|<\/cite>/g, '')  // remove <cite> tags
    .replace(/\s{2,}/g, ' ')               // collapse double spaces
    .trim();
}

async function isDuplicate(
  supabase: ReturnType<typeof createClient>,
  vendorTag: string,
  title: string,
  sourceUrl: string
): Promise<boolean> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: urlMatch } = await supabase
    .from('weak_signals')
    .select('id')
    .eq('vendor_tag', vendorTag)
    .eq('source_url', sourceUrl)
    .gte('spotted_at', since)
    .limit(1)
    .maybeSingle();

  if (urlMatch) return true;

  const { data: titleMatch } = await supabase
    .from('weak_signals')
    .select('id')
    .eq('vendor_tag', vendorTag)
    .ilike('title', `%${title.slice(0, 40)}%`)
    .gte('spotted_at', since)
    .limit(1)
    .maybeSingle();

  return !!titleMatch;
}

async function detectForVendor(
  vendor: string,
  sources: SourceType[],
  supabase: ReturnType<typeof createClient>
): Promise<{ vendor: string; inserted: number; skipped: number }> {
  let inserted = 0, skipped = 0;

  const { data: vendorRow } = await supabase
    .from('vendors')
    .select('ai_maturity, acumatica_gap, adoption_signal, status')
    .eq('name', vendor)
    .maybeSingle();

  for (const sourceType of sources) {
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        tools: [{ type: 'web_search_20250305' as const, name: 'web_search' }],
        system: `You are a competitive intelligence analyst for MYOB Acumatica, ANZ mid-market ERP.
Detect WEAK SIGNALS - early indicators others will miss. Prioritise: job postings hinting at future product direction, subtle product changes, ecosystem moves, sentiment shifts.
Ignore: generic marketing, obvious widely-reported announcements.

${vendorRow ? `Known context for ${vendor}: AI maturity = ${vendorRow.ai_maturity}, Acumatica gap = ${vendorRow.acumatica_gap}, status = ${vendorRow.status}` : ''}

Return ONLY a JSON array (max 3 signals, or [] if nothing meaningful found). No markdown, no preamble.
Each item:
{
  "title": "string (concise, specific - max 80 chars)",
  "observation": "string (2-3 sentences: what happened + why it matters)",
  "source": "string (publication/site name)",
  "source_url": "string (actual URL)",
  "source_type": "${sourceType}",
  "signal_type": "product"|"pricing"|"personnel"|"partnership"|"market",
  "urgency": "high"|"medium"|"low",
  "confidence": number (1-10),
  "recommended_action": "respond"|"investigate"|"monitor",
  "action_detail": "string (specific next step for MYOB Acumatica PM team)",
  "roadmap_implication": "accelerate"|"differentiate"|"monitor"|"deprioritise"|"new_opportunity",
  "roadmap_detail": "string (explicit implication for MYOB Acumatica roadmap)",
  "is_leading_indicator": boolean,
  "leading_indicator_horizon_months": number|null
}`,
        messages: [{
          role: 'user',
          content: `Search: ${buildQuery(vendor, sourceType)}\nANZ mid-market focus. Last 60 days only. Quality over quantity.`
        }]
      });

      const text = response.content
        .filter(b => b.type === 'text')
        .map(b => (b as { type: 'text'; text: string }).text)
        .join('');

      let signals: DetectedSignal[] = [];
      try {
        signals = JSON.parse(text.replace(/```json|```/g, '').trim());
        if (!Array.isArray(signals)) signals = [];
      } catch { continue; }

      for (const sig of signals) {
        if (!sig.title || !sig.observation) continue;
        if ((sig.confidence ?? 0) < 4) continue;

        const dup = await isDuplicate(supabase, vendor, sig.title, sig.source_url ?? '');
        if (dup) { skipped++; continue; }

        const { data: saved } = await supabase
          .from('weak_signals')
          .insert({
            vendor_tag:                       vendor,
            observation:                      cleanText(sig.observation),
            source:                           sig.source,
            confidence:                       sig.confidence,
            status:                           'new',
            spotted_at:                       new Date().toISOString(),
            title:                            cleanText(sig.title),
            source_url:                       sig.source_url,
            source_type:                      sig.source_type,
            signal_type:                      sig.signal_type,
            urgency:                          sig.urgency,
            recommended_action:               sig.recommended_action,
            action_detail:                    cleanText(sig.action_detail),
            roadmap_implication:              sig.roadmap_implication,
            roadmap_detail:                   cleanText(sig.roadmap_detail),
            is_leading_indicator:             sig.is_leading_indicator,
            leading_indicator_horizon_months: sig.leading_indicator_horizon_months,
            detected_by:                      'ai_auto',
            triage_history:                   '[]',
          })
          .select()
          .maybeSingle();

        await logActivity({
          entity_type: 'signal_triage',
          entity_id:   String(saved?.id ?? ''),
          vendor,
          action:      'signal_triaged',
          summary:     `Auto-detected: [${vendor}] ${sig.title} - ${sig.urgency} - ${sig.roadmap_implication}`,
          current: {
            signal_type:         sig.signal_type,
            urgency:             sig.urgency,
            roadmap_implication: sig.roadmap_implication,
            confidence:          sig.confidence,
          },
          meta: { source_type: sourceType, detected_by: 'ai_auto' },
        });

        inserted++;
      }
    } catch (err) {
      console.error(`[detect] ${vendor}/${sourceType}:`, err);
    }
  }

  await supabase
    .from('scan_sources')
    .update({ last_scanned: new Date().toISOString() })
    .eq('vendor_name', vendor);

  return { vendor, inserted, skipped };
}

export async function GET(req: Request) {
  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const supabase = createClient();

  const { data: sourceConfig } = await supabase
    .from('scan_sources')
    .select('vendor_name, source_type')
    .eq('is_active', true);

  const vendorSources = (sourceConfig ?? []).reduce<Record<string, SourceType[]>>((acc, row) => {
    (acc[row.vendor_name] ??= []).push(row.source_type as SourceType);
    return acc;
  }, {});

  const results = [];
  for (const [vendor, sources] of Object.entries(vendorSources)) {
    const r = await detectForVendor(vendor, sources, supabase);
    results.push(r);
  }

  const totalInserted = results.reduce((a, r) => a + r.inserted, 0);
  const totalSkipped  = results.reduce((a, r) => a + r.skipped, 0);

  await logActivity({
    entity_type: 'signal_triage',
    vendor:      'all',
    action:      'signal_triaged',
    summary:     `Daily scan complete - ${totalInserted} new signals, ${totalSkipped} duplicates skipped`,
    meta:        { results, detected_by: 'cron' },
  });

  return NextResponse.json({ success: true, inserted: totalInserted, skipped: totalSkipped, results });
}

export async function POST(req: Request) {
  const { vendor } = await req.json();
  const supabase = createClient();

  const { data: sourceConfig } = await supabase
    .from('scan_sources')
    .select('source_type')
    .eq('vendor_name', vendor)
    .eq('is_active', true);

  if (!sourceConfig?.length) {
    return NextResponse.json({ error: `No active sources configured for ${vendor}` }, { status: 400 });
  }

  const sources = sourceConfig.map(r => r.source_type as SourceType);
  const result  = await detectForVendor(vendor, sources, supabase);

  return NextResponse.json({ success: true, ...result });
}