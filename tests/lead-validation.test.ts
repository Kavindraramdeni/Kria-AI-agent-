import { describe, it, expect } from 'vitest';
import { createLead, updateLeadStatus, getLeads } from '@/lib/services/leads';
import { DEMO_LEADS } from '@/lib/demo-data';

describe('Leads & CRM Pipeline Logic', () => {
  it('loads baseline demo leads with valid fields and is_demo marker', async () => {
    const res = await getLeads();
    expect(res.data.length).toBeGreaterThan(0);
    const first = res.data[0];
    expect(first.is_demo).toBe(true);
    expect(first.name).toBeDefined();
    expect(first.status).toBeDefined();
  });

  it('creates a new lead with proper default values', async () => {
    const res = await createLead({
      name: 'Aditya Birla Retail',
      business_name: 'Birla Lifestyle Gifts',
      source: 'b2b_inquiry',
      product_interest: 'Clear Magnetic Acrylic Photo Frame (4x6)',
      quantity: 150,
      budget: 50000,
      location: 'Bangalore, KA',
      priority: 'high',
    });

    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    expect(res.data?.status).toBe('new');
    expect(res.data?.quantity).toBe(150);
  });

  it('transitions lead status through pipeline stages', async () => {
    const testLeadId = DEMO_LEADS[0].id;
    const res = await updateLeadStatus(testLeadId, 'won');

    expect(res.success).toBe(true);
    const updated = DEMO_LEADS.find((l) => l.id === testLeadId);
    expect(updated?.status).toBe('won');
  });
});
