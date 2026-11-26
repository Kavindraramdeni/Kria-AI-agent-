import { createClient } from '@/lib/supabase/client';
import { CompetitorReport } from '@/types/database';
import { isDemoModeActive } from '@/lib/demo-mode';

export const OPTIONAL_DEMO_COMPETITORS: CompetitorReport[] = [
  {
    id: 'demo-comp-001',
    competitor_name: 'Mass Market Acrylic Suppliers (Aggregators) [DEMO]',
    website_url: 'https://example-competitor.in',
    products_analyzed: [
      {
        product_name: 'Generic 6x4 Photo Fridge Magnet',
        estimated_price: '₹199 - ₹249',
        thickness_spec: '1.2mm thin extruded plastic with protruding ceramic magnet',
      },
    ],
    pricing_analysis: {
      pricing_gap_vs_kria:
        'Competitors sell 1.2mm extruded magnets at ₹199–₹249. KRIA TECH (https://kriatech.in) offers 100% cell-cast monolithic 2mm + 2mm (4mm dual-plate) frames with 8 Grade N35 magnets per frame starting at MOQ 50 pcs (₹85/pc @ 100 pcs for KRA-REC-0604) and a 24-pc Demo Starter Kit (KRA-KIT-DEMO24) for ₹999 with free pan-India air delivery.',
      kria_advantages: [
        '100% cell-cast monolithic 2mm + 2mm (4mm dual-plate) acrylic with 93% optical clarity does not yellow under UV.',
        '8 Grade N35 flush countersunk neodymium magnets per frame minimize contact friction on refrigerator enamel.',
        'Direct Hyderabad, Telangana factory production eliminates middleman markups (MOQ 50 pcs; Starter Kit 24 pcs for ₹999).',
      ],
    },
    seo_opportunities: [
      'Target B2B gift retailers and wedding planners searching for "wholesale acrylic fridge magnets MOQ 50 Hyderabad" and "custom magnetic acrylic photo frames kriatech.in".',
    ],
    source_urls: ['Public Marketplace Listings', 'KRIA Material Testing Specs', 'https://kriatech.in'],
    research_date: '2026-01-15',
    is_demo: true,
    created_at: '2026-01-15T00:00:00.000Z',
  },
];

export async function getCompetitorReports(): Promise<{
  data: CompetitorReport[];
  isLive: boolean;
  error?: string;
}> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      const isAllowed = process.env.NODE_ENV === 'test' || isDemoModeActive();
      return { data: isAllowed ? OPTIONAL_DEMO_COMPETITORS : [], isLive: false };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('competitor_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], isLive: false, error: error.message };
    }

    if (data && data.length > 0) {
      return { data, isLive: true };
    }

    return { data: isDemoModeActive() ? OPTIONAL_DEMO_COMPETITORS : [], isLive: true };
  } catch (err: any) {
    return { data: [], isLive: false, error: err.message };
  }
}
