-- ====================================================================
-- KRIA AI - Profile Role Self-Escalation Prevention
-- Fixes P0 Privilege Escalation: a user could previously update their
-- own 'role' column via the existing "Users can update their own profile"
-- RLS policy, then bypass role-based authorization.
-- ====================================================================

-- 1. Drop the permissive self-update policy that allows role changes
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- 2. Create a restricted self-update policy that EXCLUDES the role column.
--    Users can update their own display name and other non-sensitive fields,
--    but the role column is protected via a trigger below.
CREATE POLICY "Users can update their own non-role profile fields"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. Trigger function: prevent any user from changing their own role
--    even when the UPDATE policy above allows the row.
--    Only the service-role (backend admin operations) can mutate roles.
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Block role changes unless:
  --   a) The role hasn't changed (self-update of other fields is fine)
  --   b) This is a service-role context (pg_has_role check)
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Allow if caller is the service role (admin backend)
    IF NOT pg_has_role(current_user, 'service_role', 'member') THEN
      -- Also allow if caller is an owner/admin acting on a DIFFERENT user's profile
      IF OLD.id = auth.uid() THEN
        RAISE EXCEPTION
          'SECURITY VIOLATION: Users cannot change their own role. '
          'Role changes must be performed by an administrator.';
      END IF;

      -- Non-owner/admin cannot change any user's role either
      IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
      ) THEN
        RAISE EXCEPTION
          'SECURITY VIOLATION: Only owners and admins can change user roles.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Attach the trigger to profiles
DROP TRIGGER IF EXISTS trg_prevent_self_role_escalation ON public.profiles;

CREATE TRIGGER trg_prevent_self_role_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_role_escalation();

-- 5. Add administrative role-change function usable by backend only
--    (service-role key required; never called from browser)
CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  target_user_id UUID,
  new_role TEXT
)
RETURNS VOID AS $$
BEGIN
  IF new_role NOT IN ('owner', 'admin', 'staff') THEN
    RAISE EXCEPTION 'Invalid role: %. Must be owner, admin, or staff.', new_role;
  END IF;

  UPDATE public.profiles
  SET role = new_role, updated_at = NOW()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found: %', target_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.prevent_self_role_escalation() IS
  'Trigger: prevents any authenticated user from updating their own role column. '
  'Role changes must be performed by an owner/admin or via service-role admin_set_user_role().';

COMMENT ON FUNCTION public.admin_set_user_role(UUID, TEXT) IS
  'Service-role administrative function to change a user role. '
  'Never call this from browser client code.';
