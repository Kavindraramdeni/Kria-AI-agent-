import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { createClient } from '../src/lib/supabase/client';
import { executeContentStudioAgent } from '../src/lib/services/content-studio';

async function main() {
  console.log('=====================================================');
  console.log('KRIA AI Phase 2A — Live Model Invocation Verification');
  console.log('=====================================================');

  // Authenticate to satisfy Supabase RLS
  const supabase = createClient();
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@kriatech.com',
    password: 'kria-demo-pass-2026',
  });

  if (authError) {
    console.warn('Auth sign-in warning:', authError.message);
  } else {
    console.log('Authenticated session established for:', authData.user?.email);
  }

  console.log('Calling Google GenAI (@google/genai) with Gemini 3.5 Flash Lite...\n');

  const start = Date.now();
  const result = await executeContentStudioAgent({
    sku: 'KRA-SQU-0303',
    product_name: 'Minimal Square Acrylic Photo Magnet (3x3)',
    content_type: 'instagram_caption',
    target_audience: 'Modern home decor enthusiasts and photographers',
    tone: 'Minimalist, luxurious, emphasizing precision acrylic craft',
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);

  console.log(`Execution completed in ${elapsed}s`);
  console.log('Success:', result.success);
  console.log('Execution Mode:', result.execution_mode);
  console.log('Error:', result.error);
  console.log('Model Invoked:', result.model_invoked);
  console.log('Is Simulated:', result.is_simulated);
  console.log('Model Name:', result.model_name);
  console.log('Saved Content ID (Supabase):', result.saved_content_id);
  console.log('Approval Request ID:', result.approval_id);
  console.log('\n--- Model Output ---');
  console.log('Title:', result.output?.title);
  console.log('Verified Facts:', result.output?.verified_facts);
  console.log('Sources:', result.output?.sources);
  console.log('Suggested CTA:', result.output?.suggested_cta);
  console.log('Keywords:', result.output?.keywords_used);
  console.log('Recommended Visuals:', result.output?.recommended_visuals);
  console.log('\n--- Generated Copy Body ---');
  console.log(result.output?.body);
  console.log('=====================================================');
}

main().catch((err) => {
  console.error('Execution Failed:', err);
  process.exit(1);
});
