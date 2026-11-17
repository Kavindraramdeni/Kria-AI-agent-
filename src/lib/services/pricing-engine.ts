import { Product, WholesaleTiers } from '@/types/database';
import { KRIA_CATALOG_VARIANTS, KRIA_SUBSCRIPTION_PROGRAM } from '@/lib/data/kria-catalog-matrix';

export interface QuoteCalculationRequest {
  sku: string;
  quantity: number;
  hasSubscription?: boolean;
}

export interface QuoteCalculationResult {
  sku: string;
  product_name: string;
  quantity: number;
  tier_applied: string;
  is_below_moq: boolean;
  min_bulk_quantity: number;
  base_unit_price: number;
  effective_unit_price: number;
  subscription_discount_per_unit: number;
  total_discount_inr: number;
  subtotal_inr: number;
  final_total_inr: number;
  is_starter_kit: boolean;
  notes: string;
}

/**
 * Authoritative KRIA TECH Wholesale Pricing Calculation Engine
 * Strictly follows supplied pricing tiers without percentage approximations.
 */
export function calculateWholesaleQuote(req: QuoteCalculationRequest): QuoteCalculationResult {
  const { sku, quantity, hasSubscription = false } = req;

  // Find product from matrix
  const product = KRIA_CATALOG_VARIANTS.find((p) => p.sku === sku);

  if (!product) {
    throw new Error(`Product with SKU '${sku}' not found in KRIA TECH catalog matrix.`);
  }

  const customOpts = product.customization_options || {};
  const tiers: WholesaleTiers | undefined = customOpts.wholesale_tiers;
  const isStarterKit = sku === 'KRA-KIT-DEMO24';
  const minQty = product.min_bulk_quantity || (isStarterKit ? 1 : 50);

  // Check if quantity is below MOQ
  const isBelowMoq = quantity < minQty;

  if (isStarterKit) {
    // Demo Starter kit is a fixed sample pack rate: ₹999 flat
    return {
      sku,
      product_name: product.name,
      quantity,
      tier_applied: 'Demo Starter Kit Flat Sample Rate',
      is_below_moq: isBelowMoq,
      min_bulk_quantity: minQty,
      base_unit_price: 999,
      effective_unit_price: 999,
      subscription_discount_per_unit: 0,
      total_discount_inr: 0,
      subtotal_inr: 999 * quantity,
      final_total_inr: 999 * quantity,
      is_starter_kit: true,
      notes: 'Flat sample pack rate inclusive of 20 assorted frames + 4 keychains and free air shipping.',
    };
  }

  // Determine tier base price
  let tierApplied = 'Storefront Base / Below MOQ';
  let unitPrice = customOpts.storefront_base_price || product.retail_price;

  if (!isBelowMoq && tiers) {
    if (quantity >= 1000) {
      unitPrice = tiers.tier_1000;
      tierApplied = '1,000+ Pcs Tier';
    } else if (quantity >= 500) {
      unitPrice = tiers.tier_500;
      tierApplied = '500 Pcs Tier';
    } else if (quantity >= 250) {
      unitPrice = tiers.tier_250;
      tierApplied = '250 Pcs Tier';
    } else if (quantity >= 100) {
      unitPrice = tiers.tier_100;
      tierApplied = '100 Pcs Tier';
    } else if (quantity >= 50) {
      unitPrice = tiers.tier_50;
      tierApplied = '50 Pcs Tier';
    }
  }

  // Apply KRIA Subscription Discount (Extra ₹2 OFF per frame on bulk wholesale tiers)
  let subDiscountPerUnit = 0;
  if (
    hasSubscription &&
    !isBelowMoq &&
    customOpts.subscription_discount_eligible !== false
  ) {
    subDiscountPerUnit = customOpts.subscription_discount_inr || KRIA_SUBSCRIPTION_PROGRAM.per_frame_discount_inr; // ₹2
  }

  const effectiveUnitPrice = Math.max(0, unitPrice - subDiscountPerUnit);
  const subtotal = unitPrice * quantity;
  const totalDiscount = subDiscountPerUnit * quantity;
  const finalTotal = effectiveUnitPrice * quantity;

  let notes = isBelowMoq
    ? `Order quantity (${quantity}) is below minimum bulk wholesale quantity of ${minQty} pcs. Storefront base pricing applies.`
    : `Wholesale pricing calculated at ${tierApplied}.`;

  if (subDiscountPerUnit > 0) {
    notes += ` KRIA Subscription VIP discount applied: -₹${subDiscountPerUnit}/pc (Saved ₹${totalDiscount.toLocaleString()}).`;
  }

  return {
    sku,
    product_name: product.name,
    quantity,
    tier_applied: tierApplied,
    is_below_moq: isBelowMoq,
    min_bulk_quantity: minQty,
    base_unit_price: unitPrice,
    effective_unit_price: effectiveUnitPrice,
    subscription_discount_per_unit: subDiscountPerUnit,
    total_discount_inr: totalDiscount,
    subtotal_inr: subtotal,
    final_total_inr: finalTotal,
    is_starter_kit: false,
    notes,
  };
}
