import { createClient } from '@/lib/supabase/client';
import { SEOKeyword } from '@/types/database';
import { getActiveSeoKeywordsFixture } from '@/lib/demo-data';
import { isDemoModeActive } from '@/lib/demo-mode';

export async function getSeoKeywords(): Promise<{ data: SEOKeyword[]; isLive: boolean; error?: string }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      const isAllowed = process.env.NODE_ENV === 'test' || isDemoModeActive();
      return { data: isAllowed ? getActiveSeoKeywordsFixture() : [], isLive: false };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('seo_keywords')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], isLive: false, error: error.message };
    }

    if (data && data.length > 0) {
      return { data, isLive: true };
    }

    // If live database has 0 keywords yet, provide the active fixture in demo mode
    return { data: isDemoModeActive() ? getActiveSeoKeywordsFixture() : [], isLive: true };
  } catch (err: any) {
    return { data: [], isLive: false, error: err.message };
  }
}
