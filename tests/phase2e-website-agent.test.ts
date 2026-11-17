import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeWebsiteAuditAgent } from '@/lib/services/website-ux-agent';
import { inspectHtml } from '@/lib/services/html-inspector';
import { WebsiteAgentOutputSchema } from '@/lib/agents/schemas';
import { NextRequest } from 'next/server';

// Mock the Gemini client wrapper
vi.mock('@/lib/ai/gemini-client', () => ({
  getGeminiClient: vi.fn(),
  generateStructuredWithGemini: vi.fn(),
}));

// Top-level controllable mock state
const mockSessionState = {
  currentSession: null as any,
};

vi.mock('@/lib/auth/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/session')>();
  return {
    ...actual,
    getServerSession: vi.fn().mockImplementation(() => Promise.resolve(mockSessionState.currentSession)),
    isAuthorizedOwner: vi.fn().mockImplementation(() => {
      const s = mockSessionState.currentSession;
      return Promise.resolve(Boolean(s && (s.role === 'owner' || s.role === 'admin')));
    }),
  };
});

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    from: (table: string) => ({
      insert: (rows: any[]) => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: 'mock-audit-uuid-phase2e' }, error: null }),
        }),
      }),
      update: () => ({
        eq: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
  }),
}));

// Mock Approval request service
vi.mock('@/lib/services/approvals', () => ({
  createApprovalRequest: vi.fn().mockResolvedValue({
    success: true,
    data: {
      id: 'mock-approval-uuid-phase2e',
      status: 'pending',
      action_type: 'website_change',
    },
  }),
}));

import { generateStructuredWithGemini } from '@/lib/ai/gemini-client';
import { createApprovalRequest } from '@/lib/services/approvals';
import { POST as runAgent } from '@/app/api/agents/[agentId]/run/route';

describe('Phase 2E — Real Website UX & On-Page SEO Audit Agent', () => {
  const originalEnv = { ...process.env };

  const validKriaHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Custom Acrylic Photo Frames | KRIA TECH Hyderabad Factory</title>
  <meta name="description" content="Direct factory wholesale acrylic photo frames & fridge magnets crafted in Hyderabad from 2mm virgin cell-cast acrylic with flush N35 neodymium magnets.">
  <link rel="canonical" href="https://kriatech.com/products/acrylic-frames">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta property="og:title" content="Custom Acrylic Photo Frames | KRIA TECH">
  <meta property="og:description" content="Precision fabricated 2mm cast acrylic photo frames.">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": "Classic Rectangle Acrylic Photo Magnet (6x4)",
    "sku": "KRA-REC-0604",
    "description": "2mm cell-cast acrylic with flush N35 neodymium magnet.",
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "INR",
      "lowPrice": 79,
      "highPrice": 113,
      "priceRange": "₹79 - ₹113",
      "offerCount": 5
    }
  }
  </script>
</head>
<body>
  <h1>Custom Acrylic Photo Frames & Fridge Magnets</h1>
  <h2>Precision Laser Cut Cast Acrylic</h2>
  <img src="/images/6x4-frame.webp" alt="KRIA 6x4 monolithic acrylic photo magnet with flush neodymium magnet">
  <img src="/images/tabletop-block.webp" alt="KRIA 20mm tabletop magnetic photo block with diamond-beveled polish">
</body>
</html>
  `.trim();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.GEMINI_API_KEY = 'valid-test-gemini-key';
    mockSessionState.currentSession = {
      id: 'test-owner-001',
      email: 'admin@kriatech.com',
      role: 'owner',
      fullName: 'Kria Owner',
      isDemo: false,
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('1. Deterministic HTML & Schema.org Inspection Engine', () => {
    it('evaluates fully optimized HTML, extracts facts, and awards 100/100 score', () => {
      const result = inspectHtml(validKriaHtml, 'https://kriatech.com/products/acrylic-frames');

      expect(result.totalScore).toBe(100);
      expect(result.facts.pageTitle).toBe('Custom Acrylic Photo Frames | KRIA TECH Hyderabad Factory');
      expect(result.facts.titleLength).toBeGreaterThanOrEqual(30);
      expect(result.facts.titleLength).toBeLessThanOrEqual(65);
      expect(result.facts.canonicalUrl).toBe('https://kriatech.com/products/acrylic-frames');
      expect(result.facts.isMobileResponsive).toBe(true);
      expect(result.facts.h1Count).toBe(1);
      expect(result.facts.totalImages).toBe(2);
      expect(result.facts.imagesMissingAlt).toBe(0);
      expect(result.facts.productSchema.found).toBe(true);
      expect(result.facts.productSchema.hasAggregateOffer).toBe(true);
      expect(result.facts.productSchema.priceCurrency).toBe('INR');
      expect(result.detectedIssues).toHaveLength(0);
    });

    it('identifies missing Schema AggregateOffer and missing image alt tags with deterministic point deductions', () => {
      const htmlWithoutSchemaOrAlt = `
<!DOCTYPE html>
<html>
<head>
  <title>Short Title</title>
  <!-- Missing meta description -->
  <!-- Missing canonical -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  <h1>Page Title 1</h1>
  <h1>Page Title 2</h1>
  <img src="/img1.jpg">
  <img src="/img2.jpg">
</body>
</html>
      `.trim();

      const result = inspectHtml(htmlWithoutSchemaOrAlt, 'https://example.com/unoptimized');

      expect(result.totalScore).toBeLessThan(60);
      expect(result.facts.metaDescription).toBeNull();
      expect(result.facts.canonicalUrl).toBeNull();
      expect(result.facts.h1Count).toBe(2);
      expect(result.facts.imagesMissingAlt).toBe(2);
      expect(result.facts.productSchema.found).toBe(false);

      // Check detected issues list
      const issues = result.detectedIssues.map((i) => i.issue);
      expect(issues).toContainEqual(expect.stringContaining('Missing meta description tag'));
      expect(issues).toContainEqual(expect.stringContaining('Missing rel="canonical"'));
      expect(issues).toContainEqual(expect.stringContaining('Multiple (2) <h1> tags'));
      expect(issues).toContainEqual(expect.stringContaining('Missing alt attributes on 2 image(s)'));
      expect(issues).toContainEqual(expect.stringContaining('Missing Product Schema markup'));
    });
  });

  describe('2. Real Web Fetching & Reality Audit Constraints', () => {
    it('rejects invalid or non-HTTP/HTTPS URLs before fetching', async () => {
      const result = await executeWebsiteAuditAgent({
        target_url: 'ftp://ftp.example.com/file',
      });

      expect(result.success).toBe(false);
      expect(result.execution_mode).toBe('error');
      expect(result.model_invoked).toBe(false);
      expect(result.is_simulated).toBe(false);
      expect(result.error).toContain("Unsupported protocol 'ftp:'");
    });

    it('strictly fails and never claims URL was scanned when HTTP fetch returns 404 or network error', async () => {
      // Mock global fetch returning 404
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as any);

      try {
        const result = await executeWebsiteAuditAgent({
          target_url: 'https://kriatech.com/non-existent-page',
        });

        expect(result.success).toBe(false);
        expect(result.execution_mode).toBe('error');
        expect(result.model_invoked).toBe(false);
        expect(result.is_simulated).toBe(false);
        expect(result.error).toContain('HTTP Fetch Failed: Target URL returned status 404 (Not Found)');
        expect(result.error).toContain('The URL was not scanned');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('strictly fails when network connection times out or throws', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Connection timed out after 10000ms'));

      try {
        const result = await executeWebsiteAuditAgent({
          target_url: 'https://unreachable-domain-12345.com',
        });

        expect(result.success).toBe(false);
        expect(result.execution_mode).toBe('error');
        expect(result.model_invoked).toBe(false);
        expect(result.error).toContain('Network Fetch Failed');
        expect(result.error).toContain('The URL was not scanned');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('3. Truth-in-Product Guardrails', () => {
    it('strictly rejects input containing forbidden absolute claims ("never scratches")', async () => {
      const result = await executeWebsiteAuditAgent({
        target_url: 'https://kriatech.com/products/acrylic-frames',
        topic_or_prompt: 'Verify that this page proves our acrylic never scratches and is 100% scratch-proof',
      });

      expect(result.success).toBe(false);
      expect(result.execution_mode).toBe('error');
      expect(result.model_invoked).toBe(false);
      expect(result.error).toContain("unsupported absolute claim ('never scratches' / 'scratch-proof')");
    });
  });

  describe('4. Real Gemini AI Synthesis & Output Schema Validation', () => {
    it('synthesizes actionable recommendations matching measured score and routes proposal to approval queue', async () => {
      const mockAuditOutput = {
        target_url: 'https://kriatech.com/products/acrylic-frames',
        page_title: 'Custom Acrylic Photo Frames | KRIA TECH Hyderabad Factory',
        detected_issues: [
          {
            severity: 'medium' as const,
            issue: 'Call-to-Action for B2B wholesale catalog inquiry is below the fold on mobile.',
            fix: 'Add floating "Request Wholesale Quote" sticky button on mobile viewport.',
          },
        ],
        seo_score: 100, // Matches measured inspection score
        mobile_ux_notes:
          'Page achieves strong 100/100 technical baseline. Add a sticky mobile bar with 1-tap WhatsApp catalog request to accelerate B2B conversion for Hyderabad and Mumbai photographers.',
        reasoning_summary:
          'Technical on-page audit validated 100% semantic compliance for Title, Canonical, Viewport, Single H1, WebP imagery with alt tags, and Schema.org AggregateOffer.',
        sources: ['HTML Source Inspection', 'Schema.org Product Standards'],
        verified_facts: [
          'Page declares Schema.org AggregateOffer with INR price range ₹79 - ₹113.',
          'Mobile viewport meta tag is properly configured.',
        ],
        assumptions: ['Target web server delivers gzip/brotli compression.'],
      };

      vi.mocked(generateStructuredWithGemini).mockResolvedValueOnce({
        data: mockAuditOutput,
        model: 'gemini-3.5-flash-lite',
        rawJson: JSON.stringify(mockAuditOutput),
      });

      const result = await executeWebsiteAuditAgent({
        target_url: 'https://kriatech.com/products/acrylic-frames',
        mockHtml: validKriaHtml,
        actor_email: 'admin@kriatech.com',
      });

      // Honest Execution Metadata
      expect(result.success).toBe(true);
      expect(result.execution_mode).toBe('live_ai');
      expect(result.model_invoked).toBe(true);
      expect(result.is_simulated).toBe(false);
      expect(result.model_name).toBe('gemini-3.5-flash-lite');
      expect(result.measured_score).toBe(100);

      // Validated Output against Schema
      expect(result.output).toBeDefined();
      const parsed = WebsiteAgentOutputSchema.parse(result.output);
      expect(parsed.target_url).toBe('https://kriatech.com/products/acrylic-frames');
      expect(parsed.seo_score).toBe(100);
      expect(parsed.mobile_ux_notes).toContain('sticky mobile bar');

      // Persistence in Supabase seo_audits
      expect(result.saved_audit_id).toBe('mock-audit-uuid-phase2e');

      // Routing to Approval Gate
      expect(result.approval_id).toBe('mock-approval-uuid-phase2e');
      expect(createApprovalRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          action_type: 'website_change',
          agent_id: 'website-agent',
          risk_level: 'high',
        })
      );
    });
  });

  describe('5. API Route Integration (/api/agents/website-agent/run)', () => {
    it('returns 200 with live_ai execution metadata and inspection checks breakdown', async () => {
      const mockAuditOutput = {
        target_url: 'https://kriatech.com/products/acrylic-frames',
        page_title: 'Custom Acrylic Photo Frames | KRIA TECH',
        detected_issues: [
          {
            severity: 'high' as const,
            issue: 'Missing Product Schema markup for wholesale bulk pricing tiers.',
            fix: 'Add Schema.org AggregateOffer with priceRange specification.',
          },
        ],
        seo_score: 100,
        mobile_ux_notes: 'Optimize mobile tap targets to 48x48px minimum.',
        reasoning_summary: 'Comprehensive on-page technical and Schema audit.',
        sources: ['HTML Source Inspection'],
        verified_facts: ['Page contains valid title and viewport.'],
        assumptions: ['Static hosting on Edge CDN.'],
      };

      vi.mocked(generateStructuredWithGemini).mockResolvedValueOnce({
        data: mockAuditOutput,
        model: 'gemini-3.5-flash-lite',
        rawJson: JSON.stringify(mockAuditOutput),
      });

      const req = new NextRequest('http://localhost:3000/api/agents/website-agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_url: 'https://kriatech.com/products/acrylic-frames',
          mockHtml: validKriaHtml,
          task_type: 'on_page_audit',
        }),
      });

      const res = await runAgent(req, { params: { agentId: 'website-agent' } });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.execution_mode).toBe('live_ai');
      expect(json.model_invoked).toBe(true);
      expect(json.is_simulated).toBe(false);
      expect(json.output.page_title).toBe('Custom Acrylic Photo Frames | KRIA TECH');
      expect(json.measured_score).toBe(100);
      expect(json.inspection_checks).toBeDefined();
      expect(json.inspection_checks.length).toBeGreaterThanOrEqual(7);
      expect(json.saved_audit_id).toBe('mock-audit-uuid-phase2e');
      expect(json.approval_id).toBe('mock-approval-uuid-phase2e');
    });
  });
});
