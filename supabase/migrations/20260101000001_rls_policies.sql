-- ====================================================================
-- KRIA AI - Row Level Security (RLS) Policies Migration
-- Enforces strict authentication on all exposed tables.
-- Unauthenticated / Anonymous access is completely disallowed.
-- ====================================================================

-- 1. Profiles Table RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- 2. Products Table RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view products"
    ON public.products FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert products"
    ON public.products FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
    ON public.products FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can delete products"
    ON public.products FOR DELETE
    TO authenticated
    USING (true);

-- 3. Leads Table RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view leads"
    ON public.leads FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert leads"
    ON public.leads FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update leads"
    ON public.leads FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can delete leads"
    ON public.leads FOR DELETE
    TO authenticated
    USING (true);

-- 4. Lead Activities Table RLS
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view lead activities"
    ON public.lead_activities FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert lead activities"
    ON public.lead_activities FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 5. Agent Definitions RLS
ALTER TABLE public.agent_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view agent definitions"
    ON public.agent_definitions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can update agent definitions"
    ON public.agent_definitions FOR UPDATE
    TO authenticated
    USING (true);

-- 6. Agent Tasks RLS
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view agent tasks"
    ON public.agent_tasks FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert agent tasks"
    ON public.agent_tasks FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update agent tasks"
    ON public.agent_tasks FOR UPDATE
    TO authenticated
    USING (true);

-- 7. Agent Task Outputs RLS
ALTER TABLE public.agent_task_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view agent task outputs"
    ON public.agent_task_outputs FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert agent task outputs"
    ON public.agent_task_outputs FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 8. Content Items RLS
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view content items"
    ON public.content_items FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert content items"
    ON public.content_items FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update content items"
    ON public.content_items FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete content items"
    ON public.content_items FOR DELETE
    TO authenticated
    USING (true);

-- 9. SEO Keywords RLS
ALTER TABLE public.seo_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view seo keywords"
    ON public.seo_keywords FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert seo keywords"
    ON public.seo_keywords FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update seo keywords"
    ON public.seo_keywords FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete seo keywords"
    ON public.seo_keywords FOR DELETE
    TO authenticated
    USING (true);

-- 10. SEO Audits RLS
ALTER TABLE public.seo_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view seo audits"
    ON public.seo_audits FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert seo audits"
    ON public.seo_audits FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 11. Competitor Reports RLS
ALTER TABLE public.competitor_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view competitor reports"
    ON public.competitor_reports FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert competitor reports"
    ON public.competitor_reports FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 12. Campaigns RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view campaigns"
    ON public.campaigns FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can manage campaigns"
    ON public.campaigns FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 13. Approval Requests RLS (Critical Gate)
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view approval requests"
    ON public.approval_requests FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert approval requests"
    ON public.approval_requests FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update approval requests"
    ON public.approval_requests FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 14. Automation Configs & Runs RLS
ALTER TABLE public.automation_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view automation configs"
    ON public.automation_configs FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can manage automation configs"
    ON public.automation_configs FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can view automation runs"
    ON public.automation_runs FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert automation runs"
    ON public.automation_runs FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 15. Activity Logs RLS (Append-Only)
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view activity logs"
    ON public.activity_logs FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert activity logs"
    ON public.activity_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);
