import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { KRIA_MANUFACTURING_FACTS } from '@/lib/agents/guardrails';
import {
  KRIA_CATALOG_VARIANTS,
  KRIA_TECH_MANUFACTURING_SPECS,
} from '@/lib/data/kria-catalog-matrix';
import { VERIFIED_KRIA_PRODUCTS } from '@/lib/demo-data';
import { getProducts } from '@/lib/services/products';
import { calculateWholesaleQuote } from '@/lib/services/pricing-engine';
import {
  resolveProductGrounding,
  validateProductClaims,
} from '@/lib/services/product-grounding';
import { DEMO_USERS } from '@/lib/auth/session';

describe('KRIA Tech F3 & F4 Grounding, Catalog, MOQ & Contact Verification', () => {
  it('grounds KRIA_MANUFACTURING_FACTS and KRIA_TECH_MANUFACTURING_SPECS in verified Hyderabad specs', () => {
    expect(KRIA_MANUFACTURING_FACTS.website).toBe('https://kriatech.in');
    expect(KRIA_MANUFACTURING_FACTS.location).toContain('Hyderabad, Telangana');
    expect(KRIA_MANUFACTURING_FACTS.phone_whatsapp).toBe('+91-9392576792');
    expect(KRIA_MANUFACTURING_FACTS.business_email).toBe('sales@kriatech.in');
    expect(KRIA_MANUFACTURING_FACTS.moq).toBe(50);
    expect(KRIA_MANUFACTURING_FACTS.materials.acrylic).toContain('2mm');
    expect(KRIA_MANUFACTURING_FACTS.materials.acrylic).toContain('cell-cast');
    expect(KRIA_MANUFACTURING_FACTS.materials.magnets).toContain('8 Grade N35');
    expect(KRIA_MANUFACTURING_FACTS.starter_kit.sku).toBe('KRA-KIT-DEMO24');
    expect(KRIA_MANUFACTURING_FACTS.starter_kit.pieces).toBe(24);
    expect(KRIA_MANUFACTURING_FACTS.starter_kit.price_inr).toBe(999);

    expect(KRIA_TECH_MANUFACTURING_SPECS.website).toBe('https://kriatech.in');
    expect(KRIA_TECH_MANUFACTURING_SPECS.location).toContain('Hyderabad, Telangana');
    expect(KRIA_TECH_MANUFACTURING_SPECS.phone_whatsapp).toBe('+91-9392576792');
    expect(KRIA_TECH_MANUFACTURING_SPECS.business_email).toBe('sales@kriatech.in');
    expect(KRIA_TECH_MANUFACTURING_SPECS.moq).toBe(50);
    expect(KRIA_TECH_MANUFACTURING_SPECS.material).toContain('2mm + 2mm');
    expect(KRIA_TECH_MANUFACTURING_SPECS.magnet_spec).toContain('8 Grade N35');
    expect(KRIA_TECH_MANUFACTURING_SPECS.starter_kit.sku).toBe('KRA-KIT-DEMO24');
    expect(KRIA_TECH_MANUFACTURING_SPECS.starter_kit.price_inr).toBe(999);
  });

  it('passes validateProductClaims for KRIA_MANUFACTURING_FACTS.materials.magnets (no absolute scratch claim)', () => {
    const check = validateProductClaims(KRIA_MANUFACTURING_FACTS.materials.magnets);
    expect(check.valid).toBe(true);
    expect(check.forbiddenClaimsFound).toEqual([]);
  });

  it('keeps 15 authoritative KRA-* catalog variants with MOQ 50 and 2mm + 2mm / 8 Grade N35 specs on frames', () => {
    expect(KRIA_CATALOG_VARIANTS).toHaveLength(15);

    const standardSkus = KRIA_CATALOG_VARIANTS.filter((p) => p.sku !== 'KRA-KIT-DEMO24');
    expect(standardSkus).toHaveLength(14);
    standardSkus.forEach((item) => {
      expect(item.min_bulk_quantity).toBe(50);
      expect(item.status).toBe('draft');
      expect(item.is_demo).toBe(false);
    });

    const frameSkus = KRIA_CATALOG_VARIANTS.filter(
      (p) =>
        p.sku.startsWith('KRA-SQU-') ||
        p.sku.startsWith('KRA-REC-') ||
        p.sku.startsWith('KRA-CIR-') ||
        p.sku.startsWith('KRA-HRT-')
    );
    expect(frameSkus).toHaveLength(12);
    frameSkus.forEach((frame) => {
      expect(frame.dimensions).toContain('2mm + 2mm');
      expect(frame.dimensions).toContain('8 Grade N35');
      expect(frame.materials.join(' ')).toContain('2mm + 2mm');
      expect(frame.materials.join(' ')).toContain('8 Grade N35');
    });
  });

  it('exposes all KRA-* products and KRA-KIT-DEMO24 (24 pcs, ₹999, free air delivery) in VERIFIED_KRIA_PRODUCTS and getProducts()', async () => {
    const kitVariant = KRIA_CATALOG_VARIANTS.find((p) => p.sku === 'KRA-KIT-DEMO24');
    expect(kitVariant).toBeDefined();
    expect(kitVariant?.bulk_price).toBe(999);
    expect(kitVariant?.min_bulk_quantity).toBe(1);
    const bundle = kitVariant?.customization_options?.bundle_contents;
    expect(bundle).toBeDefined();
    expect(bundle!.frames_count + bundle!.keychains_count).toBe(24);
    expect(bundle!.free_air_shipping).toBe(true);

    const verifiedSkus = new Set(VERIFIED_KRIA_PRODUCTS.map((p) => p.sku));
    expect(verifiedSkus.has('KRA-KIT-DEMO24')).toBe(true);
    expect(verifiedSkus.has('KRA-REC-0604')).toBe(true);
    expect(verifiedSkus.has('MAPF-0406-CL')).toBe(true);

    const { data: products } = await getProducts();
    const loadedSkus = new Set(products.map((p) => p.sku));
    KRIA_CATALOG_VARIANTS.forEach((variant) => {
      expect(loadedSkus.has(variant.sku)).toBe(true);
    });

    const quote = calculateWholesaleQuote({ sku: 'KRA-KIT-DEMO24', quantity: 1 });
    expect(quote.final_total_inr).toBe(999);
    expect(quote.is_starter_kit).toBe(true);
    expect(quote.notes).toContain('20 assorted frames + 4 keychains');
    expect(quote.notes).toContain('free air shipping');
  });

  it('grounds KRA-KIT-DEMO24, KRA-REC-0604, and legacy MAPF-0406-CL accurately without cross-contamination', () => {
    const kitGrounding = resolveProductGrounding({ sku: 'KRA-KIT-DEMO24' });
    expect(kitGrounding.hasSupportingRecords).toBe(true);
    expect(kitGrounding.verifiedSpecs.join(' ')).toContain('20 assorted fridge frames + 4 bonus keychains');
    expect(kitGrounding.verifiedSpecs.join(' ')).toContain('Free express air delivery across India');

    const recGrounding = resolveProductGrounding({ sku: 'KRA-REC-0604' });
    expect(recGrounding.hasSupportingRecords).toBe(true);
    const recSpecs = recGrounding.verifiedSpecs.join(' ');
    expect(recSpecs).toContain('2mm + 2mm');
    expect(recSpecs).toContain('8 Grade N35');
    expect(recSpecs).toContain('Hyderabad, India');

    const mapfGrounding = resolveProductGrounding({ sku: 'MAPF-0406-CL' });
    expect(mapfGrounding.hasSupportingRecords).toBe(true);
    const mapfSpecs = mapfGrounding.verifiedSpecs.join(' ');
    expect(mapfSpecs).toContain('92% light transmission');
    expect(mapfSpecs).toContain('N52');
    expect(mapfSpecs).toContain('20mm');
  });

  it('provides @kriatech.in identities in DEMO_USERS alongside backward-compatible aliases', () => {
    expect(DEMO_USERS['admin@kriatech.in']?.role).toBe('owner');
    expect(DEMO_USERS['sales@kriatech.in']?.role).toBe('owner');
    expect(DEMO_USERS['staff@kriatech.in']?.role).toBe('staff');
  });

  it('has zero remaining kriatech.com default URL targets in runtime files and uses https://kriatech.in', () => {
    const rootDir = process.cwd();
    const runtimeFiles = [
      'src/app/api/agents/[agentId]/run/route.ts',
      'src/app/seo/page.tsx',
      'src/lib/services/seo-audits.ts',
      'src/lib/services/seo-scanner.ts',
      'src/lib/services/website-ux-agent.ts',
      'src/components/layout/header.tsx',
      'src/lib/agents/guardrails.ts',
      'src/lib/data/kria-catalog-matrix.ts',
      'src/lib/demo-data.ts',
    ];

    for (const relPath of runtimeFiles) {
      const content = fs.readFileSync(path.join(rootDir, relPath), 'utf8');
      expect(content, `${relPath} must not contain https://kriatech.com`).not.toMatch(/https?:\/\/[^'"\s]*kriatech\.com/i);
      expect(content, `${relPath} must not contain user@kriatech.com`).not.toContain('user@kriatech.com');
    }

    const auditDefaultFiles = [
      'src/app/api/agents/[agentId]/run/route.ts',
      'src/app/seo/page.tsx',
      'src/lib/services/seo-audits.ts',
      'src/lib/services/seo-scanner.ts',
      'src/lib/services/website-ux-agent.ts',
    ];

    for (const relPath of auditDefaultFiles) {
      const content = fs.readFileSync(path.join(rootDir, relPath), 'utf8');
      expect(content, `${relPath} should reference https://kriatech.in`).toContain('https://kriatech.in');
    }
  });
});
