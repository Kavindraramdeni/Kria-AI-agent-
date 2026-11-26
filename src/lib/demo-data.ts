import { Product, Lead, LeadActivity, SEOKeyword, ActivityLog } from '@/types/database';
import { ApprovalRequest } from '@/types/approval';
import { KRIA_CATALOG_VARIANTS } from '@/lib/data/kria-catalog-matrix';
import { isDemoModeActive } from './demo-mode';

/**
 * Legacy Tabletop Acrylic Photo Block Standards (MAPF-*)
 * Retained for tabletop block grounding and backward compatibility.
 */
export const LEGACY_MAPF_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    name: 'Clear Magnetic Acrylic Photo Frame (4x6 inch)',
    sku: 'MAPF-0406-CL',
    category: 'Photo Frames',
    description: 'Double-panel crystal-clear cast acrylic desktop photo frame with 4 corner neodymium magnets. Self-standing in portrait or landscape orientation.',
    materials: ['Grade-A Cast Acrylic (10mm + 10mm)', 'N52 Nickel-Plated Neodymium Magnets'],
    dimensions: '4 x 6 inches (Total thickness: 20mm)',
    available_shapes: ['Rectangle'],
    customization_options: {
      edge_finish: ['Diamond Polished', 'Beveled'],
      branding: ['Laser UV Printed Logo on Base', 'Gift Box Customization'],
    },
    retail_price: 549.00,
    bulk_price: 320.00,
    min_bulk_quantity: 25,
    production_notes: 'Precision CNC laser cut with diamond edge buffing. Packed with protective peel-off film.',
    image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80',
    status: 'active',
    seo_keywords: ['magnetic acrylic photo frame', 'custom acrylic frame wholesale', 'clear desk photo frame'],
    is_demo: false,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-002',
    name: 'Clear Magnetic Acrylic Photo Frame (5x7 inch)',
    sku: 'MAPF-0507-CL',
    category: 'Photo Frames',
    description: 'Standard portrait desktop floating acrylic frame. Dual block acrylic held securely with corner magnetic closures.',
    materials: ['Grade-A Cast Acrylic (12mm + 12mm)', 'N52 Neodymium Magnets'],
    dimensions: '5 x 7 inches (Total thickness: 24mm)',
    available_shapes: ['Rectangle'],
    customization_options: {
      edge_finish: ['Flame Polished', 'Diamond Polished'],
      packaging: ['White Kraft Box', 'Custom Velvet Box'],
    },
    retail_price: 799.00,
    bulk_price: 460.00,
    min_bulk_quantity: 20,
    production_notes: 'Flame polished edges for superior optical transparency. High bulk repeat demand from wedding studios.',
    image_url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80',
    status: 'active',
    seo_keywords: ['5x7 acrylic photo frame', 'magnetic floating frame', 'acrylic wedding photo display'],
    is_demo: false,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-003',
    name: 'Large Magnetic Acrylic Photo Block (8x10 inch)',
    sku: 'MAPF-0810-CL',
    category: 'Photo Frames',
    description: 'Luxury executive size dual acrylic block frame. Ultra-stable base designed for corporate certificates and executive gifts.',
    materials: ['Imported Virgin Cast Acrylic (15mm + 15mm)', 'Heavy-duty Corner Magnets'],
    dimensions: '8 x 10 inches (Total thickness: 30mm)',
    available_shapes: ['Rectangle'],
    customization_options: {
      edge_finish: ['Diamond Polished'],
      engraving: ['Laser engraved text on bottom border'],
    },
    retail_price: 1499.00,
    bulk_price: 890.00,
    min_bulk_quantity: 15,
    production_notes: 'Requires 30-ton diamond polishing wheel to guarantee zero optical distortion on 30mm block.',
    image_url: 'https://images.unsplash.com/photo-1582561424760-0321d75e81fa?auto=format&fit=crop&w=600&q=80',
    status: 'active',
    seo_keywords: ['8x10 acrylic block frame', 'corporate executive photo frame', 'certificate acrylic block'],
    is_demo: false,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
];

/**
 * Authoritative KRIA TECH Verified Product Specifications
 * Consolidates all 15 KRA-* bulk magnetic fridge frame, keychain, and Demo Starter Kit SKUs
 * alongside the 3 legacy MAPF-* tabletop block standards (is_demo: false).
 */
export const VERIFIED_KRIA_PRODUCTS: Product[] = [
  ...KRIA_CATALOG_VARIANTS.map((variant) => ({
    ...variant,
    id: `prod-${variant.sku.toLowerCase()}`,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  })),
  ...LEGACY_MAPF_PRODUCTS,
];

export const DEMO_PRODUCTS: Product[] = [...VERIFIED_KRIA_PRODUCTS];

/**
 * Optional Demo Fixtures (Only loaded when user explicitly enables Demo Mode in Settings)
 * Never mixed with real business operations.
 */
export const OPTIONAL_DEMO_LEADS: Lead[] = [
  {
    id: 'lead-001',
    name: 'Rohit Singhania [DEMO]',
    business_name: 'Aura Living & Home Decor',
    phone: '+91 98201 44521',
    email: 'rohit@auraliving.in',
    source: 'b2b_inquiry',
    product_interest: 'Clear Magnetic Acrylic Photo Frame (5x7 & 8x10)',
    quantity: 200,
    budget: 95000.00,
    location: 'Mumbai, Maharashtra',
    status: 'qualified',
    priority: 'high',
    notes: 'Demo lead inquiry for boutique retail store distribution.',
    follow_up_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    assigned_to: null,
    is_demo: true,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'lead-002',
    name: 'Pooja Hegde [DEMO]',
    business_name: 'PixelCraft Wedding Memories',
    phone: '+91 98450 11290',
    email: 'pooja@pixelcraftstudio.com',
    source: 'instagram',
    product_interest: 'Clear Magnetic Acrylic Photo Frame (4x6 inch)',
    quantity: 75,
    budget: 28000.00,
    location: 'Bangalore, Karnataka',
    status: 'quotation_sent',
    priority: 'medium',
    notes: 'Demo lead inquiry for wedding gift hamper frames.',
    follow_up_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    assigned_to: null,
    is_demo: true,
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

export const OPTIONAL_DEMO_APPROVALS: ApprovalRequest[] = [
  {
    id: 'appr-001',
    action_type: 'content_publish',
    title: 'Instagram Post: 2mm + 2mm Cast Acrylic Fridge Magnets (MOQ 50 / Starter Kit ₹999) [DEMO]',
    proposed_content: {
      caption:
        'Factory-direct from Hyderabad: 100% cell-cast monolithic 2mm + 2mm (4mm dual-plate) acrylic fridge magnets with 8 Grade N35 flush neodymium magnets per frame. MOQ 50 pcs or try our 24-pc Demo Starter Kit for ₹999 with free pan-India air delivery at https://kriatech.in!',
      hashtags: ['#KRIAtech', '#AcrylicPhotoFrame', '#FridgeMagnets'],
    },
    destination: 'Instagram / KRIA TECH Feed',
    agent_id: 'content-agent',
    risk_level: 'medium',
    status: 'pending',
    requested_by: null,
    reviewed_by: null,
    reviewed_at: null,
    review_notes: null,
    executed_at: null,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
];

export const OPTIONAL_DEMO_SEO_KEYWORDS: SEOKeyword[] = [
  {
    id: 'seo-001',
    keyword: 'magnetic acrylic photo frame manufacturer [DEMO]',
    search_intent: 'commercial',
    cluster: 'Magnetic Frames',
    priority: 'high',
    target_page: '/products/magnetic-acrylic-frames',
    status: 'targeted',
    verified_search_volume: 1200,
    source: 'manual',
    is_demo: true,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

export const OPTIONAL_DEMO_ACTIVITY_LOGS: ActivityLog[] = [
  {
    id: 'act-001',
    entity_type: 'product',
    entity_id: 'KRA-REC-0604',
    action: 'product_verified',
    description:
      'Verified factory specifications: 2mm + 2mm (4mm dual-plate) Classic Rectangle Acrylic Photo Magnet (6×4") with 8 Grade N35 magnets per frame, MOQ 50 pcs',
    actor_type: 'system',
    actor_id: 'system',
    metadata: { sku: 'KRA-REC-0604', starter_kit_sku: 'KRA-KIT-DEMO24' },
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
];

// Dynamic getters that return empty arrays when Demo Mode is OFF
export function getActiveLeadsFixture(): Lead[] {
  return isDemoModeActive() ? OPTIONAL_DEMO_LEADS : [];
}

export function getActiveApprovalsFixture(): ApprovalRequest[] {
  return isDemoModeActive() ? OPTIONAL_DEMO_APPROVALS : [];
}

export function getActiveSeoKeywordsFixture(): SEOKeyword[] {
  return isDemoModeActive() ? OPTIONAL_DEMO_SEO_KEYWORDS : [];
}

export function getActiveActivityLogsFixture(): ActivityLog[] {
  return isDemoModeActive() ? OPTIONAL_DEMO_ACTIVITY_LOGS : [];
}

// In-memory fallback arrays
export const DEMO_LEADS: Lead[] = [];
export const DEMO_APPROVALS: ApprovalRequest[] = [];
export const DEMO_SEO_KEYWORDS: SEOKeyword[] = [];
export const DEMO_ACTIVITY_LOGS: ActivityLog[] = [];
export const DEMO_LEAD_ACTIVITIES: LeadActivity[] = [];
