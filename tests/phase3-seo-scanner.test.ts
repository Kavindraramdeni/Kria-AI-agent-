import { describe, it, expect, vi, beforeEach } from 'vitest';
import { performComprehensiveSeoScan } from '@/lib/services/seo-scanner';
import { POST as scanRoute } from '@/app/api/seo/scan/route';
import { NextRequest } from 'next/server';

// Mock the Gemini client wrapper
vi.mock('@/lib/ai/gemini-client', () => ({
  getGeminiClient: vi.fn(),
  generateStructuredWithGemini: vi.fn(),
}));

// Mock user session state
const mockSessionState = {
  currentSession: null as any,
};

vi.mock('@/lib/auth/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/session')>();
  return {
    ...actual,
    getServerSession: vi.fn().mockImplementation(() => Promise.resolve(mockSessionState.currentSession)),
  };
});

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    from: (table: string) => ({
      insert: (rows: any[]) => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: 'mock-audit-uuid-phase3' }, error: null }),
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
      id: 'mock-approval-uuid-phase3',
      status: 'pending',
      action_type: 'website_change',
    },
  }),
}));

import { generateStructuredWithGemini } from '@/lib/ai/gemini-client';
import { createApprovalRequest } from '@/lib/services/approvals';

const SAMPLE_PERFECT_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Magnetic Acrylic Photo Frame (5x7) | KRIA TECH Hyderabad</title>
  <meta name="description" content="Direct factory wholesale magnetic acrylic photo frames manufactured in Hyderabad. 93% optical clarity with diamond polished edges and N35 magnets.">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index, follow">
  <meta property="og:title" content="Magnetic Acrylic Photo Frame (5x7) | KRIA TECH">
  <meta property="og:description" content="Precision acrylic photo frames direct from manufacturer in Hyderabad.">
  <meta property="og:image" content="https://kriatech.in/images/frame-5x7.webp">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="https://kriatech.in/products/magnetic-acrylic-frames">
  <script defer src="/scripts/main.js"></script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Magnetic Acrylic Photo Frame (5x7 inch)",
    "sku": "KRIA-FRAME-5X7",
    "image": "https://kriatech.in/images/frame-5x7.webp",
    "description": "Precision laser-cut magnetic acrylic block frame with optical grade acrylic.",
    "brand": {
      "@type": "Brand",
      "name": "KRIA TECH"
    },
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "INR",
      "lowPrice": 79,
      "highPrice": 113,
      "offerCount": 3,
      "priceRange": "₹79 - ₹113"
    }
  }
  </script>
</head>
<body>
  <header>
    <nav>
      <a href="/products">Products</a>
      <a href="/contact">Contact</a>
    </nav>
  </header>
  <main>
    <h1>Magnetic Acrylic Photo Frame (5x7 inch)</h1>
    <h2>Factory Specifications & Optical Clarity</h2>
    <p>Manufactured using cast acrylic sheets with diamond-buffed bevel edges.</p>
    <img src="/images/frame-5x7.webp" alt="Clear Magnetic Acrylic Photo Frame 5x7 inch" width="600" height="400">
    <h2>Wholesale Volume Pricing Tiers</h2>
    <p>Bulk pricing from ₹79 per unit for 500+ quantities.</p>
  </main>
  <footer>
    <p>© 2026 KRIA TECH Hyderabad. All rights reserved.</p>
  </footer>
</body>
</html>
`.trim();

const SAMPLE_DEFECTIVE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Short</title>
  <!-- Missing meta description -->
  <!-- Missing canonical tag -->
  <!-- Render-blocking scripts in head -->
  <script src="https://analytics.external.com/heavy.js"></script>
  <script src="/scripts/blocking-bundle.js"></script>
  <link rel="stylesheet" href="/styles/blocking.css">
</head>
<body>
  <div>
    <h1>Acrylic Photo Frames</h1>
    <!-- Heading hierarchy jump: H1 straight to H3 without H2 -->
    <h3>Unstyled Subheading</h3>
    <!-- Images missing alt attributes and width/height dimensions (CLS hazard) -->
    <img src="/images/unoptimized-photo.png">
    <img src="/images/huge-banner.jpg">
    <a href="#">Click Here</a>
    <a href="">Empty Link</a>
  </div>
</body>
</html>
`.trim();

describe('Phase 3 — Real Website Technical SEO Scanner & Core Web Vitals Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionState.currentSession = {
      id: 'test-admin',
      email: 'admin@kriatech.com',
      role: 'owner',
      fullName: 'KRIA Admin',
      isDemo: false,
    };

    (generateStructuredWithGemini as any).mockResolvedValue({
      model: 'gemini-3.5-flash-lite',
      data: {
        summary: 'Target page exhibits solid technical foundations with high-intent keyword alignment. Immediate focus should resolve render-blocking scripts and declare AggregateOffer wholesale tiers.',
        topPriorities: [
          'Add defer or async attributes to render-blocking scripts in <head>',
          'Specify explicit width and height dimensions on hero and catalog images to prevent CLS',
          'Declare Schema.org AggregateOffer with volume wholesale pricing tiers for rich snippets',
        ],
        mobileActionDirective: 'Introduce a sticky WhatsApp inquiry touch target for instant wholesale RFQ.',
        sources: ['Google Search Central', 'Web Vitals 2026 Standards'],
        verified_facts: ['TTFB measured under 200ms', 'Semantic HTML5 structure present'],
      },
    });
  });

  describe('1. URL Validation & Protocol Rules', () => {
    it('rejects invalid or non-HTTP protocols', async () => {
      await expect(
        performComprehensiveSeoScan({ url: 'ftp://files.kriatech.in/spec.pdf' })
      ).rejects.toThrow(/Unsupported protocol 'ftp:'/);

      await expect(
        performComprehensiveSeoScan({ url: 'not-a-valid-url' })
      ).rejects.toThrow(/Invalid URL/);
    });
  });

  describe('2. Network Diagnostics & Compression Verification', () => {
    it('measures network payload, compression, and security headers accurately', async () => {
      const scan = await performComprehensiveSeoScan({
        url: 'https://kriatech.in/products/magnetic-acrylic-frames',
        mockHtml: SAMPLE_PERFECT_HTML,
        mockHeaders: {
          'content-type': 'text/html; charset=utf-8',
          'content-encoding': 'gzip',
          'cache-control': 'public, max-age=86400',
          'strict-transport-security': 'max-age=31536000; includeSubDomains',
          'x-content-type-options': 'nosniff',
          'x-frame-options': 'DENY',
          'content-security-policy': "default-src 'self'",
        },
      });

      expect(scan.executionMode).toBe('mock');
      expect(scan.network.isCompressed).toBe(true);
      expect(scan.network.contentEncoding).toBe('gzip');
      expect(scan.network.payloadSizeKb).toBeGreaterThan(0);
      expect(scan.network.securityHeaders.strictTransportSecurity).toBe(true);
      expect(scan.network.securityHeaders.xContentTypeOptions).toBe(true);
      expect(scan.network.securityHeaders.xFrameOptions).toBe(true);
      expect(scan.network.securityHeaders.contentSecurityPolicy).toBe(true);
    });
  });

  describe('3. Deep DOM Parsing & Technical SEO Health', () => {
    it('correctly evaluates optimal title, meta description, and canonical tags', async () => {
      const scan = await performComprehensiveSeoScan({
        url: 'https://kriatech.in/products/magnetic-acrylic-frames',
        mockHtml: SAMPLE_PERFECT_HTML,
      });

      expect(scan.dom.title.status).toBe('optimal');
      expect(scan.dom.title.value).toContain('Magnetic Acrylic Photo Frame');
      expect(scan.dom.metaDescription.status).toBe('optimal');
      expect(scan.dom.canonical.status).toBe('valid');
      expect(scan.dom.canonical.isSelfReferencing).toBe(true);
      expect(scan.dom.robots.isNoIndex).toBe(false);
      expect(scan.dom.headings.h1Count).toBe(1);
      expect(scan.dom.headings.h2Count).toBe(2);
      expect(scan.dom.headings.hierarchyJumpsDetected).toBe(false);
      expect(scan.dom.semanticHtml.hasHeader).toBe(true);
      expect(scan.dom.semanticHtml.hasMain).toBe(true);
      expect(scan.dom.semanticHtml.hasFooter).toBe(true);
    });

    it('detects defective DOM: missing description, heading hierarchy jumps, and bad links', async () => {
      const scan = await performComprehensiveSeoScan({
        url: 'https://kriatech.in/products/acrylic-frames',
        mockHtml: SAMPLE_DEFECTIVE_HTML,
      });

      expect(scan.dom.title.status).toBe('short');
      expect(scan.dom.metaDescription.status).toBe('missing');
      expect(scan.dom.canonical.status).toBe('missing');
      expect(scan.dom.headings.hierarchyJumpsDetected).toBe(true);
      expect(scan.dom.semanticHtml.hasMain).toBe(false);
      expect(scan.dom.links.emptyOrHash).toBeGreaterThanOrEqual(1);

      // Verify issues are explicitly flagged
      const issueTitles = scan.issues.map((i) => i.issue);
      expect(issueTitles.some((t) => t.includes('Missing meta description tag in page header'))).toBe(true);
      expect(issueTitles.some((t) => t.includes('Heading hierarchy skipped levels'))).toBe(true);
      expect(issueTitles.some((t) => t.includes('Missing rel="canonical" link element'))).toBe(true);
    });
  });

  describe('4. Core Web Vitals Server-Side Diagnostics', () => {
    it('diagnoses render-blocking scripts in <head> and image CLS hazards', async () => {
      const scan = await performComprehensiveSeoScan({
        url: 'https://kriatech.in/products/acrylic-frames',
        mockHtml: SAMPLE_DEFECTIVE_HTML,
      });

      // 2 render-blocking scripts in defective HTML head
      expect(scan.coreWebVitals.renderBlockingScriptsCount).toBe(2);
      // 2 images in defective HTML missing both alt and width/height dimensions
      expect(scan.dom.images.missingDimensions).toBe(2);
      expect(scan.dom.images.missingAlt).toBe(2);

      const issueTitles = scan.issues.map((i) => i.issue);
      expect(issueTitles.some((t) => t.includes('render-blocking <script> tag(s) in <head>'))).toBe(true);
      expect(issueTitles.some((t) => t.includes('missing explicit width and height attributes (CLS Risk)'))).toBe(true);
      expect(issueTitles.some((t) => t.includes('missing descriptive alt attributes'))).toBe(true);
    });

    it('verifies optimal image dimension declarations on perfect HTML', async () => {
      const scan = await performComprehensiveSeoScan({
        url: 'https://kriatech.in/products/magnetic-acrylic-frames',
        mockHtml: SAMPLE_PERFECT_HTML,
      });

      expect(scan.coreWebVitals.renderBlockingScriptsCount).toBe(0);
      expect(scan.dom.images.missingDimensions).toBe(0);
      expect(scan.dom.images.missingAlt).toBe(0);
    });
  });

  describe('5. Schema.org Rich Results & B2B Wholesale Pricing Verification', () => {
    it('validates Product entity and AggregateOffer wholesale tier compliance', async () => {
      const scan = await performComprehensiveSeoScan({
        url: 'https://kriatech.in/products/magnetic-acrylic-frames',
        mockHtml: SAMPLE_PERFECT_HTML,
      });

      expect(scan.schema.productSchema.found).toBe(true);
      expect(scan.schema.productSchema.sku).toBe('KRIA-FRAME-5X7');
      expect(scan.schema.productSchema.hasOffers).toBe(true);
      expect(scan.schema.productSchema.hasAggregateOffer).toBe(true);
      expect(scan.schema.productSchema.googleRichResultsEligible).toBe(true);
      expect(scan.scores.structuredData).toBeGreaterThanOrEqual(90);
    });

    it('penalizes missing Schema.org Product markup and flags missing offers', async () => {
      const scan = await performComprehensiveSeoScan({
        url: 'https://kriatech.in/products/acrylic-frames',
        mockHtml: SAMPLE_DEFECTIVE_HTML,
      });

      expect(scan.schema.productSchema.found).toBe(false);
      expect(scan.schema.productSchema.googleRichResultsEligible).toBe(false);
      expect(scan.scores.structuredData).toBeLessThan(50);

      const schemaIssues = scan.issues.filter((i) => i.category === 'schema');
      expect(schemaIssues.some((i) => i.issue.includes('Missing Schema.org Product entity'))).toBe(true);
    });
  });

  describe('6. Multi-Category Mathematical Scoring & Weighted Formula', () => {
    it('accurately calculates category scores and weighted overall score', async () => {
      const scan = await performComprehensiveSeoScan({
        url: 'https://kriatech.in/products/magnetic-acrylic-frames',
        mockHtml: SAMPLE_PERFECT_HTML,
      });

      expect(scan.scores.seoHealth).toBeGreaterThanOrEqual(80);
      expect(scan.scores.performance).toBeGreaterThanOrEqual(75);
      expect(scan.scores.mobileUx).toBeGreaterThanOrEqual(80);
      expect(scan.scores.structuredData).toBeGreaterThanOrEqual(90);

      const expectedOverall = Math.round(
        0.35 * scan.scores.seoHealth +
        0.25 * scan.scores.performance +
        0.2 * scan.scores.mobileUx +
        0.2 * scan.scores.structuredData
      );

      expect(scan.scores.overall).toBe(expectedOverall);
      expect(scan.scores.overall).toBeGreaterThanOrEqual(80);
    });

    it('demonstrates measurable score reduction on defective pages', async () => {
      const scan = await performComprehensiveSeoScan({
        url: 'https://kriatech.in/products/acrylic-frames',
        mockHtml: SAMPLE_DEFECTIVE_HTML,
      });

      expect(scan.scores.overall).toBeLessThan(60);
      expect(scan.scores.structuredData).toBeLessThan(30);
    });
  });

  describe('7. Truth in Execution & Network Failure Handling', () => {
    it('throws explicit error when live HTTP fetch fails (never fakes scan)', async () => {
      // Mock global fetch to return a 404
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
      } as any);

      try {
        await expect(
          performComprehensiveSeoScan({ url: 'https://kriatech.in/non-existent-page' })
        ).rejects.toThrow(/HTTP Fetch Failed: Target URL returned status 404/);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('throws explicit error when network connection drops', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('getaddrinfo ENOTFOUND invalid-domain.xyz'));

      try {
        await expect(
          performComprehensiveSeoScan({ url: 'https://invalid-domain.xyz/page' })
        ).rejects.toThrow(/Network Scan Error: Failed to connect to 'https:\/\/invalid-domain.xyz\/page'/);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('8. Supabase Audit Persistence & Approval Request Proposal', () => {
    it('persists audit to seo_audits table and queues proposed changes to approval_requests', async () => {
      const scan = await performComprehensiveSeoScan({
        url: 'https://kriatech.in/products/magnetic-acrylic-frames',
        mockHtml: SAMPLE_PERFECT_HTML,
        actorEmail: 'admin@kriatech.com',
      });

      expect(scan.savedAuditId).toBe('mock-audit-uuid-phase3');
      expect(scan.approvalId).toBe('mock-approval-uuid-phase3');
      expect(createApprovalRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          action_type: 'website_change',
          risk_level: 'high',
          agent_id: 'website-agent',
        })
      );
    });
  });

  describe('9. Protected API Route: POST /api/seo/scan', () => {
    it('returns 401 when unauthenticated', async () => {
      mockSessionState.currentSession = null;

      const req = new NextRequest('http://localhost:3000/api/seo/scan', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://kriatech.in/products/magnetic-acrylic-frames' }),
      });

      const res = await scanRoute(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.error).toContain('Unauthorized');
    });

    it('returns 400 when url is missing or empty', async () => {
      const req = new NextRequest('http://localhost:3000/api/seo/scan', {
        method: 'POST',
        body: JSON.stringify({ url: '' }),
      });

      const res = await scanRoute(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toContain('valid URL is required');
    });

    it('returns 200 with complete scan result when authorized', async () => {
      const req = new NextRequest('http://localhost:3000/api/seo/scan', {
        method: 'POST',
        body: JSON.stringify({
          url: 'https://kriatech.in/products/magnetic-acrylic-frames',
          mockHtml: SAMPLE_PERFECT_HTML,
        }),
      });

      const res = await scanRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.scan).toBeDefined();
      expect(json.scan.scores.overall).toBeGreaterThanOrEqual(80);
      expect(json.scan.network.url).toBe('https://kriatech.in/products/magnetic-acrylic-frames');
    });
  });
});
