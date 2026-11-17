-- ====================================================================
-- KRIA AI - Complete Database Schema Migration
-- Production Schema for KRIA TECH Operations and AI Command Center
-- ====================================================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'admin', 'staff')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    description TEXT,
    materials TEXT[] NOT NULL DEFAULT '{}',
    dimensions TEXT,
    available_shapes TEXT[] NOT NULL DEFAULT '{}',
    customization_options JSONB NOT NULL DEFAULT '{}'::jsonb,
    retail_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    bulk_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    min_bulk_quantity INTEGER NOT NULL DEFAULT 10,
    production_notes TEXT,
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
    seo_keywords TEXT[] NOT NULL DEFAULT '{}',
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Leads Table
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    business_name TEXT,
    phone TEXT,
    email TEXT,
    source TEXT NOT NULL DEFAULT 'direct' CHECK (source IN ('website', 'whatsapp', 'instagram', 'direct', 'referral', 'b2b_inquiry', 'trade_show', 'other')),
    product_interest TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    budget NUMERIC(10,2),
    location TEXT,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'quotation_sent', 'negotiation', 'won', 'lost')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    notes TEXT,
    follow_up_date DATE,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Lead Activities Table
CREATE TABLE IF NOT EXISTS public.lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('note', 'call', 'email', 'whatsapp', 'quote_created', 'status_change', 'meeting')),
    description TEXT NOT NULL,
    performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Agent Definitions
CREATE TABLE IF NOT EXISTS public.agent_definitions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Agent Tasks
CREATE TABLE IF NOT EXISTS public.agent_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL REFERENCES public.agent_definitions(id),
    title TEXT NOT NULL,
    task_type TEXT NOT NULL,
    input_params JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    initiated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 7. Agent Task Outputs
CREATE TABLE IF NOT EXISTS public.agent_task_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.agent_tasks(id) ON DELETE CASCADE,
    structured_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    reasoning_summary TEXT,
    sources TEXT[] NOT NULL DEFAULT '{}',
    verified_facts TEXT[] NOT NULL DEFAULT '{}',
    assumptions TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Content Items Table
CREATE TABLE IF NOT EXISTS public.content_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('article', 'product_description', 'landing_page', 'instagram_caption', 'reels_script', 'social_calendar', 'email_draft', 'campaign_promo')),
    body TEXT NOT NULL,
    target_audience TEXT,
    objective TEXT,
    keywords TEXT[] NOT NULL DEFAULT '{}',
    suggested_cta TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'scheduled', 'published', 'rejected')),
    generated_by_agent_task_id UUID REFERENCES public.agent_tasks(id) ON DELETE SET NULL,
    scheduled_for TIMESTAMPTZ,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. SEO Keywords Table
CREATE TABLE IF NOT EXISTS public.seo_keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword TEXT NOT NULL UNIQUE,
    search_intent TEXT CHECK (search_intent IN ('informational', 'navigational', 'commercial', 'transactional')),
    cluster TEXT,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    target_page TEXT,
    status TEXT NOT NULL DEFAULT 'discovered' CHECK (status IN ('discovered', 'targeted', 'ranking', 'archived')),
    verified_search_volume INTEGER,
    source TEXT NOT NULL DEFAULT 'manual',
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. SEO Audits Table
CREATE TABLE IF NOT EXISTS public.seo_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_url TEXT NOT NULL,
    audit_type TEXT NOT NULL DEFAULT 'on-page',
    issues JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
    score INTEGER CHECK (score >= 0 AND score <= 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Competitor Reports Table
CREATE TABLE IF NOT EXISTS public.competitor_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competitor_name TEXT NOT NULL,
    website_url TEXT,
    products_analyzed JSONB NOT NULL DEFAULT '[]'::jsonb,
    pricing_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
    seo_opportunities JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_urls TEXT[] NOT NULL DEFAULT '{}',
    research_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Campaigns Table
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    objective TEXT,
    target_audience TEXT,
    channels TEXT[] NOT NULL DEFAULT '{}',
    budget NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    start_date DATE,
    end_date DATE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'active', 'paused', 'completed')),
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Approval Requests Table (Critical Gate)
CREATE TABLE IF NOT EXISTS public.approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type TEXT NOT NULL CHECK (action_type IN ('content_publish', 'customer_message', 'campaign_launch', 'website_change', 'automation_action')),
    title TEXT NOT NULL,
    proposed_content JSONB NOT NULL,
    destination TEXT NOT NULL,
    agent_id TEXT REFERENCES public.agent_definitions(id) ON DELETE SET NULL,
    risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revision_requested', 'executed')),
    requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Automation Configs Table
CREATE TABLE IF NOT EXISTS public.automation_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('new_lead', 'lead_followup', 'weekly_seo', 'content_calendar', 'daily_summary')),
    workflow_identifier TEXT,
    webhook_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    test_mode BOOLEAN NOT NULL DEFAULT TRUE,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Automation Runs Table
CREATE TABLE IF NOT EXISTS public.automation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID NOT NULL REFERENCES public.automation_configs(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('started', 'success', 'failed', 'retrying')),
    trigger_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Activity Logs Table (Append-Only Audit)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    actor_type TEXT NOT NULL DEFAULT 'user' CHECK (actor_type IN ('user', 'agent', 'system')),
    actor_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for high-frequency queries
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON public.leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON public.leads(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_approval_status ON public.approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_content_status ON public.content_items(status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at DESC);
