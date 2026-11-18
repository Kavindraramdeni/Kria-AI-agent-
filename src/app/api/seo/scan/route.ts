import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { checkRateLimit } from '@/lib/services/rate-limit';
import { performComprehensiveSeoScan } from '@/lib/services/seo-scanner';

/**
 * POST /api/seo/scan
 * Performs live URL fetch, deep DOM parsing, Core Web Vitals diagnostics,
 * Schema.org Rich Results validation, and Gemini AI technical remediation.
 * SSRF protected with IP and redirect validation; mock inputs strictly prohibited outside test environment.
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

    // 4. Execute Real SEO Scan (Mock input strictly prohibited outside test environment)
    const isTestEnv = process.env.NODE_ENV === 'test';
    const scanResult = await performComprehensiveSeoScan({
      url: targetUrl,
      mockHtml: isTestEnv && typeof body.mockHtml === 'string' ? body.mockHtml : undefined,
      mockHeaders: isTestEnv && typeof body.mockHeaders === 'object' ? body.mockHeaders : undefined,
      actorEmail: session.email,
    });

    return NextResponse.json({
      success: true,
      scan: scanResult,
    });
  } catch (err: any) {
    const message = err.message || 'An unexpected error occurred during SEO scan.';

    // SSRF Rejection
    if (message.includes('SSRF Security Rejection')) {
      return NextResponse.json(
        {
          error: message,
          status: 'ssrf_blocked',
        },
        { status: 400 }
      );
    }

    // Protocol & Syntax errors
    if (message.includes('Invalid URL') || message.includes('Unsupported protocol')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // Payload size or redirect limit exceeded
    if (message.includes('Response Size Exceeded') || message.includes('Redirect Loop')) {
      return NextResponse.json({ error: message }, { status: 422 });
    }

    // Network / HTTP fetch failures
    if (
      message.includes('HTTP Fetch Failed') ||
      message.includes('Network Scan Error') ||
      message.includes('Network Scan Timeout') ||
      message.includes('DNS Resolution Error')
    ) {
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
