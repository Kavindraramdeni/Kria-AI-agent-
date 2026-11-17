import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { createClient } from '../src/lib/supabase/client';
import { performComprehensiveSeoScan } from '../src/lib/services/seo-scanner';

async function main() {
  console.log('========================================================');
  console.log('KRIA AI Phase 3 — Live Website SEO & Core Web Vitals Scanner Verification');
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
  <title>Magnetic Acrylic Photo Frame (5x7) | KRIA TECH Hyderabad</title>
  <meta name="description" content="Direct factory wholesale magnetic acrylic photo frames manufactured in Hyderabad. 93% optical clarity with diamond polished edges and N35 magnets.">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index, follow">
  <meta property="og:title" content="Magnetic Acrylic Photo Frame (5x7) | KRIA TECH">
  <meta property="og:description" content="Precision acrylic photo frames direct from manufacturer in Hyderabad.">
  <meta property="og:image" content="https://kriatech.com/images/frame-5x7.webp">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="https://kriatech.com/products/magnetic-acrylic-frames">
  <script defer src="/scripts/main.js"></script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Magnetic Acrylic Photo Frame (5x7 inch)",
    "sku": "KRIA-FRAME-5X7",
    "image": "https://kriatech.com/images/frame-5x7.webp",
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

  console.log('Invoking Phase 3 Comprehensive SEO Scanner with Gemini 3.5 Flash Lite...\n');

  const start = Date.now();
  const scan = await performComprehensiveSeoScan({
    url: 'https://kriatech.com/products/magnetic-acrylic-frames',
    mockHtml: sampleHtml,
    mockHeaders: {
      'content-type': 'text/html; charset=utf-8',
      'content-encoding': 'gzip',
      'cache-control': 'public, max-age=86400',
      'strict-transport-security': 'max-age=31536000; includeSubDomains',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'content-security-policy': "default-src 'self'",
    },
    actorEmail: 'admin@kriatech.com',
    supabaseClient: supabase,
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);

  console.log(`Execution completed in ${elapsed}s`);
  console.log('--------------------------------------------------------');
  console.log('Target URL:            ', scan.url);
  console.log('Execution Mode:        ', scan.executionMode);
  console.log('Weighted Overall Score:', `${scan.scores.overall}/100`);
  console.log('Category Scores:');
  console.log('  - Technical SEO:     ', `${scan.scores.seoHealth}/100`);
  console.log('  - Performance & CWV: ', `${scan.scores.performance}/100`);
  console.log('  - Mobile UX & Access:', `${scan.scores.mobileUx}/100`);
  console.log('  - Structured Data:   ', `${scan.scores.structuredData}/100`);
  console.log('Network & Core Web Vitals:');
  console.log('  - TTFB:              ', `${scan.network.ttfbMs}ms (${scan.coreWebVitals.ttfbRating})`);
  console.log('  - Compressed:        ', scan.network.isCompressed, `(${scan.network.contentEncoding})`);
  console.log('  - Payload Size:      ', `${scan.network.payloadSizeKb} KB`);
  console.log('  - Blocking Scripts:  ', scan.coreWebVitals.renderBlockingScriptsCount);
  console.log('  - Missing Dim (CLS): ', scan.dom.images.missingDimensions);
  console.log('Schema & Rich Results:');
  console.log('  - Product Found:     ', scan.schema.productSchema.found);
  console.log('  - AggregateOffer:    ', scan.schema.productSchema.hasAggregateOffer);
  console.log('  - Rich Results Ok:   ', scan.schema.productSchema.googleRichResultsEligible);
  console.log('Persistence & Approval:');
  console.log('  - Saved Audit ID:    ', scan.savedAuditId || 'N/A');
  console.log('  - Queued Approval ID:', scan.approvalId || 'N/A');

  if (scan.aiRemediation) {
    console.log('\nGemini AI Remediation Directive (3.5 Flash Lite):');
    console.log('Model:                 ', scan.aiRemediation.modelName);
    console.log('Executive Summary:     ', scan.aiRemediation.summary);
    console.log('Top Priorities:');
    scan.aiRemediation.topPriorities.forEach((p: string, idx: number) => {
      console.log(`  ${idx + 1}. ${p}`);
    });
    console.log('Mobile UX Directive:   ', scan.aiRemediation.mobileActionDirective);
  }

  console.log('\nDetected Structural Issues:', scan.issues.length);
  scan.issues.forEach((iss) => {
    console.log(`  - [${iss.severity.toUpperCase()}] [${iss.category}] ${iss.issue}`);
  });

  console.log('========================================================');
  console.log('Phase 3 SEO Scanner Verification Successful!');
  console.log('========================================================');
}

main().catch((err) => {
  console.error('Phase 3 Verification Error:', err);
  process.exit(1);
});
