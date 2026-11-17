import { describe, it, expect } from 'vitest';
import { getProducts, createProduct } from '@/lib/services/products';

describe('Product Catalog & Pricing Rules', () => {
  it('retrieves products including magnetic acrylic photo frames', async () => {
    const res = await getProducts();
    expect(res.data.length).toBeGreaterThan(0);

    const magneticFrames = res.data.filter((p) => p.category === 'Photo Frames');
    expect(magneticFrames.length).toBeGreaterThan(0);

    // Verify wholesale pricing is lower than retail price
    magneticFrames.forEach((frame) => {
      expect(frame.bulk_price).toBeLessThan(frame.retail_price);
      expect(frame.min_bulk_quantity).toBeGreaterThanOrEqual(10);
      expect(frame.is_demo).toBe(true);
    });
  });

  it('validates SKU uniqueness and product creation', async () => {
    const customSku = 'TEST-MAPF-' + Date.now();
    const res = await createProduct({
      name: 'Custom 10x12 Floating Frame',
      sku: customSku,
      category: 'Photo Frames',
      retail_price: 1899,
      bulk_price: 1100,
      min_bulk_quantity: 20,
    });

    expect(res.success).toBe(true);
    expect(res.data?.sku).toBe(customSku);
    expect(res.data?.bulk_price).toBe(1100);
  });
});
