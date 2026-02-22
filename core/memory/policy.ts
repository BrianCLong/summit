import { MemoryScope, MemoryRecord, MemoryPolicyDecision } from "./types";

/**
 * Evaluates whether a memory record can be read given a specific request scope.
 * Implements deny-by-default, purpose limitation, and context partitioning.
 */
export function canRead(
  request: MemoryScope,
  record: MemoryRecord
): MemoryPolicyDecision {
  const now = Date.now();

  // 1. Check User ID (Isolation)
  if (request.userId !== record.userId) {
    return { allow: false, reason: "user_mismatch" };
  }

  // 2. Check expiration (Retention)
  if (record.expiresAt > 0 && now > record.expiresAt) {
    return { allow: false, reason: "expired" };
  }

  // 3. Check Purpose Limitation
  if (request.purpose !== record.purpose) {
    return { allow: false, reason: "purpose_mismatch" };
  }

  // 4. Check Context Partitioning
  if (request.contextSpace !== record.contextSpace) {
    return { allow: false, reason: "context_mismatch" };
  }

  // 4. Default Allow if all guards pass
  return { allow: true, reason: "ok" };
}

/**
 * Evaluates whether a memory record can be written.
 * Enforces mandatory purpose and context space.
 */
export function canWrite(record: Partial<MemoryRecord>): MemoryPolicyDecision {
  if (!record.purpose) {
    return { allow: false, reason: "missing_purpose" };
  }
  if (!record.contextSpace) {
    return { allow: false, reason: "missing_context_space" };
  }
  if (!record.userId) {
    return { allow: false, reason: "missing_user_id" };
  }
  return { allow: true, reason: "ok" };
}
