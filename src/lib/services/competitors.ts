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
        product_name: 'Standard 4x6 Acrylic Tabletop Frame',
        estimated_price: '₹599 - ₹699',
        thickness_spec: '12mm to 15mm extruded acrylic',
      },
    ],
    pricing_analysis: {
      pricing_gap_vs_kria:
        'Competitors sell thinner 15mm extruded acrylic at ₹699. KRIA TECH direct factory price is ₹549 for 20mm premium cast acrylic, giving KRIA a 21% price advantage and superior thickness.',
      kria_advantages: [
        'Cast acrylic does not yellow or craze under UV exposure.',
        'Thicker 20mm cross section (10+10mm) provides self-standing stability without wobbling.',
        'Direct factory CO2 laser cutting eliminates middleman markup.',
      ],
    },
    seo_opportunities: [
      'Target interior stylists searching for "heavyweight executive acrylic block" who are dissatisfied with thin imported frames.',
    ],
    source_urls: ['Public Marketplace Listings', 'KRIA Material Testing Specs'],
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
