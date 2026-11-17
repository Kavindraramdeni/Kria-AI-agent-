import { describe, it, expect } from 'vitest';
import { DEMO_USERS } from '@/lib/auth/session';

describe('Phase 1 — Authentication, RBAC & Role Verification', () => {
  it('correctly maps owner permissions to admin@kriatech.com', () => {
    const owner = DEMO_USERS['admin@kriatech.com'];
    expect(owner).toBeDefined();
    expect(owner.role).toBe('owner');
    expect(owner.email).toBe('admin@kriatech.com');
  });

  it('correctly maps staff permissions with restricted role to staff@kriatech.com', () => {
    const staff = DEMO_USERS['staff@kriatech.com'];
    expect(staff).toBeDefined();
    expect(staff.role).toBe('staff');
    expect(staff.email).toBe('staff@kriatech.com');
  });

  it('enforces that staff does not hold owner role', () => {
    const staff = DEMO_USERS['staff@kriatech.com'];
    const isOwnerOrAdmin = staff.role === 'owner' || (staff.role as string) === 'admin';
    expect(isOwnerOrAdmin).toBe(false);
  });
});
