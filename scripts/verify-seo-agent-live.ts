import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { createClient } from '../src/lib/supabase/client';
import { executeSEOStrategyAgent } from '../src/lib/services/seo-strategy';

async function main() {
  console.log('========================================================');
  console.log('KRIA AI Phase 2B — Live SEO Strategy Agent Verification');
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

  console.log('Invoking Google GenAI with Gemini 3.5 Flash Lite for SEO Strategy...\n');

  const start = Date.now();
  const result = await executeSEOStrategyAgent({
    target_cluster: 'Magnetic Acrylic Fridge Frames & Keepsakes',
    sku: 'KRA-SQU-0303',
    target_market: 'Pan-India Wholesale & Personalized Gifting',
    target_audience: 'Wedding return gift buyers, corporate gifters, boutique home decor retailers',
    topic_or_prompt: 'Target high commercial and transactional intent keywords for bulk acrylic fridge magnets',
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);

  console.log(`Execution completed in ${elapsed}s`);
  console.log('Success:', result.success);
  console.log('Execution Mode:', result.execution_mode);
  console.log('Model Invoked:', result.model_invoked);
  console.log('Is Simulated:', result.is_simulated);
  console.log('Model Name:', result.model_name);
  console.log('Saved Keyword IDs (Supabase):', result.saved_keyword_ids);
  console.log('Approval Request ID:', result.approval_id);
  console.log('Conflicts Detected:', result.conflicts_detected);

  console.log('\n--- Model Output ---');
  console.log('Target Cluster:', result.output?.target_cluster);
  console.log('Reasoning Summary:', result.output?.reasoning_summary);
  console.log('\nRecommended Keywords:');
  result.output?.recommended_keywords?.forEach((kw, i) => {
    console.log(`  ${i + 1}. "${kw.keyword}" [Intent: ${kw.intent}] [Priority: ${kw.priority}] -> ${kw.target_page}`);
  });

  console.log('\nOn-Page Recommendations:');
  result.output?.on_page_recommendations?.forEach((rec, i) => {
    console.log(`  * ${rec}`);
  });

  console.log('\nContent Gap Analysis:\n', result.output?.content_gap_analysis);
  console.log('\nVerified Facts Referenced:');
  result.output?.verified_facts?.forEach((fact) => {
    console.log(`  * ${fact}`);
  });
  console.log('========================================================');
}

main().catch((err) => {
  console.error('Live Verification Failed:', err);
  process.exit(1);
});
