import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { checkRateLimit } from '@/lib/services/rate-limit';
import { performComprehensiveSeoScan } from '@/lib/services/seo-scanner';

/**
 * POST /api/seo/scan
 * Performs live URL fetch, deep DOM parsing, Core Web Vitals diagnostics,
 * Schema.org Rich Results validation, and Gemini AI technical remediation.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authentication Check
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required to run technical SEO scans.' },
        { status: 401 }
      );
    }

    // 2. Rate Limiting Check (20 scans per minute)
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local-client';
    const rateCheck = checkRateLimit(`seo_scan_${clientIp}`, 20, 60);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded for website scans. Please wait before re-scanning.',
          reset_seconds: rateCheck.resetSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.resetSeconds),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    // 3. Body Parsing & Validation
    const body = await req.json().catch(() => ({}));
    const targetUrl = typeof body.url === 'string' ? body.url.trim() : '';

    if (!targetUrl) {
      return NextResponse.json(
        { error: 'A valid URL is required in the request body.' },
        { status: 400 }
      );
    }

    // 4. Execute Real SEO Scan
    const scanResult = await performComprehensiveSeoScan({
      url: targetUrl,
      mockHtml: typeof body.mockHtml === 'string' ? body.mockHtml : undefined,
      mockHeaders: typeof body.mockHeaders === 'object' ? body.mockHeaders : undefined,
      actorEmail: session.email,
    });

    return NextResponse.json({
      success: true,
      scan: scanResult,
    });
  } catch (err: any) {
    const message = err.message || 'An unexpected error occurred during SEO scan.';

    if (message.includes('Invalid URL') || message.includes('Unsupported protocol')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (message.includes('HTTP Fetch Failed') || message.includes('Network Scan Error')) {
      return NextResponse.json(
        {
          error: message,
          status: 'fetch_failed',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
