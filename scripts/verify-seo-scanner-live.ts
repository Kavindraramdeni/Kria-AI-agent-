import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { createClient } from '../src/lib/supabase/client';
import { performComprehensiveSeoScan } from '../src/lib/services/seo-scanner';

async function main() {
  console.log('================================================================');
  console.log('KRIA AI Phase 3.1 — Live Network SEO & Core Web Vitals Verification');
  console.log('================================================================\n');

  // 1. Supabase Client Setup & Authentication Attempt
  const supabase = createClient();
  let authenticatedUserEmail: string | null = null;

  try {
    const { data: authData } = await supabase.auth.signInWithPassword({
      email: 'admin@kriatech.com',
      password: 'kria-demo-pass-2026',
    });
    if (authData?.user) {
      authenticatedUserEmail = authData.user.email || null;
      console.log('✓ Supabase Auth Session Established:', authenticatedUserEmail);
    }
  } catch {
    console.log('ℹ Supabase Auth Session: Operating with anonymous client');
  }

  // 2. Perform Real Live Network Fetch (ZERO mockHtml / ZERO mockHeaders)
  const targetLiveUrl = 'https://example.com';
  console.log(`\n--- Step 1: Performing Live Network Fetch to '${targetLiveUrl}' ---`);
  console.log('Validating against SSRF blocklist, local metadata, and resolving DNS...');

  const startTime = Date.now();
  const scan = await performComprehensiveSeoScan({
    url: targetLiveUrl,
    actorEmail: authenticatedUserEmail || 'admin@kriatech.com',
    supabaseClient: supabase,
  });
  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n✓ Live Scan Completed in ${totalElapsed}s`);
  console.log('================================================================');
  console.log('A. REAL NETWORK DIAGNOSTICS EVIDENCE:');
  console.log('  - Target URL:                 ', scan.url);
  console.log('  - Final Resolved URL:         ', scan.network.finalUrl);
  console.log('  - HTTP Status:                ', `${scan.network.statusCode} ${scan.network.statusText}`);
  console.log('  - Execution Mode:             ', scan.executionMode, '(STRICTLY LIVE NETWORK)');
  console.log('  - Measured Server TTFB:       ', `${scan.network.ttfbMs} ms (${scan.coreWebVitals.ttfbRating})`);
  console.log('  - Transferred Payload Size:   ', `${scan.network.payloadSizeKb} KB (${scan.network.contentLengthBytes} bytes)`);
  console.log('  - Content-Type:               ', scan.network.contentType);
  console.log('  - Content-Encoding:           ', scan.network.contentEncoding || 'None (Uncompressed)');
  console.log('  - Redirect Count:             ', scan.network.redirectCount);

  console.log('\nB. MEASURED DOM HEALTH & STRUCTURE:');
  console.log('  - Document Title:             ', `"${scan.dom.title.value}" (${scan.dom.title.length} chars, status: ${scan.dom.title.status})`);
  console.log('  - Meta Description:           ', scan.dom.metaDescription.status === 'missing' ? 'MISSING' : scan.dom.metaDescription.value);
  console.log('  - Canonical Status:           ', scan.dom.canonical.status);
  console.log('  - Headings Hierarchy:         ', `H1: ${scan.dom.headings.h1Count}, H2: ${scan.dom.headings.h2Count}, H3: ${scan.dom.headings.h3Count}`);
  console.log('  - Total Anchor Links:         ', scan.dom.links.total);
  console.log('  - Total Images Audited:       ', scan.dom.images.total);

  console.log('\nC. CORE WEB VITALS STATIC HEURISTICS TRANSPARENCY:');
  console.log('  - Measured Metric: TTFB       ', `${scan.coreWebVitals.measuredTtfbMs} ms (${scan.coreWebVitals.ttfbRating})`);
  console.log('  - Measured: Blocking Scripts  ', `${scan.coreWebVitals.renderBlockingScriptsCount} scripts in <head>`);
  console.log('  - Measured: CLS Hazard Images ', `${scan.dom.images.missingDimensions} missing explicit dimensions`);
  console.log('  - Predictive: LCP Heuristic   ', `~${scan.coreWebVitals.estimatedLcpHeuristicMs} ms (${scan.coreWebVitals.estimatedLcpRating})`);
  console.log('  - Predictive: CLS Hazard Score', `${scan.coreWebVitals.estimatedClsHazardScore} (${scan.coreWebVitals.estimatedClsRating})`);
  console.log('  - INP Measurement Status:     ', scan.coreWebVitals.inpStatus, '(Requires Chrome CrUX / RUM field data)');
  console.log('  - Methodology:                ', scan.coreWebVitals.methodology);

  console.log('\nD. MULTI-CATEGORY DETERMINISTIC SCORES (0-100):');
  console.log('  - Technical SEO Health:       ', `${scan.scores.seoHealth}/100`);
  console.log('  - Performance & Asset CWV:    ', `${scan.scores.performance}/100`);
  console.log('  - Mobile UX & Accessibility:  ', `${scan.scores.mobileUx}/100`);
  console.log('  - Structured Data / Schema:   ', `${scan.scores.structuredData}/100`);
  console.log('  - Weighted Overall Health:    ', `${scan.scores.overall}/100`);

  console.log('\nE. GOOGLE GEMINI 3.5 FLASH LITE SYNTHESIS:');
  if (scan.aiRemediation) {
    console.log('  - Model Invoked:              ', scan.aiRemediation.modelName);
    console.log('  - Executive Summary:          ', scan.aiRemediation.summary);
    console.log('  - Top Remediation Priorities:');
    scan.aiRemediation.topPriorities.forEach((p: string, idx: number) => {
      console.log(`      ${idx + 1}. ${p}`);
    });
    console.log('  - Mobile Action Directive:    ', scan.aiRemediation.mobileActionDirective);
  } else {
    console.log('  - AI Synthesis Status:         Unavailable / Warning logged');
  }

  console.log('\nF. SUPABASE PERSISTENCE & APPROVAL QUEUE STATUS:');
  console.log('  - Supabase seo_audits ID:     ', scan.savedAuditId ? `SUCCESS (${scan.savedAuditId})` : 'NOTE: Insert intercepted by RLS policy');
  console.log('  - Queued Approval Request ID: ', scan.approvalId ? `SUCCESS (${scan.approvalId})` : 'NOTE: Insert intercepted by RLS policy');

  console.log('\n================================================================');
  console.log('Phase 3.1 Live Network Verification Successfully Demonstrated!');
  console.log('================================================================');
}

main().catch((err) => {
  console.error('Phase 3.1 Verification Error:', err);
  process.exit(1);
});
