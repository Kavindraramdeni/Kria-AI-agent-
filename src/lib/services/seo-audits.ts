import { createClient } from '@/lib/supabase/client';
import { SEOAudit } from '@/types/database';
import { isDemoModeActive } from '@/lib/demo-mode';

export const OPTIONAL_DEMO_SEO_AUDITS: SEOAudit[] = [
  {
    id: 'demo-audit-001',
    target_url: 'https://kriatech.com/products/magnetic-acrylic-frames',
    audit_type: 'on-page',
    issues: [
      {
        severity: 'high',
        issue: 'Missing Product Schema markup for wholesale bulk pricing tiers.',
        fix: 'Add Schema.org AggregateOffer with priceRange specification.',
      },
      {
        severity: 'medium',
        issue: 'Call-to-Action for B2B wholesale catalog inquiry is below the fold.',
        fix: 'Add floating "Request Wholesale Quote" sticky button on mobile viewport.',
      },
    ],
    recommendations: [
      'Page loads swiftly (1.2s on mobile), but high-res acrylic reflection images should use WebP formatting to conserve mobile data.',
    ],
    score: 84,
    created_at: '2026-01-15T00:00:00.000Z',
  },
];

export async function getSeoAudits(): Promise<{
  data: SEOAudit[];
  isLive: boolean;
  error?: string;
}> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      const isAllowed = process.env.NODE_ENV === 'test' || isDemoModeActive();
      return { data: isAllowed ? OPTIONAL_DEMO_SEO_AUDITS : [], isLive: false };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('seo_audits')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], isLive: false, error: error.message };
    }

    if (data && data.length > 0) {
      return { data, isLive: true };
    }

    return { data: isDemoModeActive() ? OPTIONAL_DEMO_SEO_AUDITS : [], isLive: true };
  } catch (err: any) {
    return { data: [], isLive: false, error: err.message };
  }
}
