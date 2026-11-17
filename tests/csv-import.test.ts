import { describe, it, expect } from 'vitest';
import { importLeadsCSV } from '@/lib/services/leads';
import { Lead } from '@/types/database';

describe('CSV Lead Importer Logic & Validation', () => {
  it('successfully parses and imports valid CSV rows', async () => {
    const mockRows: Partial<Lead>[] = [
      {
        name: 'Suresh Raina',
        business_name: 'Super Gifting Hub',
        phone: '+91 98840 12345',
        email: 'suresh@supergifting.in',
        source: 'b2b_inquiry',
        product_interest: 'Clear Magnetic Acrylic Photo Frame (5x7)',
        quantity: 100,
        budget: 45000,
        location: 'Chennai, TN',
        priority: 'high',
      },
      {
        name: 'Kavita Menon',
        business_name: 'Studio Memories Kerala',
        phone: '+91 94470 67890',
        email: 'kavita@memorieskerala.com',
        source: 'instagram',
        product_interest: 'Magnetic Frame (4x6 inch)',
        quantity: 50,
        budget: 18000,
        location: 'Kochi, KL',
        priority: 'medium',
      },
    ];

    const res = await importLeadsCSV(mockRows);
    expect(res.success).toBe(true);
    expect(res.importedCount).toBe(2);
    expect(res.errors.length).toBe(0);
  });

  it('rejects rows missing required contact name and captures validation error', async () => {
    const invalidRows: Partial<Lead>[] = [
      {
        name: '', // Missing name
        business_name: 'Anonymous Business',
        quantity: 10,
      },
    ];

    const res = await importLeadsCSV(invalidRows);
    expect(res.importedCount).toBe(0);
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors[0]).toContain("Row missing required 'Name' field");
  });
});
