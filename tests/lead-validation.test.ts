import { describe, it, expect } from 'vitest';
import { createLead, updateLeadStatus, getLeads } from '@/lib/services/leads';

describe('Leads & CRM Pipeline Logic', () => {
  it('creates a new lead with proper default values and tracks in pipeline', async () => {
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
    const created = await createLead({
      name: 'Studio PixelCraft Lead',
      source: 'instagram',
      product_interest: '5x7 Acrylic Frame',
      quantity: 50,
    });

    const leadId = created.data!.id;
    const res = await updateLeadStatus(leadId, 'won');

    expect(res.success).toBe(true);
  });

  it('retrieves active leads list without crashing on empty state', async () => {
    const res = await getLeads();
    expect(Array.isArray(res.data)).toBe(true);
  });
});
