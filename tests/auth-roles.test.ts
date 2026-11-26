import { describe, it, expect } from 'vitest';
import { DEMO_USERS } from '@/lib/auth/session';

describe('Phase 1 — Authentication, RBAC & Role Verification', () => {
  it('correctly maps owner permissions to admin@kriatech.in', () => {
    const owner = DEMO_USERS['admin@kriatech.in'];
    expect(owner).toBeDefined();
    expect(owner.role).toBe('owner');
    expect(owner.email).toBe('admin@kriatech.in');
  });

  it('correctly maps staff permissions with restricted role to staff@kriatech.in', () => {
    const staff = DEMO_USERS['staff@kriatech.in'];
    expect(staff).toBeDefined();
    expect(staff.role).toBe('staff');
    expect(staff.email).toBe('staff@kriatech.in');
  });

  it('enforces that staff does not hold owner role', () => {
    const staff = DEMO_USERS['staff@kriatech.in'];
    const isOwnerOrAdmin = staff.role === 'owner' || (staff.role as string) === 'admin';
    expect(isOwnerOrAdmin).toBe(false);
  });
});
