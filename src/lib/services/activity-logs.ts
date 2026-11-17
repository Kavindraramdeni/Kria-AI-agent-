import { createClient } from '@/lib/supabase/client';
import { DEMO_ACTIVITY_LOGS } from '@/lib/demo-data';
import { ActivityLog } from '@/types/database';

export async function getActivityLogs(): Promise<{ data: ActivityLog[]; isLive: boolean; error?: string }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      return { data: DEMO_ACTIVITY_LOGS, isLive: false };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data || data.length === 0) {
      return { data: DEMO_ACTIVITY_LOGS, isLive: false, error: error?.message };
    }

    return { data, isLive: true };
  } catch (err: any) {
    return { data: DEMO_ACTIVITY_LOGS, isLive: false, error: err.message };
  }
}

export async function logActivity(entry: {
  entity_type: string;
  entity_id?: string;
  action: string;
  description: string;
  actor_type?: 'user' | 'agent' | 'system';
  actor_id?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    const newLog: ActivityLog = {
      id: 'act-' + Date.now(),
      entity_type: entry.entity_type,
      entity_id: entry.entity_id || null,
      action: entry.action,
      description: entry.description,
      actor_type: entry.actor_type || 'user',
      actor_id: entry.actor_id || null,
      metadata: entry.metadata || {},
      created_at: new Date().toISOString(),
    };

    DEMO_ACTIVITY_LOGS.unshift(newLog);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
      const supabase = createClient();
      await supabase.from('activity_logs').insert([newLog]);
    }
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}
