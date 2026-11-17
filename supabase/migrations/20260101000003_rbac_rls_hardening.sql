-- ====================================================================
-- KRIA AI - RBAC & Role-Level Security (RLS) Hardening
-- Enforces Owner vs Staff authorization boundaries on critical actions
-- ====================================================================

-- Helper function to check if the current user is an Owner or Admin
CREATE OR REPLACE FUNCTION public.is_owner_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('owner', 'admin')
  ) OR (
    auth.jwt() ->> 'role' IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Hardened Approval Requests RLS
DROP POLICY IF EXISTS "Authenticated users can update approval requests" ON public.approval_requests;

-- Only Owner or Admin can review, approve, reject, or execute approvals
CREATE POLICY "Only owners and admins can update approval requests"
    ON public.approval_requests FOR UPDATE
    TO authenticated
    USING (public.is_owner_or_admin())
    WITH CHECK (public.is_owner_or_admin());

-- 2. Hardened Products RLS (Prevent Staff from deleting product catalog)
DROP POLICY IF EXISTS "Authenticated users can delete products" ON public.products;

CREATE POLICY "Only owners and admins can delete products"
    ON public.products FOR DELETE
    TO authenticated
    USING (public.is_owner_or_admin());

-- 3. Hardened Automation Configurations RLS
DROP POLICY IF EXISTS "Authenticated users can manage automation configs" ON public.automation_configs;

CREATE POLICY "Authenticated users can view automation configs"
    ON public.automation_configs FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only owners and admins can manage automation configs"
    ON public.automation_configs FOR ALL
    TO authenticated
    USING (public.is_owner_or_admin())
    WITH CHECK (public.is_owner_or_admin());

-- 4. Hardened Campaigns RLS (Prevent Staff from launching or mutating ad budgets)
DROP POLICY IF EXISTS "Authenticated users can manage campaigns" ON public.campaigns;

CREATE POLICY "Authenticated users can view campaigns"
    ON public.campaigns FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only owners and admins can manage campaigns"
    ON public.campaigns FOR ALL
    TO authenticated
    USING (public.is_owner_or_admin())
    WITH CHECK (public.is_owner_or_admin());
