import { describe, it, expect } from 'vitest';
import { calculateWholesaleQuote } from '@/lib/services/pricing-engine';
import { KRIA_CATALOG_VARIANTS, KRIA_SUBSCRIPTION_PROGRAM } from '@/lib/data/kria-catalog-matrix';

describe('KRIA TECH Catalog Matrix & Tiered Pricing Engine', () => {
  it('contains exactly 15 catalog items (14 variants + 1 starter kit bundle)', () => {
    expect(KRIA_CATALOG_VARIANTS.length).toBe(15);

    // Verify all items are set to DRAFT initially
    KRIA_CATALOG_VARIANTS.forEach((item) => {
      expect(item.status).toBe('draft');
      expect(item.is_demo).toBe(false);
      expect(item.sku).toBeDefined();
    });
  });

  it('validates Classic Rectangle 6x4" (KRA-REC-0604) across all 5 bulk wholesale tiers without percentage error', () => {
    // 50 Pcs Tier -> ₹96 / pc
    const q50 = calculateWholesaleQuote({ sku: 'KRA-REC-0604', quantity: 50 });
    expect(q50.effective_unit_price).toBe(96);
    expect(q50.final_total_inr).toBe(4800);
    expect(q50.tier_applied).toBe('50 Pcs Tier');
    expect(q50.is_below_moq).toBe(false);

    // 100 Pcs Tier -> ₹85 / pc
    const q100 = calculateWholesaleQuote({ sku: 'KRA-REC-0604', quantity: 100 });
    expect(q100.effective_unit_price).toBe(85);
    expect(q100.final_total_inr).toBe(8500);
    expect(q100.tier_applied).toBe('100 Pcs Tier');

    // 250 Pcs Tier -> ₹81 / pc
    const q250 = calculateWholesaleQuote({ sku: 'KRA-REC-0604', quantity: 250 });
    expect(q250.effective_unit_price).toBe(81);
    expect(q250.final_total_inr).toBe(20250);
    expect(q250.tier_applied).toBe('250 Pcs Tier');

    // 500 Pcs Tier -> ₹79 / pc
    const q500 = calculateWholesaleQuote({ sku: 'KRA-REC-0604', quantity: 500 });
    expect(q500.effective_unit_price).toBe(79);
    expect(q500.final_total_inr).toBe(39500);
    expect(q500.tier_applied).toBe('500 Pcs Tier');

    // 1,000+ Pcs Tier -> ₹76 / pc
    const q1000 = calculateWholesaleQuote({ sku: 'KRA-REC-0604', quantity: 1000 });
    expect(q1000.effective_unit_price).toBe(76);
    expect(q1000.final_total_inr).toBe(76000);
    expect(q1000.tier_applied).toBe('1,000+ Pcs Tier');
  });

  it('validates Minimal Square 3x3" (KRA-SQU-0303) across all bulk tiers', () => {
    // 50 Pcs -> ₹55
    expect(calculateWholesaleQuote({ sku: 'KRA-SQU-0303', quantity: 50 }).effective_unit_price).toBe(55);
    // 100 Pcs -> ₹49
    expect(calculateWholesaleQuote({ sku: 'KRA-SQU-0303', quantity: 100 }).effective_unit_price).toBe(49);
    // 250 Pcs -> ₹47
    expect(calculateWholesaleQuote({ sku: 'KRA-SQU-0303', quantity: 250 }).effective_unit_price).toBe(47);
    // 500 Pcs -> ₹46
    expect(calculateWholesaleQuote({ sku: 'KRA-SQU-0303', quantity: 500 }).effective_unit_price).toBe(46);
    // 1000 Pcs -> ₹44
    expect(calculateWholesaleQuote({ sku: 'KRA-SQU-0303', quantity: 1000 }).effective_unit_price).toBe(44);
  });

  it('validates Keychain 2.5" (KRA-KEY-CIR25) pricing across tiers', () => {
    // 50 Pcs -> ₹34
    expect(calculateWholesaleQuote({ sku: 'KRA-KEY-CIR25', quantity: 50 }).effective_unit_price).toBe(34);
    // 100 Pcs -> ₹30
    expect(calculateWholesaleQuote({ sku: 'KRA-KEY-CIR25', quantity: 100 }).effective_unit_price).toBe(30);
    // 1000 Pcs -> ₹27
    expect(calculateWholesaleQuote({ sku: 'KRA-KEY-CIR25', quantity: 1000 }).effective_unit_price).toBe(27);
  });

  it('calculates Demo Starter Kit (KRA-KIT-DEMO24) at fixed flat rate ₹999 with MOQ of 1', () => {
    const kitQuote = calculateWholesaleQuote({ sku: 'KRA-KIT-DEMO24', quantity: 1 });
    expect(kitQuote.is_starter_kit).toBe(true);
    expect(kitQuote.min_bulk_quantity).toBe(1);
    expect(kitQuote.is_below_moq).toBe(false);
    expect(kitQuote.effective_unit_price).toBe(999);
    expect(kitQuote.final_total_inr).toBe(999);
  });

  it('correctly applies KRIA Subscription discount (-₹2/pc) on wholesale tiers', () => {
    // Without subscription: 100 pcs of KRA-REC-0604 is ₹85/pc = ₹8,500
    const regularQuote = calculateWholesaleQuote({
      sku: 'KRA-REC-0604',
      quantity: 100,
      hasSubscription: false,
    });
    expect(regularQuote.effective_unit_price).toBe(85);
    expect(regularQuote.final_total_inr).toBe(8500);

    // With subscription: 100 pcs of KRA-REC-0604 drops to ₹83/pc = ₹8,300 (₹200 discount)
    const vipQuote = calculateWholesaleQuote({
      sku: 'KRA-REC-0604',
      quantity: 100,
      hasSubscription: true,
    });
    expect(vipQuote.effective_unit_price).toBe(83);
    expect(vipQuote.subscription_discount_per_unit).toBe(2);
    expect(vipQuote.total_discount_inr).toBe(200);
    expect(vipQuote.final_total_inr).toBe(8300);
  });

  it('flags quantities below factory bulk MOQ (< 50 units) and applies storefront base price', () => {
    const belowMoq = calculateWholesaleQuote({ sku: 'KRA-REC-0604', quantity: 20 });
    expect(belowMoq.is_below_moq).toBe(true);
    expect(belowMoq.min_bulk_quantity).toBe(50);
    expect(belowMoq.base_unit_price).toBe(113); // Storefront base price
    expect(belowMoq.final_total_inr).toBe(2260); // 113 * 20
    expect(belowMoq.subscription_discount_per_unit).toBe(0); // Subscription discount only applies to wholesale tiers
  });

  it('ensures distinct SKUs between existing desktop frames and new magnetic fridge products', () => {
    const existingSkus = ['MAPF-0406-CL', 'MAPF-0507-CL', 'MAPF-0810-CL'];
    const newSkus = KRIA_CATALOG_VARIANTS.map((p) => p.sku);

    // No intersection between existing desktop frames and new SKUs
    const duplicates = newSkus.filter((sku) => existingSkus.includes(sku));
    expect(duplicates).toEqual([]);

    // Check SKU uniqueness among new variants
    const uniqueNewSkus = new Set(newSkus);
    expect(uniqueNewSkus.size).toBe(newSkus.length);
  });
});
