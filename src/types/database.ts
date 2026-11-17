export type UserRole = 'owner' | 'admin' | 'staff';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export type ProductStatus = 'active' | 'draft' | 'archived';

export type VerificationStatus =
  | 'verified'
  | 'unverified'
  | 'contradictory'
  | 'needs_owner_confirmation';

export interface WholesaleTiers {
  storefront_base: number;
  tier_50: number;
  tier_100: number;
  tier_250: number;
  tier_500: number;
  tier_1000: number;
}

export interface SubscriptionProgram {
  id: string;
  name: string;
  price_inr: number;
  validity_months: number;
  per_frame_discount_inr: number;
  priority_dispatch_days: number;
  terms: string;
}

export interface ProductCustomizationOptions {
  storefront_base_price?: number;
  wholesale_tiers?: WholesaleTiers;
  subscription_discount_eligible?: boolean;
  subscription_discount_inr?: number;
  verification_status?: VerificationStatus;
  verification_claims?: {
    clarity?: string;
    magnet_grade?: string;
    material_spec?: string;
    manufacturing_location?: string;
    [claim: string]: any;
  };
  bundle_contents?: {
    frames_count: number;
    keychains_count: number;
    free_air_shipping: boolean;
  };
  [key: string]: any;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  description: string | null;
  materials: string[];
  dimensions: string | null;
  available_shapes: string[];
  customization_options: ProductCustomizationOptions | Record<string, any>;
  retail_price: number;
  bulk_price: number;
  min_bulk_quantity: number;
  production_notes: string | null;
  image_url: string | null;
  status: ProductStatus;
  seo_keywords: string[];
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export type LeadSource =
  | 'website'
  | 'whatsapp'
  | 'instagram'
  | 'direct'
  | 'referral'
  | 'b2b_inquiry'
  | 'trade_show'
  | 'other';

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'quotation_sent'
  | 'negotiation'
  | 'won'
  | 'lost';

export type LeadPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Lead {
  id: string;
  name: string;
  business_name: string | null;
  phone: string | null;
  email: string | null;
  source: LeadSource;
  product_interest: string | null;
  quantity: number;
  budget: number | null;
  location: string | null;
  status: LeadStatus;
  priority: LeadPriority;
  notes: string | null;
  follow_up_date: string | null;
  assigned_to: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  activity_type: 'note' | 'call' | 'email' | 'whatsapp' | 'quote_created' | 'status_change' | 'meeting';
  description: string;
  performed_by: string | null;
  created_at: string;
}

export interface SEOKeyword {
  id: string;
  keyword: string;
  search_intent: 'informational' | 'navigational' | 'commercial' | 'transactional' | null;
  cluster: string | null;
  priority: 'low' | 'medium' | 'high';
  target_page: string | null;
  status: 'discovered' | 'targeted' | 'ranking' | 'archived';
  verified_search_volume: number | null;
  source: string;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface SEOAudit {
  id: string;
  target_url: string;
  audit_type: string;
  issues: any[];
  recommendations: any[];
  score: number | null;
  created_at: string;
}

export interface CompetitorReport {
  id: string;
  competitor_name: string;
  website_url: string | null;
  products_analyzed: any[];
  pricing_analysis: Record<string, any>;
  seo_opportunities: any[];
  source_urls: string[];
  research_date: string;
  is_demo: boolean;
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  objective: string | null;
  target_audience: string | null;
  channels: string[];
  budget: number;
  start_date: string | null;
  end_date: string | null;
  status: 'draft' | 'review' | 'approved' | 'active' | 'paused' | 'completed';
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContentItem {
  id: string;
  title: string;
  content_type:
    | 'article'
    | 'product_description'
    | 'landing_page'
    | 'instagram_caption'
    | 'reels_script'
    | 'social_calendar'
    | 'email_draft'
    | 'campaign_promo';
  body: string;
  target_audience: string | null;
  objective: string | null;
  keywords: string[];
  suggested_cta: string | null;
  status: 'draft' | 'review' | 'approved' | 'scheduled' | 'published' | 'rejected';
  generated_by_agent_task_id: string | null;
  scheduled_for: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  description: string;
  actor_type: 'user' | 'agent' | 'system';
  actor_id: string | null;
  metadata: Record<string, any>;
  previous_hash?: string;
  hash?: string;
  created_at: string;
}
