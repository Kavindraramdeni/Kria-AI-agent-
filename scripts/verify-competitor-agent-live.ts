import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { createClient } from '../src/lib/supabase/client';
import { executeCompetitorAgent } from '../src/lib/services/competitor-intelligence';

async function main() {
  console.log('========================================================');
  console.log('KRIA AI Phase 2D — Live Competitor Intelligence Agent Verification');
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

  console.log('Invoking Google GenAI with Gemini 3.5 Flash Lite for Competitor Intelligence...\n');

  const start = Date.now();
  const result = await executeCompetitorAgent({
    competitor_name: 'Mass Market Acrylic Suppliers (Aggregators)',
    sku: 'MAPF-0406-CL',
    target_category: 'Tabletop Acrylic Photo Blocks',
    topic_or_prompt: 'Compare 4x6 acrylic tabletop block thickness (20mm cast vs 12-15mm extruded), light transmission, and retail price markup against KRIA direct Hyderabad factory pricing.',
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
  console.log('Saved Report ID (Supabase competitor_reports):', result.saved_report_id);
  console.log('Approval Request ID:', result.approval_id);
  console.log('Conflicts Detected:', result.conflicts_detected);

  console.log('\n--- Model Output (Gemini 3.5 Flash Lite) ---');
  console.log('Competitor Name:', result.output?.competitor_name);
  console.log('Products Analyzed:', JSON.stringify(result.output?.products_analyzed, null, 2));
  console.log('Pricing Gap vs KRIA:', result.output?.pricing_gap_vs_kria);
  console.log('KRIA Competitive Advantages:', result.output?.kria_competitive_advantages);
  console.log('Market Opportunities:', result.output?.opportunities);
  console.log('Reasoning Summary:', result.output?.reasoning_summary);
  console.log('Verified Facts:', result.output?.verified_facts);
  console.log('Sources Cited:', result.output?.sources);

  if (!result.success || result.is_simulated) {
    console.error('\nFAILURE: Live AI agent execution failed!');
    process.exit(1);
  } else {
    console.log('\nSUCCESS: Competitor Intelligence Agent genuinely executed with live Gemini AI!');
  }
}

main().catch((err) => {
  console.error('Fatal error during live execution:', err);
  process.exit(1);
});
