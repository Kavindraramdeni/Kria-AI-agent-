import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { createClient } from '../src/lib/supabase/client';
import { executeBusinessAnalystAgent } from '../src/lib/services/business-analyst';

async function main() {
  console.log('========================================================');
  console.log('KRIA AI Phase 2F — Live Operations & Growth Analyst Verification');
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

  console.log('Invoking Google GenAI with Gemini 3.5 Flash Lite for Business Analytics Synthesis...\n');

  const start = Date.now();
  const result = await executeBusinessAnalystAgent({
    focus_area: 'executive_brief',
    topic_or_prompt: 'Synthesize Q4 production velocity, wholesale tier margin thresholds, and B2B pipeline conversion levers for Hyderabad facility.',
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
  console.log('Approval Request ID:', result.approval_id);

  console.log('\n--- Real CRM Pipeline Summary ---');
  console.log('Total Leads:', result.pipeline_summary?.total_leads);
  console.log('Qualified Leads:', result.pipeline_summary?.qualified_leads);
  console.log('Won Leads:', result.pipeline_summary?.won_leads);
  console.log('Win Rate:', result.pipeline_summary?.win_rate_pct, '%');
  console.log('Top Acquisition Sources:', result.pipeline_summary?.top_sources);

  console.log('\n--- Authoritative Unit Economics ---');
  console.log('Average Wholesale 500 Margin:', result.unit_economics?.average_gross_margin_pct, '%');
  console.log('Top Margin SKU:', result.unit_economics?.top_margin_sku);
  console.log('Daily Factory Capacity:', result.unit_economics?.inventory_velocity.daily_factory_capacity_units, 'units');
  console.log('Standard Dispatch SLA:', result.unit_economics?.inventory_velocity.standard_dispatch_sla_days, 'days');
  console.log('VIP Subscription Break-Even:', result.unit_economics?.break_even_vip_units, 'units');

  console.log('\n--- Model Output (Gemini 3.5 Flash Lite) ---');
  console.log('Executive Summary:', result.output?.executive_summary);
  console.log('Pipeline Health:', result.output?.pipeline_health);
  console.log('Top Demanded Products:', result.output?.top_demanded_products);
  console.log('Identified Bottlenecks:', result.output?.identified_bottlenecks);
  console.log('Recommended Growth Actions:', result.output?.recommended_growth_actions);
  console.log('Unit Economics in Output:', JSON.stringify(result.output?.unit_economics, null, 2));
  console.log('Verified Facts:', result.output?.verified_facts);
  console.log('Sources Cited:', result.output?.sources);

  if (!result.success || result.is_simulated) {
    console.error('\nFAILURE: Live AI business analyst synthesis failed!');
    process.exit(1);
  } else {
    console.log('\nSUCCESS: Operations & Growth Analyst genuinely executed with live Gemini AI!');
  }
}

main().catch((err) => {
  console.error('Fatal error during live execution:', err);
  process.exit(1);
});
