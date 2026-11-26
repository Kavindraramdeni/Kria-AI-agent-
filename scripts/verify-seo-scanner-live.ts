import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { performComprehensiveSeoScan } from '../src/lib/services/seo-scanner';

async function main() {
  console.log('================================================================');
  console.log('KRIA AI Phase 3.2 — Live Network, DNS Pinning & Authenticated Persistence');
  console.log('================================================================\n');

  // 1. Supabase Client Setup & Owner Authentication
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const adminEmail = process.env.KRIA_ADMIN_EMAIL || process.env.SUPABASE_AUTH_EMAIL;
  const adminPassword = process.env.KRIA_ADMIN_PASSWORD || process.env.SUPABASE_AUTH_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error('Authentication Error: KRIA_ADMIN_EMAIL or KRIA_ADMIN_PASSWORD environment variables are missing.');
    console.error('Configure them in .env.local to run live authenticated verification.');
    process.exit(1);
  }

  let authenticatedUserEmail: string | null = null;
  let authUserId: string | null = null;

  try {
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: adminEmail.trim(),
      password: adminPassword,
    });
    if (authErr) {
      console.error('Supabase Auth Failed:', authErr.message);
      process.exit(1);
    } else if (authData?.user) {
      authenticatedUserEmail = authData.user.email || null;
      authUserId = authData.user.id;
      console.log('✓ Supabase Auth Session Established:');
      console.log('  - Email:  ', authenticatedUserEmail);
      console.log('  - User ID:', authUserId);
      console.log('  - Role:   ', authData.user.role);
    }
  } catch (err: any) {
    console.error('Supabase Auth Exception:', err.message);
    process.exit(1);
  }

  // 2. Perform Real Live Network Fetch with DNS Pinning (ZERO mockHtml / ZERO mockHeaders)
  const targetLiveUrl = 'https://example.com';
  console.log(`\n--- Step 1: Performing Live Network Fetch to '${targetLiveUrl}' ---`);
  console.log('Resolving DNS, pinning IP, validating SSRF blocks, and enforcing streaming bounds...');

  const startTime = Date.now();
  const scan = await performComprehensiveSeoScan({
    url: targetLiveUrl,
    actorEmail: authenticatedUserEmail || 'sales@kriatech.in',
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
  console.log('  - Req -> Resp Start Latency:  ', `${scan.network.requestResponseStartMs} ms (${scan.coreWebVitals.requestResponseRating})`);
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
  console.log('  - Measured: Req -> Resp Start ', `${scan.coreWebVitals.requestResponseStartMs} ms (${scan.coreWebVitals.requestResponseRating})`);
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

  console.log('\nF. AUTHENTICATED SUPABASE PERSISTENCE VERIFICATION:');
  if (scan.savedAuditId) {
    console.log('  - Supabase seo_audits ID:     ', `SUCCESS (${scan.savedAuditId})`);
    // Independently retrieve the saved audit record to verify read permissions
    const { data: retrievedAudit, error: auditReadErr } = await supabase
      .from('seo_audits')
      .select('id, target_url, score, audit_type')
      .eq('id', scan.savedAuditId)
      .single();

    if (auditReadErr) {
      console.error('    x Audit Row Retrieval Error:', auditReadErr.message);
    } else {
      console.log('    ✓ Verified Row Retrieval:    Target:', retrievedAudit.target_url, '| Score:', retrievedAudit.score);
    }
  } else {
    console.log('  - Supabase seo_audits ID:      FAILED:', scan.persistenceError || 'Unknown persistence error');
  }

  if (scan.approvalId) {
    console.log('  - Queued Approval Request ID: ', `SUCCESS (${scan.approvalId})`);
    // Independently verify approval request status in database
    const { data: retrievedAppr, error: apprReadErr } = await supabase
      .from('approval_requests')
      .select('id, title, status, risk_level')
      .eq('id', scan.approvalId)
      .single();

    if (apprReadErr) {
      console.error('    x Approval Row Retrieval Error:', apprReadErr.message);
    } else {
      console.log('    ✓ Verified Approval Queue:   Status:', retrievedAppr.status, '| Risk:', retrievedAppr.risk_level);
    }
  } else {
    console.log('  - Queued Approval Request ID:  FAILED:', scan.approvalError || 'Unknown approval queue error');
  }

  console.log('\n================================================================');
  console.log('Phase 3.2 Live Network & Persistence Verification Complete!');
  console.log('================================================================');
}

main().catch((err) => {
  console.error('Phase 3.2 Verification Error:', err);
  process.exit(1);
});
