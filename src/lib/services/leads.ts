import { createClient } from '@/lib/supabase/client';
import { getActiveLeadsFixture, DEMO_LEADS, DEMO_LEAD_ACTIVITIES } from '@/lib/demo-data';
import { isDemoModeActive } from '@/lib/demo-mode';
import { Lead, LeadStatus, LeadActivity } from '@/types/database';

export async function getLeads(): Promise<{ data: Lead[]; isLive: boolean; error?: string }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      const isAllowed = process.env.NODE_ENV === 'test' || isDemoModeActive();
      return { data: isAllowed ? getActiveLeadsFixture() : [], isLive: false };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], isLive: false, error: error.message };
    }

    return { data: data || [], isLive: true };
  } catch (err: any) {
    return { data: [], isLive: false, error: err.message };
  }
}

export async function createLead(lead: Partial<Lead>): Promise<{ success: boolean; data?: Lead; error?: string }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      const newLead: Lead = {
        id: 'lead-' + Date.now(),
        name: lead.name || 'Anonymous Lead',
        business_name: lead.business_name || null,
        phone: lead.phone || null,
        email: lead.email || null,
        source: lead.source || 'direct',
        product_interest: lead.product_interest || null,
        quantity: Number(lead.quantity) || 1,
        budget: lead.budget ? Number(lead.budget) : null,
        location: lead.location || null,
        status: lead.status || 'new',
        priority: lead.priority || 'medium',
        notes: lead.notes || null,
        follow_up_date: lead.follow_up_date || null,
        assigned_to: null,
        is_demo: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      DEMO_LEADS.unshift(newLead);
      return { success: true, data: newLead };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('leads')
      .insert([lead])
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

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      const lead = DEMO_LEADS.find((l) => l.id === id);
      if (lead) {
        lead.status = status;
        lead.updated_at = new Date().toISOString();
      }
      return { success: true };
    }

    const supabase = createClient();
    const { error } = await supabase
      .from('leads')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getLeadActivities(leadId: string): Promise<{ data: LeadActivity[]; isLive: boolean; error?: string }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      const activities = DEMO_LEAD_ACTIVITIES.filter((a) => a.lead_id === leadId);
      return { data: activities, isLive: false };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: DEMO_LEAD_ACTIVITIES.filter((a) => a.lead_id === leadId), isLive: false, error: error.message };
    }

    return { data: data || [], isLive: true };
  } catch (err: any) {
    return { data: [], isLive: false, error: err.message };
  }
}

export async function addLeadActivity(
  leadId: string,
  activity: {
    activity_type: LeadActivity['activity_type'];
    description: string;
    performed_by?: string;
  }
): Promise<{ success: boolean; data?: LeadActivity; error?: string }> {
  try {
    const newActivity: LeadActivity = {
      id: 'lact-' + Date.now(),
      lead_id: leadId,
      activity_type: activity.activity_type,
      description: activity.description,
      performed_by: activity.performed_by || null,
      created_at: new Date().toISOString(),
    };

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      DEMO_LEAD_ACTIVITIES.unshift(newActivity);
      return { success: true, data: newActivity };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('lead_activities')
      .insert([newActivity])
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function importLeadsCSV(
  leads: Partial<Lead>[]
): Promise<{ success: boolean; importedCount: number; errors: string[] }> {
  const errors: string[] = [];
  let importedCount = 0;

  for (const item of leads) {
    if (!item.name || !item.name.trim()) {
      errors.push(`Row missing required 'Name' field`);
      continue;
    }

    const res = await createLead({
      name: item.name.trim(),
      business_name: item.business_name?.trim() || null,
      phone: item.phone?.trim() || null,
      email: item.email?.trim() || null,
      source: item.source || 'b2b_inquiry',
      product_interest: item.product_interest?.trim() || 'Clear Magnetic Acrylic Photo Frame',
      quantity: Number(item.quantity) || 1,
      budget: item.budget ? Number(item.budget) : null,
      location: item.location?.trim() || null,
      status: item.status || 'new',
      priority: item.priority || 'medium',
      notes: item.notes?.trim() || null,
      is_demo: false,
    });

    if (res.success) {
      importedCount++;
    } else {
      errors.push(`Failed to import ${item.name}: ${res.error}`);
    }
  }

  return { success: importedCount > 0, importedCount, errors };
}
