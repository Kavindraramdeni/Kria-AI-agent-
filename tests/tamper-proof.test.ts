import { describe, it, expect } from 'vitest';
import { computeLogHash, verifyAuditLogIntegrity } from '@/lib/services/tamper-proof';
import { ActivityLog } from '@/types/database';

describe('Cryptographic Tamper-Evident Audit Trail', () => {
  it('validates an intact, unbroken chain of SHA-256 audit logs', () => {
    const genesisHash = '0000000000000000000000000000000000000000000000000000000000000000';
    
    const time1 = '2026-11-17T10:00:00.000Z';
    const hash1 = computeLogHash({
      previous_hash: genesisHash,
      created_at: time1,
      entity_type: 'product',
      action: 'created',
      actor_id: 'admin@kriatech.com',
      metadata: { sku: 'MAPF-0406-CL' },
    });

    const log1: ActivityLog = {
      id: 'log-1',
      entity_type: 'product',
      entity_id: 'prod-1',
      action: 'created',
      description: 'Created 4x6 magnetic frame',
      actor_type: 'user',
      actor_id: 'admin@kriatech.com',
      metadata: { sku: 'MAPF-0406-CL' },
      previous_hash: genesisHash,
      hash: hash1,
      created_at: time1,
    };

    const time2 = '2026-11-17T10:05:00.000Z';
    const hash2 = computeLogHash({
      previous_hash: hash1,
      created_at: time2,
      entity_type: 'approval',
      action: 'approved',
      actor_id: 'owner@kriatech.com',
      metadata: { approval_id: 'app-99' },
    });

    const log2: ActivityLog = {
      id: 'log-2',
      entity_type: 'approval',
      entity_id: 'app-99',
      action: 'approved',
      description: 'Approved wholesale quote dispatch',
      actor_type: 'user',
      actor_id: 'owner@kriatech.com',
      metadata: { approval_id: 'app-99' },
      previous_hash: hash1,
      hash: hash2,
      created_at: time2,
    };

    const result = verifyAuditLogIntegrity([log1, log2]);
    expect(result.isValid).toBe(true);
    expect(result.totalLogsVerified).toBe(2);
    expect(result.tamperedLogId).toBeUndefined();
  });

  it('detects unauthorized tampering or content modification within a log entry', () => {
    const genesisHash = '0000000000000000000000000000000000000000000000000000000000000000';
    const time1 = '2026-11-17T10:00:00.000Z';
    const hash1 = computeLogHash({
      previous_hash: genesisHash,
      created_at: time1,
      entity_type: 'approval',
      action: 'dispatched',
      actor_id: 'admin@kriatech.com',
      metadata: { amount: 50000 },
    });

    const log1: ActivityLog = {
      id: 'log-1',
      entity_type: 'approval',
      entity_id: 'app-1',
      action: 'dispatched',
      description: 'Dispatched wholesale quote',
      actor_type: 'user',
      actor_id: 'admin@kriatech.com',
      metadata: { amount: 50000 },
      previous_hash: genesisHash,
      hash: hash1,
      created_at: time1,
    };

    // Attacker modifies metadata amount in database to cover up unauthorized change
    const tamperedLog: ActivityLog = {
      ...log1,
      metadata: { amount: 5000 }, // TAMPERED!
    };

    const result = verifyAuditLogIntegrity([tamperedLog]);
    expect(result.isValid).toBe(false);
    expect(result.tamperedLogId).toBe('log-1');
    expect(result.tamperReason).toContain('Cryptographic checksum mismatch');
  });

  it('detects injected or deleted logs breaking previous_hash linkage', () => {
    const genesisHash = '0000000000000000000000000000000000000000000000000000000000000000';
    const time1 = '2026-11-17T10:00:00.000Z';
    const hash1 = computeLogHash({
      previous_hash: genesisHash,
      created_at: time1,
      entity_type: 'lead',
      action: 'created',
      actor_id: 'staff@kriatech.com',
      metadata: {},
    });

    const log1: ActivityLog = {
      id: 'log-1',
      entity_type: 'lead',
      entity_id: 'lead-1',
      action: 'created',
      description: 'Created lead',
      actor_type: 'user',
      actor_id: 'staff@kriatech.com',
      metadata: {},
      previous_hash: genesisHash,
      hash: hash1,
      created_at: time1,
    };

    // An injected log that does not chain properly
    const log2Injected: ActivityLog = {
      id: 'log-injected',
      entity_type: 'approval',
      entity_id: 'app-fake',
      action: 'fake_approval',
      description: 'Injected fake approval',
      actor_type: 'user',
      actor_id: 'attacker',
      metadata: {},
      previous_hash: 'fake_previous_hash_value_12345', // BROKEN CHAIN!
      hash: 'fake_hash',
      created_at: '2026-11-17T10:05:00.000Z',
    };

    const result = verifyAuditLogIntegrity([log1, log2Injected]);
    expect(result.isValid).toBe(false);
    expect(result.tamperedLogId).toBe('log-injected');
    expect(result.tamperReason).toContain('Broken chain link');
  });
});
