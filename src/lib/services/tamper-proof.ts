import { createHash } from 'crypto';
import { ActivityLog } from '@/types/database';

export interface TamperCheckResult {
  isValid: boolean;
  totalLogsVerified: number;
  tamperedLogId?: string;
  tamperReason?: string;
}

/**
 * Computes deterministic SHA-256 hash for an audit log entry.
 * Chain formula: SHA-256(previous_hash + created_at + entity_type + action + actor_id + payload_json)
 */
export function computeLogHash(entry: {
  previous_hash: string;
  created_at: string;
  entity_type: string;
  action: string;
  actor_id?: string | null;
  metadata?: Record<string, any>;
}): string {
  const payloadString = JSON.stringify(entry.metadata || {});
  const rawString = `${entry.previous_hash}|${entry.created_at}|${entry.entity_type}|${entry.action}|${entry.actor_id || 'anonymous'}|${payloadString}`;
  return createHash('sha256').update(rawString).digest('hex');
}

/**
 * Validates the cryptographic integrity of an audit log chain.
 * Detects if any record was modified, deleted, or injected out of sequence.
 */
export function verifyAuditLogIntegrity(logs: ActivityLog[]): TamperCheckResult {
  if (!logs || logs.length === 0) {
    return { isValid: true, totalLogsVerified: 0 };
  }

  // Work chronologically (oldest to newest)
  const chronological = [...logs].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  let expectedPreviousHash = '0000000000000000000000000000000000000000000000000000000000000000'; // Genesis hash

  for (let i = 0; i < chronological.length; i++) {
    const log = chronological[i];
    const logPrevHash = (log as any).previous_hash || expectedPreviousHash;
    const recordedHash = (log as any).hash;

    // Verify chain linkage
    if (logPrevHash !== expectedPreviousHash && i > 0) {
      return {
        isValid: false,
        totalLogsVerified: i,
        tamperedLogId: log.id,
        tamperReason: `Broken chain link: previous_hash does not match preceding record hash.`,
      };
    }

    // Verify self-integrity hash
    if (recordedHash) {
      const recomputedHash = computeLogHash({
        previous_hash: logPrevHash,
        created_at: log.created_at,
        entity_type: log.entity_type,
        action: log.action,
        actor_id: log.actor_id,
        metadata: log.metadata,
      });

      if (recomputedHash !== recordedHash) {
        return {
          isValid: false,
          totalLogsVerified: i,
          tamperedLogId: log.id,
          tamperReason: `Cryptographic checksum mismatch: log content or metadata was modified after recording.`,
        };
      }
      expectedPreviousHash = recordedHash;
    } else {
      expectedPreviousHash = logPrevHash;
    }
  }

  return {
    isValid: true,
    totalLogsVerified: chronological.length,
  };
}
