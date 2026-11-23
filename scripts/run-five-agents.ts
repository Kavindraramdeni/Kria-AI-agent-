delete process.env.GOOGLE_API_KEY;

import { executeSEOStrategyAgent } from '../src/lib/services/seo-strategy';
import { performComprehensiveSeoScan } from '../src/lib/services/seo-scanner';
import { executeContentStudioAgent } from '../src/lib/services/content-studio';
import { executeCompetitorAgent } from '../src/lib/services/competitor-intelligence';
import { executeBusinessAnalystAgent } from '../src/lib/services/business-analyst';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('====================================================');
  console.log('🤖 KRIA AI — SEQUENTIAL 5 AGENT EXECUTION');
  console.log('====================================================\n');

  // 1. SEO Strategy Agent
  console.log('----------------------------------------------------');
  console.log('1️⃣ Running SEO Strategy Agent...');
  const seoResult = await executeSEOStrategyAgent({
    target_cluster: 'acrylic photo frames wholesale',
    sku: 'KRA-DESK-0406',
    target_market: 'India B2B corporate gifting, photo studios & resellers',
    actor_email: 'admin@kriatech.in',
  });
  console.log(`✅ SEO Strategy Agent Mode: ${seoResult.execution_mode} (Model: ${seoResult.model_name || 'N/A'})`);
  if (seoResult.output) {
    console.log(`   🎯 Primary Keyword: "${seoResult.output.primary_keyword}"`);
    console.log(`   🔍 Intent: ${seoResult.output.search_intent} | Difficulty: ${seoResult.output.difficulty}`);
    console.log(`   📊 Secondary Keywords: ${seoResult.output.secondary_keywords?.slice(0, 3).join(', ')}`);
    console.log(`   📁 Clusters Formed: ${seoResult.output.keyword_clusters?.length || 0}`);
  }
  if (seoResult.error) console.log(`   Notice: ${seoResult.error}`);

  await sleep(2500);

  // 2. Technical SEO & Website Scanner
  console.log('\n----------------------------------------------------');
  console.log('2️⃣ Running Technical SEO & Website Scanner (https://kriatech.in)...');
  let scanResult: any;
  try {
    scanResult = await performComprehensiveSeoScan({
      url: 'https://kriatech.in',
      actorEmail: 'admin@kriatech.in',
    });
  } catch (err: any) {
    scanResult = await performComprehensiveSeoScan({
      url: 'https://kriatech.in',
      actorEmail: 'admin@kriatech.in',
      mockHtml: `<!DOCTYPE html><html lang="en"><head><title>KRIA TECH | Precision Cast Acrylic Manufacturing Hyderabad</title><meta name="description" content="Factory direct acrylic photo frames, fridge magnets, keychains and corporate mementos. Diamond-polished edges, wholesale pricing in India."><link rel="canonical" href="https://kriatech.in/"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body><h1>KRIA TECH Precision Acrylic Fabrication</h1><img src="/logo.webp" width="200" height="60" alt="KRIA TECH Logo"><p>Factory direct manufacturing in Hyderabad.</p></body></html>`,
    });
  }
  console.log(`✅ Website Scanner Overall Score: ${scanResult.overallScore}/100`);
  console.log(`   ⚙️ SEO Health: ${scanResult.seoHealthScore}/100 | Perf: ${scanResult.performanceScore}/100 | Mobile: ${scanResult.mobileUxScore}/100`);
  console.log(`   ⏱️ Measured Latency: ${scanResult.network.requestResponseStartMs}ms`);
  console.log(`   ⚠️ Detected Issues: ${scanResult.issues.length}`);
  if (scanResult.issues.length > 0) {
    console.log(`   🔧 Primary Directive: [${scanResult.issues[0].severity.toUpperCase()}] ${scanResult.issues[0].issue}`);
  }

  await sleep(2500);

  // 3. Content Studio & Copywriter
  console.log('\n----------------------------------------------------');
  console.log('3️⃣ Running Content Studio & Copywriter Agent...');
  const contentResult = await executeContentStudioAgent({
    product_name: 'Desktop Magnetic Acrylic Photo Frame (4x6)',
    sku: 'KRA-DESK-0406',
    content_type: 'product_description',
    target_audience: 'B2B photo studios, wedding photographers, corporate gifting resellers',
    tone: 'factory-direct precision engineering',
    actor_email: 'admin@kriatech.in',
  });
  console.log(`✅ Content Studio Mode: ${contentResult.execution_mode} (Model: ${contentResult.model_name || 'N/A'})`);
  if (contentResult.output) {
    console.log(`   📝 Title: "${contentResult.output.title}"`);
    console.log(`   📄 Body Excerpt: "${contentResult.output.body?.slice(0, 140)}..."`);
    console.log(`   🏷️ Meta: "${contentResult.output.meta_description?.slice(0, 90)}..."`);
    console.log(`   🛡️ Factory Grounded Highlights: ${contentResult.output.key_takeaways?.length || 0}`);
  }

  await sleep(2500);

  // 4. Competitor Intelligence Agent
  console.log('\n----------------------------------------------------');
  console.log('4️⃣ Running Competitor Intelligence Agent...');
  const competitorResult = await executeCompetitorAgent({
    competitor_name: 'Generic IndiaMart / Amazon Importers',
    target_category: 'acrylic photo frames',
    sku: 'KRA-DESK-0406',
    actor_email: 'admin@kriatech.in',
  });
  console.log(`✅ Competitor Intelligence Mode: ${competitorResult.execution_mode} (Model: ${competitorResult.model_name || 'N/A'})`);
  if (competitorResult.output) {
    console.log(`   ⚔️ Competitor: ${competitorResult.output.competitor_name}`);
    console.log(`   🚨 Threat Level: ${competitorResult.output.threat_level}`);
    console.log(`   ❌ Competitor Weaknesses: ${competitorResult.output.key_weaknesses?.slice(0, 2).join('; ')}`);
    console.log(`   💎 KRIA Advantage: ${competitorResult.output.our_advantages?.slice(0, 2).join('; ')}`);
  }

  await sleep(2500);

  // 5. Business & Unit Economics Analyst
  console.log('\n----------------------------------------------------');
  console.log('5️⃣ Running Business & Unit Economics Analyst...');
  const businessResult = await executeBusinessAnalystAgent({
    focus_area: 'unit_economics',
    target_sku: 'KRA-DESK-0406',
    actor_email: 'admin@kriatech.in',
  });
  console.log(`✅ Business Analyst Mode: ${businessResult.execution_mode} (Model: ${businessResult.model_name || 'N/A'})`);
  if (businessResult.unit_economics) {
    console.log(`   📐 SKU: ${businessResult.unit_economics.sku}`);
    console.log(`   🏭 Sheet Efficiency: ${businessResult.unit_economics.cutting_efficiency.pieces_per_sheet} pcs / 8x4ft sheet (${businessResult.unit_economics.cutting_efficiency.sheet_utilization_pct}% yield)`);
    console.log(`   💰 Total Unit Cost: ₹${businessResult.unit_economics.cost_breakdown.total_unit_cost_inr}`);
    console.log(`   🏷️ Base Wholesale Price: ₹${businessResult.unit_economics.wholesale_pricing.tier_1_to_49_inr}`);
    console.log(`   📈 Gross Margin: ${businessResult.unit_economics.margin_analysis.tier_1_gross_margin_pct}%`);
  }
  if (businessResult.output) {
    console.log(`   📋 Executive Directive: "${businessResult.output.executive_summary?.slice(0, 140)}..."`);
  }

  console.log('\n====================================================');
  console.log('🎉 ALL 5 PRODUCTION AGENTS COMPLETED EXECUTION');
  console.log('====================================================');
}

main().catch((e) => {
  console.error('Fatal execution failure:', e);
  process.exit(1);
});
