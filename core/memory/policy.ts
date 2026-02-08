import { Purpose, MemoryScope, MemoryPolicyDecision, MemoryRecord } from './types';

/**
 * Evaluates whether a memory record can be read given a requested scope.
 * Implements Purpose Limitation, Context Isolation, and Retention (TTL).
 */
export function canRead(
  request: MemoryScope,
  record: Pick<MemoryRecord, 'userId' | 'purpose' | 'contextSpace' | 'expiresAt'>
): MemoryPolicyDecision {
  const now = Date.now();

  // 1. Retention Check
  if (now > record.expiresAt) {
    return { allow: false, reason: "expired" };
  }

  // 2. Purpose Limitation
  if (request.purpose !== record.purpose) {
    return { allow: false, reason: "purpose_mismatch" };
  }

  // 3. Context Isolation
  if (request.contextSpace !== record.contextSpace) {
    return { allow: false, reason: "context_mismatch" };
  }

  // 4. User Isolation (Multi-tenancy)
  if (request.userId !== record.userId) {
    return { allow: false, reason: "user_mismatch" };
  }

  return { allow: true, reason: "ok" };
}

/**
 * Evaluates whether a memory record can be written.
 * Deny-by-default: requires explicit purpose and context.
 */
export function canWrite(
  record: Partial<MemoryRecord>
): MemoryPolicyDecision {
  if (!record.purpose) {
    return { allow: false, reason: "missing_purpose" };
  }
  if (!record.contextSpace) {
    return { allow: false, reason: "missing_context_space" };
  }
  if (!record.expiresAt || record.expiresAt <= Date.now()) {
    return { allow: false, reason: "invalid_ttl" };
  }
  return { allow: true, reason: "ok" };
}
