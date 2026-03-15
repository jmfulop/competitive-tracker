import { createClient } from '@/lib/supabase/server';

type EntityType = 'vendor_score' | 'battlecard' | 'signal_triage' | 'win_loss';

type Action =
  | 'research_run'
  | 'battlecard_generated'
  | 'battlecard_regenerated'
  | 'signal_triaged'
  | 'signal_retriaged'
  | 'deal_logged';

interface LogParams {
  entity_type: EntityType;
  entity_id?: string;
  vendor?: string;
  action: Action;
  summary: string;
  previous?: Record<string, unknown> | null;
  current?: Record<string, unknown> | null;
  meta?: Record<string, unknown>;
}

/**
 * Appends a record to activity_log.
 * Call after any successful AI operation.
 * Fire-and-forget — never throws, never blocks the main response.
 */
export async function logActivity(params: LogParams): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.from('activity_log').insert({
      entity_type: params.entity_type,
      entity_id:   params.entity_id ?? null,
      vendor:      params.vendor ?? null,
      action:      params.action,
      summary:     params.summary,
      previous:    params.previous ?? null,
      current:     params.current ?? null,
      meta:        params.meta ?? null,
    });
  } catch (err) {
    console.error('[activity_log] Failed to log:', err);
  }
}