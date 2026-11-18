import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeSEOStrategyAgent } from '../src/lib/services/seo-strategy';
import { executeContentStudioAgent } from '../src/lib/services/content-studio';
import { executeApprovedAction } from '../src/lib/services/execution-dispatcher';
import { createApprovalRequest, updateApprovalStatus } from '../src/lib/services/approvals';
import * as geminiClientModule from '../src/lib/ai/gemini-client';

describe('Phase 3.3 — End-to-End Agent Workflow Integration Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. PERSISTENCE FAILURES HANDLING
  // =========================================================================
  describe('1. Authenticated Persistence Failure Handling', () => {
    it('captures exact database error when seo_keywords insert fails and does not report false success', async () => {
      // Mock Gemini structured output to succeed
      vi.spyOn(geminiClientModule, 'generateStructuredWithGemini').mockResolvedValueOnce({
        model: 'gemini-3.5-flash-lite',
        rawJson: '{}',
        data: {
          reasoning_summary: 'Targeting commercial procurement for 4x6 frames',
          sources: ['KRIA Factory Spec Sheet'],
          verified_facts: ['20mm thickness Grade-A acrylic'],
          assumptions: ['Corporate buyers look for wholesale quantities'],
          target_cluster: 'Clear Magnetic Acrylic Photo Frame (4x6 inch)',
          recommended_keywords: [
            {
              keyword: 'wholesale 4x6 acrylic photo frame',
              volume_estimate: 500,
              intent: 'commercial',
              target_page: '/products/magnetic-frames',
              priority: 'high',
            },
          ],
          on_page_recommendations: ['Add H1 with exact dimension', 'Include bulk price table'],
          content_gap_analysis: 'Competitors lack transparent pricing for bulk slabs',
        },
      });

      // Mock Supabase client returning an RLS / permission error on seo_keywords insert
      const mockSupabaseError = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: '00000000-0000-0000-0000-000000000001' } }, error: null }),
        },
        from: vi.fn((table: string) => {
          if (table === 'seo_keywords') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({
                  data: null,
                  error: {
                    message: 'new row violates row-level security policy for table "seo_keywords"',
                    code: '42501',
                  },
                }),
              }),
            };
          }
          if (table === 'approval_requests') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'mock-appr-uuid-1' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'activity_logs') {
            return {
              insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }),
      };

      const result = await executeSEOStrategyAgent({
        target_cluster: 'Clear Magnetic Acrylic Photo Frame (4x6 inch)',
        sku: 'MAPF-0406-CL',
        actor_email: 'admin@kriatech.com',
        supabaseClient: mockSupabaseError,
      });

      expect(result.success).toBe(true);
      expect(result.execution_mode).toBe('live_ai');
      // Must honestly capture the persistence error and NOT claim saved keyword IDs
      expect(result.persistence_error).toBe(
        'new row violates row-level security policy for table "seo_keywords"'
      );
      expect(result.saved_keyword_ids).toEqual([]);
    });

    it('captures exact database error when content_items insert fails and preserves draft safety', async () => {
      // Mock Gemini structured output to succeed
      vi.spyOn(geminiClientModule, 'generateStructuredWithGemini').mockResolvedValueOnce({
        model: 'gemini-3.5-flash-lite',
        rawJson: '{}',
        data: {
          title: 'Crafted Precision Magnetic Frame',
          content_type: 'instagram_caption',
          body: 'Every desk deserves a moment frozen in clarity.',
          keywords_used: ['acrylic frame', 'desk decor'],
          suggested_cta: 'Explore wholesale pricing online',
          verified_facts: ['20mm cast acrylic', 'N52 magnets'],
          user_provided_claims: [],
          ai_generated_suggestions: ['Add studio lighting photo'],
        },
      });

      // Mock Supabase client returning a foreign key or RLS error on content_items insert
      const mockSupabaseError = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: '00000000-0000-0000-0000-000000000001' } }, error: null }),
        },
        from: vi.fn((table: string) => {
          if (table === 'content_items') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: {
                      message: 'violates foreign key constraint "content_items_product_id_fkey"',
                      code: '23503',
                    },
                  }),
                }),
              }),
            };
          }
          if (table === 'approval_requests') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'mock-appr-uuid-2' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'activity_logs') {
            return {
              insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }),
      };

      const result = await executeContentStudioAgent({
        sku: 'MAPF-0406-CL',
        content_type: 'instagram_caption',
        actor_email: 'admin@kriatech.com',
        supabaseClient: mockSupabaseError,
      });

      expect(result.success).toBe(true);
      expect(result.execution_mode).toBe('live_ai');
      // Must honestly capture the persistence error and NOT return a fabricated saved content ID
      expect(result.persistence_error).toBe(
        'violates foreign key constraint "content_items_product_id_fkey"'
      );
      expect(result.saved_content_id).toBeUndefined();
    });

    it('returns failure when createApprovalRequest encounters a database insertion failure', async () => {
      const mockSupabaseError = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: '00000000-0000-0000-0000-000000000001' } }, error: null }),
        },
        from: vi.fn(() => ({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database connection terminated unexpectedly' },
              }),
            }),
          }),
        })),
      };

      const res = await createApprovalRequest(
        {
          title: 'Critical DB Test Request',
          action_type: 'campaign_launch',
          risk_level: 'critical',
          requested_by: '00000000-0000-0000-0000-000000000000',
          destination: 'Google Ads',
          proposed_content: {},
        },
        mockSupabaseError as any
      );

      expect(res.success).toBe(false);
      expect(res.error).toBe('Database connection terminated unexpectedly');
      expect(res.data).toBeUndefined();
    });
  });

  // =========================================================================
  // 2. GEMINI AI INVOCATION FAILURES HANDLING
  // =========================================================================
  describe('2. Gemini Invocation Failure Handling & Error Transparency', () => {
    it('SEO Strategy Agent fails honestly on Gemini API errors without mocking fallback', async () => {
      vi.spyOn(geminiClientModule, 'generateStructuredWithGemini').mockRejectedValueOnce(
        new Error('429 RESOURCE_EXHAUSTED: Quota exceeded for quota metric "GenerateContent requests"')
      );

      const result = await executeSEOStrategyAgent({
        target_cluster: 'Clear Magnetic Acrylic Photo Frame (4x6 inch)',
        sku: 'MAPF-0406-CL',
        actor_email: 'admin@kriatech.com',
      });

      expect(result.success).toBe(false);
      expect(result.execution_mode).toBe('error');
      expect(result.model_invoked).toBe(false);
      expect(result.is_simulated).toBe(false);
      expect(result.output).toBeUndefined();
      expect(result.error).toContain('RESOURCE_EXHAUSTED');
      expect(result.error).toContain('Gemini AI Generation Failed');
    });

    it('Content Studio Agent fails honestly on Gemini API errors without mocking fallback', async () => {
      vi.spyOn(geminiClientModule, 'generateStructuredWithGemini').mockRejectedValueOnce(
        new Error('503 Service Unavailable: High server load on Google GenAI backend')
      );

      const result = await executeContentStudioAgent({
        sku: 'MAPF-0406-CL',
        content_type: 'product_description',
        actor_email: 'admin@kriatech.com',
      });

      expect(result.success).toBe(false);
      expect(result.execution_mode).toBe('error');
      expect(result.model_invoked).toBe(false);
      expect(result.is_simulated).toBe(false);
      expect(result.output).toBeUndefined();
      expect(result.error).toContain('503 Service Unavailable');
      expect(result.error).toContain('Gemini AI Generation Failed');
    });

    it('rejects execution immediately when forbidden ungrounded claims are provided', async () => {
      const result = await executeSEOStrategyAgent({
        target_cluster: 'Clear Magnetic Acrylic Photo Frame',
        topic_or_prompt: 'Highlight that our acrylic blocks are 100% scratch-proof and never scratch',
        actor_email: 'admin@kriatech.com',
      });

      expect(result.success).toBe(false);
      expect(result.execution_mode).toBe('error');
      expect(result.model_invoked).toBe(false);
      expect(result.error).toContain('Unsupported or false claims detected');
    });
  });

  // =========================================================================
  // 3. DUPLICATE SUBMISSION & IDEMPOTENCY HANDLING
  // =========================================================================
  describe('3. Duplicate Submission & Idempotency Enforcement', () => {
    it('returns cached idempotent receipt on duplicate execution calls with same key', async () => {
      const createRes = await createApprovalRequest({
        action_type: 'customer_message',
        title: 'Follow up on Quote',
        risk_level: 'low',
        destination: 'WhatsApp',
      });
      const id = createRes.data!.id;
      await updateApprovalStatus(id, 'approved', 'admin@kriatech.com');

      const idempotencyKey = 'idem-unique-key-phase33-001';

      // First run with mock actor and approval
      const firstRun = await executeApprovedAction(
        id,
        { email: 'admin@kriatech.com', role: 'owner' },
        idempotencyKey
      );
      expect(firstRun.success).toBe(true);

      // Second duplicate run with identical idempotencyKey
      const duplicateRun = await executeApprovedAction(
        id,
        { email: 'admin@kriatech.com', role: 'owner' },
        idempotencyKey
      );

      expect(duplicateRun).toEqual(firstRun);
    });

    it('blocks double-execution replay if action is already executed', async () => {
      const createRes = await createApprovalRequest({
        action_type: 'customer_message',
        title: 'Single-use Execution Test',
        risk_level: 'low',
        destination: 'WhatsApp',
      });
      const id = createRes.data!.id;
      await updateApprovalStatus(id, 'approved', 'admin@kriatech.com');

      // First execution
      const firstRun = await executeApprovedAction(
        id,
        { email: 'admin@kriatech.com', role: 'owner' }
      );
      expect(firstRun.success).toBe(true);

      // Second execution without idempotency key -> MUST be blocked as ALREADY_EXECUTED
      const replayRun = await executeApprovedAction(
        id,
        { email: 'admin@kriatech.com', role: 'owner' }
      );
      expect(replayRun.success).toBe(false);
      expect(replayRun.error_code).toBe('ALREADY_EXECUTED');
      expect(replayRun.error).toContain('Action has already been executed');
    });
  });

  // =========================================================================
  // 4. APPROVAL GATING & ROLE ISOLATION
  // =========================================================================
  describe('4. Approval Gate Enforcement & Role Isolation', () => {
    it('strictly denies execution when approval request status is pending', async () => {
      const createRes = await createApprovalRequest({
        action_type: 'website_change',
        title: 'Pending SEO Strategy Update',
        risk_level: 'medium',
        destination: 'Website CMS',
      });
      const id = createRes.data!.id; // Status is 'pending' by default

      const result = await executeApprovedAction(
        id,
        { email: 'admin@kriatech.com', role: 'owner' }
      );

      expect(result.success).toBe(false);
      expect(result.error_code).toBe('NOT_APPROVED');
      expect(result.error).toContain("Action status is 'pending'. Only 'approved' items can be dispatched.");
    });

    it('strictly denies execution when approval request status is rejected', async () => {
      const createRes = await createApprovalRequest({
        action_type: 'content_publish',
        title: 'Rejected Social Post Draft',
        risk_level: 'medium',
        destination: 'Social Feed',
      });
      const id = createRes.data!.id;
      await updateApprovalStatus(id, 'rejected', 'admin@kriatech.com');

      const result = await executeApprovedAction(
        id,
        { email: 'admin@kriatech.com', role: 'owner' }
      );

      expect(result.success).toBe(false);
      expect(result.error_code).toBe('NOT_APPROVED');
      expect(result.error).toContain("Action status is 'rejected'");
    });

    it('strictly blocks staff role from dispatching critical/high-risk actions', async () => {
      const createRes = await createApprovalRequest({
        action_type: 'campaign_launch',
        title: 'Diwali Acrylic Gifting Major Ad Campaign',
        risk_level: 'critical',
        destination: 'Meta Ads API',
      });
      const id = createRes.data!.id;
      await updateApprovalStatus(id, 'approved', 'admin@kriatech.com');

      const result = await executeApprovedAction(
        id,
        { email: 'staff@kriatech.com', role: 'staff' }
      );

      expect(result.success).toBe(false);
      expect(result.error_code).toBe('CRITICAL_ACTION_RESTRICTED');
      expect(result.error).toContain('Critical and high-risk actions require Owner authorization');
    });

    it('strictly denies execution when actor identity is missing or unverified', async () => {
      const createRes = await createApprovalRequest({
        action_type: 'website_change',
        title: 'Approved Schema Update',
        risk_level: 'medium',
        destination: 'Storefront',
      });
      const id = createRes.data!.id;
      await updateApprovalStatus(id, 'approved', 'admin@kriatech.com');

      const result = await executeApprovedAction(id, undefined);

      expect(result.success).toBe(false);
      expect(result.error_code).toBe('UNAUTHORIZED_ACTOR');
      expect(result.error).toContain('Verified actor identity (email and role) is required');
    });
  });
});
