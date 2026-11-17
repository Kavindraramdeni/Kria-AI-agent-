-- ====================================================================
-- KRIA AI - Database-Level Audit Log Immutability Migration
-- Ensures activity_logs table is mathematically and structurally append-only
-- ====================================================================

-- Function to raise fatal exception on any attempt to modify or delete audit rows
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'SECURITY VIOLATION: activity_logs table is strictly append-only. UPDATE and DELETE operations are permanently forbidden.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on activity_logs for UPDATE or DELETE
DROP TRIGGER IF EXISTS trg_enforce_audit_log_immutability ON public.activity_logs;

CREATE TRIGGER trg_enforce_audit_log_immutability
BEFORE UPDATE OR DELETE ON public.activity_logs
FOR EACH ROW
EXECUTE FUNCTION public.prevent_audit_log_mutation();
