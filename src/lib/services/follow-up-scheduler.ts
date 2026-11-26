/**
 * R3. Durable Follow-Up Automation Service
 * Schedules and manages lead follow-up records in the `follow_ups` table.
 * Integrates with the sales-lead agent to create durable scheduled records
 * after a lead is processed and `suggested_follow_up_hours` is returned.
 */

import { createClient } from '@/lib/supabase/server';
import { FollowUp, FollowUpStatus, FollowUpChannel } from '@/types/database';
import { executeSalesLeadAgent } from '@/lib/services/sales-lead-agent';

export interface CreateFollowUpParams {
  lead_id: string;
  follow_up_hours: number;
  action_type: string;
  notes?: string;
  workflow_run_id?: string;
  approval_id?: string;
  channel?: FollowUpChannel;
}

export interface CreateFollowUpResult {
  success: boolean;
  data?: FollowUp;
  error?: string;
  is_demo?: boolean;
}

/** In-memory store for demo/test mode follow-ups */
export const DEMO_FOLLOW_UPS: FollowUp[] = [];

/**
 * Creates a durable `follow_ups` row scheduled `follow_up_hours` from now.
 * Falls back to in-memory demo store when Supabase is not configured.
 */
export async function createFollowUp(
  params: CreateFollowUpParams,
  customClient?: any
): Promise<CreateFollowUpResult> {
  const {
    lead_id,
    follow_up_hours,
    action_type,
    notes,
    workflow_run_id,
    approval_id,
    channel = 'whatsapp',
  } = params;

  const scheduledFor = new Date(
    Date.now() + follow_up_hours * 60 * 60 * 1000
  ).toISOString();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isDemo =
    !customClient && (!supabaseUrl || supabaseUrl.includes('placeholder'));

  if (isDemo) {
    const mockFollowUp: FollowUp = {
      id: `fu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      lead_id,
      workflow_run_id: workflow_run_id || null,
      approval_id: approval_id || null,
      scheduled_for: scheduledFor,
      assigned_action: action_type,
      channel,
      status: 'scheduled',
      prepared_message: null,
      completed_at: null,
      notes: notes || null,
      is_demo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    DEMO_FOLLOW_UPS.push(mockFollowUp);
    return { success: true, data: mockFollowUp, is_demo: true };
  }

  try {
    const supabase = customClient || createClient();

    const payload: Record<string, any> = {
      lead_id,
      scheduled_for: scheduledFor,
      assigned_action: action_type,
      channel,
      status: 'scheduled',
      notes: notes || null,
      is_demo: false,
    };

    if (workflow_run_id) payload.workflow_run_id = workflow_run_id;
    if (approval_id) payload.approval_id = approval_id;

    const { data, error } = await supabase
      .from('follow_ups')
      .insert([payload])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Returns follow-ups where `scheduled_for <= now()` and `status = scheduled`.
 */
export async function getDueFollowUps(customClient?: any): Promise<FollowUp[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isDemo =
    !customClient && (!supabaseUrl || supabaseUrl.includes('placeholder'));

  if (isDemo) {
    const now = new Date().toISOString();
    return DEMO_FOLLOW_UPS.filter(
      (f) => f.status === 'scheduled' && f.scheduled_for <= now
    );
  }

  try {
    const supabase = customClient || createClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('follow_ups')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_for', now)
      .order('scheduled_for', { ascending: true });

    if (error) {
      console.warn('getDueFollowUps error:', error.message);
      return [];
    }

    return data || [];
  } catch (err: any) {
    console.warn('getDueFollowUps exception:', err.message);
    return [];
  }
}

/**
 * Returns follow-ups more than 1 hour past their `scheduled_for` with `status = scheduled`.
 */
export async function getOverdueFollowUps(
  customClient?: any
): Promise<FollowUp[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isDemo =
    !customClient && (!supabaseUrl || supabaseUrl.includes('placeholder'));

  if (isDemo) {
    const overdueThreshold = new Date(
      Date.now() - 60 * 60 * 1000
    ).toISOString();
    return DEMO_FOLLOW_UPS.filter(
      (f) =>
        f.status === 'scheduled' && f.scheduled_for < overdueThreshold
    );
  }

  try {
    const supabase = customClient || createClient();
    const overdueThreshold = new Date(
      Date.now() - 60 * 60 * 1000
    ).toISOString();

    const { data, error } = await supabase
      .from('follow_ups')
      .select('*')
      .eq('status', 'scheduled')
      .lt('scheduled_for', overdueThreshold)
      .order('scheduled_for', { ascending: true });

    if (error) {
      console.warn('getOverdueFollowUps error:', error.message);
      return [];
    }

    return data || [];
  } catch (err: any) {
    console.warn('getOverdueFollowUps exception:', err.message);
    return [];
  }
}

/**
 * Calls the sales agent to draft a follow-up message for the given lead.
 * Stores the prepared message on the follow_up record.
 */
export async function prepareFollowUpContent(
  followUp: FollowUp,
  customClient?: any
): Promise<{ success: boolean; prepared_message?: string; error?: string }> {
  try {
    const salesResult = await executeSalesLeadAgent({
      lead_id: followUp.lead_id,
      topic_or_prompt: `Follow-up after ${followUp.assigned_action} — please draft a polite follow-up message to check on order interest.`,
    });

    if (!salesResult.success || !salesResult.output) {
      return {
        success: false,
        error: salesResult.error || 'Sales agent did not return a draft message.',
      };
    }

    const prepared_message = salesResult.output.draft_response_message;

    // Persist the prepared message on the follow_up row
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const isDemo =
      !customClient && (!supabaseUrl || supabaseUrl.includes('placeholder'));

    if (isDemo) {
      const record = DEMO_FOLLOW_UPS.find((f) => f.id === followUp.id);
      if (record) {
        record.prepared_message = prepared_message;
        record.status = 'prepared';
        record.updated_at = new Date().toISOString();
      }
    } else {
      const supabase = customClient || createClient();
      await supabase
        .from('follow_ups')
        .update({
          prepared_message,
          status: 'prepared',
          updated_at: new Date().toISOString(),
        })
        .eq('id', followUp.id);
    }

    return { success: true, prepared_message };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Marks a follow-up as completed.
 */
export async function markComplete(
  id: string,
  customClient?: any
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isDemo =
    !customClient && (!supabaseUrl || supabaseUrl.includes('placeholder'));

  if (isDemo) {
    const record = DEMO_FOLLOW_UPS.find((f) => f.id === id);
    if (!record) return { success: false, error: 'Follow-up not found.' };
    record.status = 'completed';
    record.completed_at = now;
    record.updated_at = now;
    return { success: true };
  }

  try {
    const supabase = customClient || createClient();
    const { error } = await supabase
      .from('follow_ups')
      .update({ status: 'completed', completed_at: now, updated_at: now })
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Marks a follow-up as cancelled.
 */
export async function markCancelled(
  id: string,
  customClient?: any
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isDemo =
    !customClient && (!supabaseUrl || supabaseUrl.includes('placeholder'));

  if (isDemo) {
    const record = DEMO_FOLLOW_UPS.find((f) => f.id === id);
    if (!record) return { success: false, error: 'Follow-up not found.' };
    record.status = 'cancelled';
    record.updated_at = now;
    return { success: true };
  }

  try {
    const supabase = customClient || createClient();
    const { error } = await supabase
      .from('follow_ups')
      .update({ status: 'cancelled', updated_at: now })
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Convenience: update status of a follow-up to any valid status.
 */
export async function updateFollowUpStatus(
  id: string,
  status: FollowUpStatus,
  customClient?: any
): Promise<{ success: boolean; error?: string }> {
  if (status === 'completed') return markComplete(id, customClient);
  if (status === 'cancelled') return markCancelled(id, customClient);

  const now = new Date().toISOString();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isDemo =
    !customClient && (!supabaseUrl || supabaseUrl.includes('placeholder'));

  if (isDemo) {
    const record = DEMO_FOLLOW_UPS.find((f) => f.id === id);
    if (!record) return { success: false, error: 'Follow-up not found.' };
    record.status = status;
    record.updated_at = now;
    return { success: true };
  }

  try {
    const supabase = customClient || createClient();
    const { error } = await supabase
      .from('follow_ups')
      .update({ status, updated_at: now })
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
