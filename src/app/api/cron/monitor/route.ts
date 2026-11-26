import { NextRequest, NextResponse } from 'next/server';
import { performComprehensiveSeoScan } from '@/lib/services/seo-scanner';
import { logActivity } from '@/lib/services/activity-logs';

export const dynamic = 'force-dynamic';

/**
 * Scheduled Website Health & Technical SEO Monitor for kriatech.in
 * Triggered periodically via Vercel Cron, GitHub Actions, or monitoring ping.
 * Protected by CRON_SECRET or authenticated admin session.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Verify Authorization Header if CRON_SECRET is configured
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && cronSecret.trim() !== '') {
      const authHeader = req.headers.get('authorization');
      const providedSecret = authHeader?.replace(/^Bearer\s+/i, '').trim();

      if (providedSecret !== cronSecret.trim()) {
        return NextResponse.json(
          { error: 'Unauthorized: Invalid cron authorization token.' },
          { status: 401 }
        );
      }
    }

    const targetUrl = process.env.KRIA_MONITOR_TARGET_URL || 'https://kriatech.in';

    // 2. Run Comprehensive Website & SEO Scan
    const scanResult = await performComprehensiveSeoScan({
      url: targetUrl,
      actorEmail: 'cron-monitor@kriatech.in',
    });

    // 3. Log Audit Activity Trail
    await logActivity({
      entity_type: 'website_health',
      entity_id: targetUrl,
      action: 'automated_health_scan_completed',
      description: `Automated website monitor audited '${targetUrl}'. Overall: ${scanResult.scores.overall}/100, TTFB: ${scanResult.network.requestResponseStartMs}ms, Issues: ${scanResult.issues.length}`,
      actor_type: 'system',
      actor_id: 'cron-monitor',
      metadata: {
        url: targetUrl,
        overall_score: scanResult.scores.overall,
        ttfb_ms: scanResult.network.requestResponseStartMs,
        issues_detected: scanResult.issues.length,
        saved_audit_id: scanResult.savedAuditId,
        approval_id: scanResult.approvalId,
      },
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      target_url: targetUrl,
      overall_score: scanResult.scores.overall,
      health: {
        seo: scanResult.scores.seoHealth,
        performance: scanResult.scores.performance,
        mobile_ux: scanResult.scores.mobileUx,
        structured_data: scanResult.scores.structuredData,
      },
      latency_ms: scanResult.network.requestResponseStartMs,
      issues_count: scanResult.issues.length,
      audit_id: scanResult.savedAuditId,
      approval_id: scanResult.approvalId,
    });
  } catch (err: any) {
    console.error('Automated monitor execution error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Monitor scan encountered a critical error',
        message: err?.message || 'Unknown network or parsing error',
      },
      { status: 500 }
    );
  }
}
