-- ====================================================================
-- KRIA AI - Approval Execution State Machine Migration
-- Adds idempotency_key, execution_result, and proper execution states.
-- Fixes P0 schema mismatch: execution-dispatcher.ts references these
-- columns but they were absent from all prior migrations.
-- ====================================================================

-- 1. Add idempotency_key column with UNIQUE constraint
--    Prevents duplicate execution on retry/replay of the same request.
ALTER TABLE public.approval_requests
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;

-- 2. Add execution_result JSONB column
--    Stores the full durable dispatch result for idempotency replay.
ALTER TABLE public.approval_requests
  ADD COLUMN IF NOT EXISTS execution_result JSONB;

-- 3. Expand the status enum to support proper state machine transitions.
--    Current states: pending, approved, rejected, revision_requested, executed
--    New states added:
--      processing  - Dispatcher has claimed the approval; executing action
--      succeeded   - Action confirmed complete by external/internal confirmation
--      failed      - Action attempted but failed; approval NOT permanently consumed
--
--    We do this by altering the CHECK constraint. In Postgres we must drop
--    and re-add the constraint.
ALTER TABLE public.approval_requests
  DROP CONSTRAINT IF EXISTS approval_requests_status_check;

ALTER TABLE public.approval_requests
  ADD CONSTRAINT approval_requests_status_check
  CHECK (status IN (
    'pending',
    'approved',
    'rejected',
    'revision_requested',
    'processing',
    'succeeded',
    'failed',
    'executed'   -- kept for backward compat with existing live rows
  ));

-- 4. Add dispatch_error TEXT column to record failure details
ALTER TABLE public.approval_requests
  ADD COLUMN IF NOT EXISTS dispatch_error TEXT;

-- 5. Add dispatch_started_at TIMESTAMPTZ to record when processing began
--    Used for timeout/stale-lock detection in recovery reconciliation.
ALTER TABLE public.approval_requests
  ADD COLUMN IF NOT EXISTS dispatch_started_at TIMESTAMPTZ;

-- 6. Indexes for execution state queries
CREATE INDEX IF NOT EXISTS idx_approval_idempotency_key
  ON public.approval_requests(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_approval_processing
  ON public.approval_requests(status)
  WHERE status = 'processing';

COMMENT ON COLUMN public.approval_requests.idempotency_key IS
  'Client-supplied unique key; UNIQUE constraint prevents duplicate execution. '
  'Dispatcher checks this before claiming the approval row.';

COMMENT ON COLUMN public.approval_requests.execution_result IS
  'Full JSON result of the last execution attempt, stored for idempotency replay. '
  'Populated AFTER the external dispatch succeeds or fails.';

COMMENT ON COLUMN public.approval_requests.dispatch_error IS
  'Human-readable error from a failed dispatch attempt. '
  'Set when status transitions to failed.';

COMMENT ON COLUMN public.approval_requests.dispatch_started_at IS
  'Timestamp when the dispatcher first claimed this approval (status -> processing). '
  'Used for stale-lock detection; records stuck in processing > 5 minutes are eligible for retry.';
