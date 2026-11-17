import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { createClient } from '../src/lib/supabase/client';
import { executeWebsiteAuditAgent } from '../src/lib/services/website-ux-agent';

async function main() {
  console.log('========================================================');
  console.log('KRIA AI Phase 2E — Live Website UX & SEO Audit Agent Verification');
  console.log('========================================================');

  // Authenticate session if possible
  const supabase = createClient();
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'admin@kriatech.com',
    password: 'kria-demo-pass-2026',
  });
  if (authData?.user) {
    console.log('Authenticated session established for:', authData.user.email);
  }

  const sampleHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Custom Acrylic Photo Frames | KRIA TECH Hyderabad Factory</title>
  <meta name="description" content="Direct factory wholesale acrylic photo frames & fridge magnets crafted in Hyderabad from 2mm virgin cell-cast acrylic with flush N35 neodymium magnets.">
  <link rel="canonical" href="https://kriatech.com/products/acrylic-frames">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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

  console.log('Invoking Google GenAI with Gemini 3.5 Flash Lite for Website UX Audit...\n');

  const start = Date.now();
  const result = await executeWebsiteAuditAgent({
    target_url: 'https://kriatech.com/products/acrylic-frames',
    mockHtml: sampleHtml,
    actor_email: 'admin@kriatech.com',
    supabaseClient: supabase,
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);

  console.log(`Execution completed in ${elapsed}s`);
  console.log('Success:', result.success);
  console.log('Execution Mode:', result.execution_mode);
  console.log('Model Invoked:', result.model_invoked);
  console.log('Is Simulated:', result.is_simulated);
  console.log('Model Name:', result.model_name);
  console.log('Measured SEO Score:', result.measured_score, '/ 100');
  console.log('Inspection Checks Count:', result.inspection_checks?.length);
  console.log('Saved Audit ID (Supabase seo_audits):', result.saved_audit_id);
  console.log('Approval Request ID:', result.approval_id);

  console.log('\n--- Measured Checks Breakdown ---');
  for (const chk of result.inspection_checks || []) {
    console.log(`- [${chk.status.toUpperCase()}] ${chk.title}: ${chk.pointsAwarded}/${chk.maxPoints} pts (${chk.evidence})`);
  }

  console.log('\n--- Model Output (Gemini 3.5 Flash Lite) ---');
  console.log('Page Title:', result.output?.page_title);
  console.log('Output SEO Score:', result.output?.seo_score);
  console.log('Mobile UX Guidance:', result.output?.mobile_ux_notes);
  console.log('Reasoning Summary:', result.output?.reasoning_summary);
  console.log('Detected Issues Count:', result.output?.detected_issues?.length);
  console.log('Verified Facts:', result.output?.verified_facts);
  console.log('Sources Cited:', result.output?.sources);

  if (!result.success || result.is_simulated || result.output?.seo_score !== result.measured_score) {
    console.error('\nFAILURE: Live AI website audit failed or score discrepancy!');
    process.exit(1);
  } else {
    console.log('\nSUCCESS: Website UX Audit Agent genuinely executed with live Gemini AI!');
  }
}

main().catch((err) => {
  console.error('Fatal error during live execution:', err);
  process.exit(1);
});
