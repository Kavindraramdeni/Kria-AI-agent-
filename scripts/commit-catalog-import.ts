import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { createHash } from 'crypto';
import { KRIA_CATALOG_VARIANTS, KRIA_SUBSCRIPTION_PROGRAM } from '../src/lib/data/kria-catalog-matrix';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, anonKey);

function computeLogHash(entry: {
  previous_hash: string;
  created_at: string;
  entity_type: string;
  action: string;
  actor_id?: string | null;
  metadata?: Record<string, any>;
}): string {
  const payloadString = JSON.stringify(entry.metadata || {});
  const rawString = `${entry.previous_hash}|${entry.created_at}|${entry.entity_type}|${entry.action}|${entry.actor_id || 'anonymous'}|${payloadString}`;
  return createHash('sha256').update(rawString).digest('hex');
}

export async function commitCatalogImport() {
  console.log('===============================================================');
  console.log('KRIA TECH CATALOG MATRIX - EXECUTING AUTHORIZED IMPORT');
  console.log('===============================================================\n');

  // 1. Verify and protect existing 3 MAPF products
  const { data: existingProducts, error: fetchErr } = await supabase
    .from('products')
    .select('id, name, sku, category, retail_price, bulk_price, status')
    .order('created_at', { ascending: true });

  if (fetchErr) {
    throw new Error(`Failed to query existing products: ${fetchErr.message}`);
  }

  console.log(`1. VERIFYING EXISTING DATABASE STATE:`);
  console.log(`   Total existing products in database: ${existingProducts?.length || 0}`);
  const mapfProducts = (existingProducts || []).filter((p) => p.sku.startsWith('MAPF-'));
  console.log(`   Authoritative MAPF desktop products found: ${mapfProducts.length}`);
  mapfProducts.forEach((p) => {
    console.log(`   - [PROTECTED] SKU: ${p.sku} | ${p.name} (Status: ${p.status})`);
  });

  if (mapfProducts.length < 3) {
    console.warn('   WARNING: Less than 3 MAPF products found in database.');
  }

  // 2. Commit 15 candidate records
  console.log(`\n2. IMPORTING 15 CATALOG RECORDS AS DRAFT:`);
  let insertedCount = 0;
  let updatedCount = 0;
  const importedSkus: string[] = [];

  for (const item of KRIA_CATALOG_VARIANTS) {
    // Explicitly guarantee status is 'draft' and is_demo is false
    const payload = {
      ...item,
      status: 'draft',
      is_demo: false,
    };

    const { data: existing } = await supabase
      .from('products')
      .select('id, sku')
      .eq('sku', item.sku)
      .maybeSingle();

    if (existing) {
      console.log(`   - [UPSERT-UPDATE] ${item.sku}: ${item.name} (DRAFT)`);
      const { error } = await supabase
        .from('products')
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq('sku', item.sku);

      if (error) {
        console.error(`     ERROR updating ${item.sku}: ${error.message}`);
      } else {
        updatedCount++;
        importedSkus.push(item.sku);
      }
    } else {
      console.log(`   - [UPSERT-INSERT] ${item.sku}: ${item.name} (DRAFT)`);
      const { error } = await supabase
        .from('products')
        .insert([{
          ...payload,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]);

      if (error) {
        console.error(`     ERROR inserting ${item.sku}: ${error.message}`);
      } else {
        insertedCount++;
        importedSkus.push(item.sku);
      }
    }
  }

  // 3. Post-import database verification
  console.log(`\n3. POST-IMPORT DATABASE VERIFICATION:`);
  const { data: allProducts, error: countErr } = await supabase
    .from('products')
    .select('id, sku, name, status, retail_price, bulk_price, min_bulk_quantity')
    .order('sku', { ascending: true });

  if (countErr) {
    console.error('   Failed to verify products count:', countErr.message);
  } else {
    console.log(`   Total products in database: ${allProducts?.length}`);
    const draftCount = allProducts?.filter((p) => p.status === 'draft').length;
    const activeCount = allProducts?.filter((p) => p.status === 'active').length;
    console.log(`   - Active products (Existing MAPF): ${activeCount}`);
    console.log(`   - Draft products (Newly Imported): ${draftCount}`);
  }

  // 4. Record audit ledger entry with SHA-256 hash chaining
  console.log(`\n4. RECORDING TAMPER-EVIDENT AUDIT LOG ENTRY:`);
  const { data: latestLogs } = await supabase
    .from('activity_logs')
    .select('hash')
    .order('created_at', { ascending: false })
    .limit(1);

  const prevHash = latestLogs?.[0]?.hash || '0000000000000000000000000000000000000000000000000000000000000000';
  const createdAt = new Date().toISOString();
  const metadata = {
    total_imported: importedSkus.length,
    imported_skus: importedSkus,
    status_applied: 'draft',
    pricing_program_registered: KRIA_SUBSCRIPTION_PROGRAM.id,
    vip_subscription_terms: '₹499 for 3 months, ₹2/frame wholesale discount',
    mapf_products_preserved: mapfProducts.map((p) => p.sku),
    owner_authorized: true,
  };

  const selfHash = computeLogHash({
    previous_hash: prevHash,
    created_at: createdAt,
    entity_type: 'product_catalog',
    action: 'catalog_imported',
    actor_id: 'owner',
    metadata,
  });

  const { error: logErr } = await supabase.from('activity_logs').insert([{
    entity_type: 'product_catalog',
    entity_id: 'kria-tech-catalog-2026',
    action: 'catalog_imported',
    description: `Owner approved import of ${importedSkus.length} KRIA TECH catalog records (14 variants + 1 starter kit) as DRAFT`,
    actor_type: 'user',
    actor_id: 'owner',
    metadata,
    previous_hash: prevHash,
    hash: selfHash,
    created_at: createdAt,
  }]);

  if (logErr) {
    console.error('   Failed to record audit log:', logErr.message);
  } else {
    console.log(`   Audit ledger entry successfully recorded!`);
    console.log(`   - Action: catalog_imported`);
    console.log(`   - Log Hash: ${selfHash}`);
    console.log(`   - Previous Hash: ${prevHash}`);
  }

  console.log('\n===============================================================');
  console.log(`IMPORT EXECUTION FINISHED: ${importedSkus.length} / 15 records imported as DRAFT.`);
  console.log('===============================================================');
}

commitCatalogImport().catch(console.error);
