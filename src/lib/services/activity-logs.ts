import { createClient } from '@/lib/supabase/client';
import { getActiveActivityLogsFixture, DEMO_ACTIVITY_LOGS } from '@/lib/demo-data';
import { isDemoModeActive } from '@/lib/demo-mode';
import { ActivityLog } from '@/types/database';
import { computeLogHash } from './tamper-proof';

export async function getActivityLogs(): Promise<{ data: ActivityLog[]; isLive: boolean; error?: string }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      const isAllowed = process.env.NODE_ENV === 'test' || isDemoModeActive();
      return { data: isAllowed ? getActiveActivityLogsFixture() : [], isLive: false };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return { data: [], isLive: false, error: error.message };
    }

    return { data: data || [], isLive: true };
  } catch (err: any) {
    return { data: [], isLive: false, error: err.message };
  }
}

export async function logActivity(
  entry: {
    entity_type: string;
    entity_id?: string;
    action: string;
    description: string;
    actor_type?: 'user' | 'agent' | 'system';
    actor_id?: string;
    metadata?: Record<string, any>;
  },
  customClient?: any
): Promise<ActivityLog> {
  try {
    const createdAt = new Date().toISOString();
    const latestExisting = DEMO_ACTIVITY_LOGS[0];
    const prevHash = latestExisting?.hash || '0000000000000000000000000000000000000000000000000000000000000000';

    const selfHash = computeLogHash({
      previous_hash: prevHash,
      created_at: createdAt,
      entity_type: entry.entity_type,
      action: entry.action,
      actor_id: entry.actor_id || null,
      metadata: entry.metadata || {},
    });

    const newLog: ActivityLog = {
      id: 'act-' + Date.now(),
      entity_type: entry.entity_type,
      entity_id: entry.entity_id || null,
      action: entry.action,
      description: entry.description,
      actor_type: entry.actor_type || 'user',
      actor_id: entry.actor_id || null,
      metadata: entry.metadata || {},
      previous_hash: prevHash,
      hash: selfHash,
      created_at: createdAt,
    };

    DEMO_ACTIVITY_LOGS.unshift(newLog);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
      const supabase = customClient || createClient();
      const { id, ...supabaseLog } = newLog;
      const { error } = await supabase.from('activity_logs').insert([supabaseLog]);
      if (error) console.warn('Supabase activity log error:', error.message);
    }

    return newLog;
  } catch (err) {
    console.warn('Failed to log activity:', err);
    throw err;
  }
}
