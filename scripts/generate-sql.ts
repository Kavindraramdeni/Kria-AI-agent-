import * as fs from 'fs';
import { KRIA_CATALOG_VARIANTS } from '../src/lib/data/kria-catalog-matrix';

const sqlStatements: string[] = [];

for (const item of KRIA_CATALOG_VARIANTS) {
  const materialsArray = "ARRAY[" + item.materials.map((m) => `'${m.replace(/'/g, "''")}'`).join(", ") + "]";
  const shapesArray = "ARRAY[" + item.available_shapes.map((s) => `'${s.replace(/'/g, "''")}'`).join(", ") + "]";
  const keywordsArray = "ARRAY[" + item.seo_keywords.map((k) => `'${k.replace(/'/g, "''")}'`).join(", ") + "]";
  const customOptionsJson = "'" + JSON.stringify(item.customization_options).replace(/'/g, "''") + "'::jsonb";

  const sql = `
INSERT INTO public.products (
  id, name, sku, category, description, materials, dimensions, available_shapes,
  customization_options, retail_price, bulk_price, min_bulk_quantity, production_notes,
  image_url, status, seo_keywords, is_demo, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '${item.name.replace(/'/g, "''")}',
  '${item.sku.replace(/'/g, "''")}',
  '${item.category.replace(/'/g, "''")}',
  '${(item.description || '').replace(/'/g, "''")}',
  ${materialsArray},
  '${(item.dimensions || '').replace(/'/g, "''")}',
  ${shapesArray},
  ${customOptionsJson},
  ${item.retail_price},
  ${item.bulk_price},
  ${item.min_bulk_quantity},
  '${(item.production_notes || '').replace(/'/g, "''")}',
  '${(item.image_url || '').replace(/'/g, "''")}',
  'draft',
  ${keywordsArray},
  false,
  now(),
  now()
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  materials = EXCLUDED.materials,
  dimensions = EXCLUDED.dimensions,
  available_shapes = EXCLUDED.available_shapes,
  customization_options = EXCLUDED.customization_options,
  retail_price = EXCLUDED.retail_price,
  bulk_price = EXCLUDED.bulk_price,
  min_bulk_quantity = EXCLUDED.min_bulk_quantity,
  production_notes = EXCLUDED.production_notes,
  image_url = EXCLUDED.image_url,
  status = 'draft',
  seo_keywords = EXCLUDED.seo_keywords,
  is_demo = false,
  updated_at = now();
`;
  sqlStatements.push(sql.trim());
}

fs.writeFileSync('scratch/import_catalog.sql', sqlStatements.join('\n\n'), 'utf-8');
console.log('Successfully generated scratch/import_catalog.sql with', sqlStatements.length, 'records.');
