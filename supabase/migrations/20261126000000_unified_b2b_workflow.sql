-- ====================================================================
-- KRIA AI - Unified B2B Bulk-Order Workflow Schema Migration
-- Adds workflow_runs, follow_ups, orders, 6-state execution tracking,
-- approval_requests lead/reply fields, leads source & follow-up fields,
-- activity_logs hash columns, indexes, and RBAC-hardened RLS policies.
-- ====================================================================

-- 0. Reusable updated_at trigger helper for new tables
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Workflow Runs Table (created before follow_ups & orders; deferred FKs added below)
CREATE TABLE IF NOT EXISTS public.workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'B2B Bulk Order Workflow',
  objective TEXT NOT NULL DEFAULT 'Bulk magnetic acrylic frame order',
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  latest_approval_id UUID REFERENCES public.approval_requests(id) ON DELETE SET NULL,
  latest_follow_up_id UUID,
  order_id UUID,
  current_stage TEXT NOT NULL DEFAULT 'research' CHECK (
    current_stage IN (
      'research',
      'outreach_prepared',
      'awaiting_approval',
      'dispatched',
      'awaiting_reply',
      'qualified',
      'quoted',
      'follow_up',
      'order_confirmed',
      'completed',
      'failed'
    )
  ),
  execution_state TEXT NOT NULL DEFAULT 'ai_generated' CHECK (
    execution_state IN (
      'ai_generated',
      'awaiting_approval',
      'simulated',
      'sent_to_provider',
      'provider_accepted',
      'customer_responded'
    )
  ),
  stage_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Follow-Ups Table (Durable Follow-Up Automation)
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  workflow_run_id UUID REFERENCES public.workflow_runs(id) ON DELETE SET NULL,
  approval_id UUID REFERENCES public.approval_requests(id) ON DELETE SET NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  assigned_action TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (
    channel IN ('whatsapp', 'email', 'call', 'phone', 'manual')
  ),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (
    status IN ('scheduled', 'due', 'overdue', 'prepared', 'completed', 'cancelled')
  ),
  prepared_message TEXT,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Orders Table (B2B Order & Revenue Tracking)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  workflow_run_id UUID REFERENCES public.workflow_runs(id) ON DELETE SET NULL,
  approval_id UUID REFERENCES public.approval_requests(id) ON DELETE SET NULL,
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_inr NUMERIC(12,2) NOT NULL CHECK (unit_price_inr >= 0),
  total_inr NUMERIC(12,2) NOT NULL CHECK (total_inr >= 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'confirmed', 'in_production', 'dispatched', 'delivered', 'cancelled')
  ),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    payment_status IN ('pending', 'unpaid', 'partial', 'paid', 'refunded')
  ),
  notes TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Deferred Circular FKs on workflow_runs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_workflow_runs_latest_follow_up'
  ) THEN
    ALTER TABLE public.workflow_runs
      ADD CONSTRAINT fk_workflow_runs_latest_follow_up
      FOREIGN KEY (latest_follow_up_id) REFERENCES public.follow_ups(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_workflow_runs_order'
  ) THEN
    ALTER TABLE public.workflow_runs
      ADD CONSTRAINT fk_workflow_runs_order
      FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. Approval Requests Extensions (Lead/Workflow Link + 6-State Execution + Inbound Reply)
ALTER TABLE public.approval_requests
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS workflow_run_id UUID REFERENCES public.workflow_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS execution_state TEXT NOT NULL DEFAULT 'awaiting_approval',
  ADD COLUMN IF NOT EXISTS provider_message_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_response TEXT;

ALTER TABLE public.approval_requests
  DROP CONSTRAINT IF EXISTS approval_requests_execution_state_check;

ALTER TABLE public.approval_requests
  ADD CONSTRAINT approval_requests_execution_state_check
  CHECK (
    execution_state IN (
      'ai_generated',
      'awaiting_approval',
      'simulated',
      'sent_to_provider',
      'provider_accepted',
      'customer_responded'
    )
  );

-- 6. Leads Table Updates (Source CHECK Expansion + Follow-Up/Contact Timestamps)
DO $$
DECLARE
  c_name TEXT;
BEGIN
  FOR c_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'leads'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%source%'
      AND pg_get_constraintdef(con.oid) ILIKE '%b2b_inquiry%'
  LOOP
    EXECUTE format('ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS %I', c_name);
  END LOOP;
END $$;

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_source_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_source_check
  CHECK (
    source IN (
      'website',
      'whatsapp',
      'instagram',
      'direct',
      'referral',
      'b2b_inquiry',
      'trade_show',
      'kriatech_storefront',
      'b2b_research',
      'kriatech_storefront_whatsapp',
      'kriatech_sample_order',
      'other'
    )
  );

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

-- 7. Activity Logs Hash Columns (DDL-only; no UPDATE so audit immutability trigger is never fired)
ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS previous_hash TEXT,
  ADD COLUMN IF NOT EXISTS hash TEXT;

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_runs_lead_id ON public.workflow_runs(lead_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_stage_state ON public.workflow_runs(current_stage, execution_state);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_updated_at ON public.workflow_runs(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_follow_ups_lead_id ON public.follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_workflow_run_id ON public.follow_ups(workflow_run_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status_scheduled ON public.follow_ups(status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_orders_lead_id ON public.orders(lead_id);
CREATE INDEX IF NOT EXISTS idx_orders_workflow_run_id ON public.orders(workflow_run_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_approval_requests_lead_id ON public.approval_requests(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_approval_requests_workflow_run_id ON public.approval_requests(workflow_run_id) WHERE workflow_run_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_approval_requests_execution_state ON public.approval_requests(execution_state);

CREATE INDEX IF NOT EXISTS idx_leads_next_follow_up_at ON public.leads(next_follow_up_at) WHERE next_follow_up_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_logs_hash ON public.activity_logs(hash) WHERE hash IS NOT NULL;

-- 9. Updated-at Triggers for New Tables
DROP TRIGGER IF EXISTS trg_workflow_runs_updated_at ON public.workflow_runs;
CREATE TRIGGER trg_workflow_runs_updated_at
BEFORE UPDATE ON public.workflow_runs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_follow_ups_updated_at ON public.follow_ups;
CREATE TRIGGER trg_follow_ups_updated_at
BEFORE UPDATE ON public.follow_ups
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 10. Row Level Security (RLS) Policies (No anon access; RBAC aligned with 20260101000003)
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- workflow_runs RLS
DROP POLICY IF EXISTS "Authenticated users can view workflow runs" ON public.workflow_runs;
CREATE POLICY "Authenticated users can view workflow runs"
  ON public.workflow_runs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert workflow runs" ON public.workflow_runs;
CREATE POLICY "Authenticated users can insert workflow runs"
  ON public.workflow_runs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update workflow runs" ON public.workflow_runs;
CREATE POLICY "Authenticated users can update workflow runs"
  ON public.workflow_runs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Only owners and admins can delete workflow runs" ON public.workflow_runs;
CREATE POLICY "Only owners and admins can delete workflow runs"
  ON public.workflow_runs FOR DELETE TO authenticated USING (public.is_owner_or_admin());

-- follow_ups RLS
DROP POLICY IF EXISTS "Authenticated users can view follow ups" ON public.follow_ups;
CREATE POLICY "Authenticated users can view follow ups"
  ON public.follow_ups FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert follow ups" ON public.follow_ups;
CREATE POLICY "Authenticated users can insert follow ups"
  ON public.follow_ups FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update follow ups" ON public.follow_ups;
CREATE POLICY "Authenticated users can update follow ups"
  ON public.follow_ups FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Only owners and admins can delete follow ups" ON public.follow_ups;
CREATE POLICY "Only owners and admins can delete follow ups"
  ON public.follow_ups FOR DELETE TO authenticated USING (public.is_owner_or_admin());

-- orders RLS
DROP POLICY IF EXISTS "Authenticated users can view orders" ON public.orders;
CREATE POLICY "Authenticated users can view orders"
  ON public.orders FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert orders" ON public.orders;
CREATE POLICY "Authenticated users can insert orders"
  ON public.orders FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Only owners and admins can update orders" ON public.orders;
CREATE POLICY "Only owners and admins can update orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (public.is_owner_or_admin()) WITH CHECK (public.is_owner_or_admin());

DROP POLICY IF EXISTS "Only owners and admins can delete orders" ON public.orders;
CREATE POLICY "Only owners and admins can delete orders"
  ON public.orders FOR DELETE TO authenticated USING (public.is_owner_or_admin());
