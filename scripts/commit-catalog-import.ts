import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { KRIA_CATALOG_VARIANTS } from '../src/lib/data/kria-catalog-matrix';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, anonKey);

export async function commitCatalogImport() {
  console.log('Committing 15 KRIA TECH catalog records to Supabase products table...');

  let successCount = 0;
  for (const item of KRIA_CATALOG_VARIANTS) {
    const { data: existing } = await supabase
      .from('products')
      .select('id, sku')
      .eq('sku', item.sku)
      .maybeSingle();

    if (existing) {
      console.log(`- Updating existing SKU: ${item.sku}`);
      const { error } = await supabase
        .from('products')
        .update({
          ...item,
          updated_at: new Date().toISOString(),
        })
        .eq('sku', item.sku);

      if (error) console.error(`Error updating ${item.sku}:`, error.message);
      else successCount++;
    } else {
      console.log(`- Inserting new SKU: ${item.sku}`);
      const { error } = await supabase
        .from('products')
        .insert([{
          ...item,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]);

      if (error) console.error(`Error inserting ${item.sku}:`, error.message);
      else successCount++;
    }
  }

  console.log(`\nImport complete: ${successCount} / ${KRIA_CATALOG_VARIANTS.length} records committed successfully as DRAFT.`);
}

if (process.argv.includes('--execute')) {
  commitCatalogImport().catch(console.error);
}
