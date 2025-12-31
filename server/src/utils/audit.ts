/**
 * Server Audit Utilities
 * Comprehensive audit logging with integrity verification
 *
 * ✅ SCAFFOLD ELIMINATED: Fixed error swallowing - audit failures now logged and optionally fatal
 */

import * as crypto from 'crypto';
import { getPostgresPool } from '../config/database.js';

type JsonObject = Record<string, unknown>;

/**
 * Audit failure mode configuration
 */
const AUDIT_FAILURE_MODE = (process.env.AUDIT_FAILURE_MODE || 'log').toLowerCase();
const VALID_MODES = ['log', 'throw', 'ignore'];

if (!VALID_MODES.includes(AUDIT_FAILURE_MODE)) {
  console.warn(
    `[AUDIT] Invalid AUDIT_FAILURE_MODE: ${AUDIT_FAILURE_MODE}. ` +
    `Valid values: ${VALID_MODES.join(', ')}. Defaulting to 'log'.`
  );
}

// Audit failure tracking (for monitoring/alerting)
let auditFailureCount = 0;
let lastAuditFailure: Date | null = null;
let consecutiveFailures = 0;

/**
 * Computes a deep difference between two JSON objects.
 *
 * @param before - The original object.
 * @param after - The modified object.
 * @returns An object representing the changed keys and their values.
 */
function deepDiff(before: JsonObject = {}, after: JsonObject = {}): JsonObject {
  // Simple structural diff capturing changed keys only
  const changed: JsonObject = {};
  const keys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);
  for (const k of Array.from(keys)) {
    const bv = (before as any)?.[k];
    const av = (after as any)?.[k];
    const bothObjects =
      bv && av && typeof bv === 'object' && typeof av === 'object';
    if (bothObjects) {
      const nested = deepDiff(bv as JsonObject, av as JsonObject);
      if (nested && Object.keys(nested).length) changed[k] = nested;
    } else if (JSON.stringify(bv) !== JSON.stringify(av)) {
      changed[k] = { before: bv, after: av };
    }
  }
  return changed;
}

/**
 * Signs the audit payload using an HMAC-SHA256 signature for integrity verification.
 *
 * @param payload - The payload to sign.
 * @param secret - The signing secret.
 * @returns The Base64 encoded signature, or null if signing fails.
 */
function signAuditPayload(payload: JsonObject, secret?: string): string | null {
  try {
    const h = crypto.createHmac('sha256', String(secret));
    h.update(Buffer.from(JSON.stringify(payload)));
    return h.digest('base64');
  } catch (error) {
    console.error('[AUDIT] Failed to sign audit payload:', error);
    return null;
  }
}

/**
 * Parameters for recording an audit log entry.
 */
interface WriteAuditParams {
  /** The ID of the user performing the action. */
  userId?: string;
  /** The type of action performed (e.g., 'CREATE', 'UPDATE', 'LOGIN'). */
  action: string;
  /** The type of resource affected (e.g., 'USER', 'DOCUMENT'). */
  resourceType?: string;
  /** The ID of the resource affected. */
  resourceId?: string;
  /** Additional details about the action. */
  details?: JsonObject;
  /** The IP address of the actor. */
  ip?: string;
  /** The user agent string of the actor. */
  userAgent?: string;
  /** The role of the actor at the time of the action. */
  actorRole?: string;
  /** The session ID of the actor. */
  sessionId?: string;
  /** The state of the resource before the action. */
  before?: JsonObject;
  /** The state of the resource after the action. */
  after?: JsonObject;
  /** Tenant ID for multi-tenant isolation. */
  tenantId?: string;
}

/**
 * Get audit failure statistics
 *
 * @returns Audit failure metrics for monitoring
 */
export function getAuditFailureStats(): {
  totalFailures: number;
  consecutiveFailures: number;
  lastFailure: Date | null;
  failureMode: string;
} {
  return {
    totalFailures: auditFailureCount,
    consecutiveFailures,
    lastFailure: lastAuditFailure,
    failureMode: AUDIT_FAILURE_MODE,
  };
}

/**
 * Reset audit failure counters (for testing/monitoring)
 */
export function resetAuditFailureStats(): void {
  auditFailureCount = 0;
  consecutiveFailures = 0;
  lastAuditFailure = null;
  console.log('[AUDIT] Failure statistics reset');
}

/**
 * Writes an audit log entry to the database.
 *
 * ✅ SECURITY FIX: Replaced silent error swallowing with proper error handling
 *
 * PREVIOUS VULNERABILITY:
 * - Lines 146-148: Empty catch block silently swallowed all errors
 * - Comment at lines 86-87 admitted "failures...are swallowed"
 * - No logging of audit failures (compliance violation)
 * - No monitoring/alerting capability
 * - Operators unaware when audit logging fails
 * - Could hide attacks (attacker could DoS audit system)
 *
 * NEW SECURE APPROACH:
 * - Errors logged at ERROR level with full details
 * - Failure tracking for monitoring/alerting
 * - Configurable failure mode via AUDIT_FAILURE_MODE env var:
 *   - 'log' (default): Log error but don't throw
 *   - 'throw': Throw error to fail operation if audit fails
 *   - 'ignore': Silent (legacy behavior, not recommended)
 * - Circuit breaker pattern (consecutive failure tracking)
 * - Audit failure statistics exposed for monitoring
 *
 * It automatically computes the diff between `before` and `after` states if provided,
 * and signs the payload if an audit signing secret is configured.
 *
 * @param params - The audit log parameters.
 * @returns A Promise that resolves when the log entry is written.
 * @throws Error if AUDIT_FAILURE_MODE='throw' and write fails
 */
async function writeAudit({
  userId,
  action,
  resourceType,
  resourceId,
  details = {},
  ip,
  userAgent,
  actorRole,
  sessionId,
  before,
  after,
  tenantId,
}: WriteAuditParams): Promise<void> {
  try {
    const pool = getPostgresPool();
    const enrichedDetails: JsonObject = { ...details };

    // Add before/after/diff if provided
    if (before || after) {
      enrichedDetails.before = before ?? null;
      enrichedDetails.after = after ?? null;
      enrichedDetails.diff = deepDiff(before || {}, after || {});
    }

    // Enrich with metadata
    if (actorRole) enrichedDetails.actorRole = actorRole;
    if (sessionId) enrichedDetails.sessionId = sessionId;
    if (ip) enrichedDetails.ip = ip;
    if (tenantId) enrichedDetails.tenantId = tenantId;

    // Signature for integrity verification
    const secret = process.env.AUDIT_SIGNING_SECRET;
    if (secret) {
      enrichedDetails.signature = signAuditPayload(
        {
          userId: userId || null,
          action,
          resourceType: resourceType || null,
          resourceId: resourceId || null,
          tenantId: tenantId || null,
          before: enrichedDetails.before ?? null,
          after: enrichedDetails.after ?? null,
          at: new Date().toISOString(),
        },
        secret,
      );
    }

    // Write to database
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent, tenant_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        userId || null,
        action,
        resourceType || null,
        resourceId || null,
        enrichedDetails,
        ip || null,
        userAgent || null,
        tenantId || null,
      ],
    );

    // Success - reset consecutive failure counter
    if (consecutiveFailures > 0) {
      console.log(
        `[AUDIT] Audit logging recovered after ${consecutiveFailures} consecutive failures`
      );
      consecutiveFailures = 0;
    }
  } catch (error) {
    // ✅ SECURITY FIX: Proper error handling instead of silent swallowing

    // Track failure metrics
    auditFailureCount++;
    consecutiveFailures++;
    lastAuditFailure = new Date();

    // Build detailed error message
    const errorMessage =
      `[AUDIT] CRITICAL: Failed to write audit log entry. ` +
      `User=${userId || 'unknown'}, action=${action}, ` +
      `resource=${resourceType}:${resourceId || 'none'}, ` +
      `tenant=${tenantId || 'none'}, ` +
      `consecutiveFailures=${consecutiveFailures}, ` +
      `totalFailures=${auditFailureCount}, ` +
      `error=${error instanceof Error ? error.message : 'Unknown'}`;

    // Log error with full context
    console.error(errorMessage, {
      error: error instanceof Error ? error.stack : error,
      params: {
        userId,
        action,
        resourceType,
        resourceId,
        tenantId,
        ip,
        actorRole,
        sessionId,
      },
      failureStats: {
        totalFailures: auditFailureCount,
        consecutiveFailures,
        lastFailure: lastAuditFailure,
      },
    });

    // Circuit breaker warning
    if (consecutiveFailures >= 10) {
      console.error(
        `[AUDIT] ALERT: ${consecutiveFailures} consecutive audit failures detected. ` +
        `Audit logging may be completely down! Check database connectivity.`
      );
    }

    // Handle based on failure mode
    if (AUDIT_FAILURE_MODE === 'throw') {
      // Fail-fast: throw error to prevent operation from succeeding
      throw new Error(
        `Audit logging failed for ${action} by ${userId || 'unknown'}: ` +
        `${error instanceof Error ? error.message : 'Unknown error'}. ` +
        `Operation aborted to maintain audit trail integrity.`
      );
    } else if (AUDIT_FAILURE_MODE === 'ignore') {
      // Legacy behavior: silent (not recommended)
      // Error already logged above
    } else {
      // Default 'log' mode: error logged but operation continues
      // Error already logged above
    }

    // TODO: Add metrics export for monitoring systems
    // TODO: Add alerting integration (PagerDuty, Slack, etc.)
    // TODO: Consider dead letter queue for failed audit entries
  }
}

/**
 * Verify audit log integrity using signatures
 *
 * @param auditEntry - Audit log entry to verify
 * @param secret - Audit signing secret
 * @returns true if signature valid, false otherwise
 */
export function verifyAuditSignature(
  auditEntry: {
    userId?: string | null;
    action: string;
    resourceType?: string | null;
    resourceId?: string | null;
    tenantId?: string | null;
    details: JsonObject;
  },
  secret: string,
): boolean {
  if (!auditEntry.details.signature) {
    return false;
  }

  const payload = {
    userId: auditEntry.userId || null,
    action: auditEntry.action,
    resourceType: auditEntry.resourceType || null,
    resourceId: auditEntry.resourceId || null,
    tenantId: auditEntry.tenantId || null,
    before: auditEntry.details.before ?? null,
    after: auditEntry.details.after ?? null,
    at: auditEntry.details.at || null,
  };

  const expectedSignature = signAuditPayload(payload, secret);
  return expectedSignature === auditEntry.details.signature;
}

export { writeAudit };
