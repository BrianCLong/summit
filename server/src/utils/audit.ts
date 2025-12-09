import crypto from 'crypto';
import { getPostgresPool } from '../config/database.js';

type JsonObject = Record<string, unknown>;

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
  for (const k of keys) {
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
  } catch (_) {
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
}

/**
 * Writes an audit log entry to the database.
 *
 * It automatically computes the diff between `before` and `after` states if provided,
 * and signs the payload if an audit signing secret is configured.
 *
 * Failures to write to the audit log are swallowed to prevent breaking the main application flow,
 * but should be monitored.
 *
 * @param params - The audit log parameters.
 * @returns A Promise that resolves when the log entry is written (or silently fails).
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
}: WriteAuditParams): Promise<void> {
  try {
    const pool = getPostgresPool();
    const enrichedDetails: JsonObject = { ...details };
    if (before || after) {
      enrichedDetails.before = before ?? null;
      enrichedDetails.after = after ?? null;
      enrichedDetails.diff = deepDiff(before || {}, after || {});
    }
    if (actorRole) enrichedDetails.actorRole = actorRole;
    if (sessionId) enrichedDetails.sessionId = sessionId;
    if (ip) enrichedDetails.ip = ip;
    // Signature for integrity
    const secret = process.env.AUDIT_SIGNING_SECRET;
    if (secret) {
      enrichedDetails.signature = signAuditPayload(
        {
          userId: userId || null,
          action,
          resourceType: resourceType || null,
          resourceId: resourceId || null,
          before: enrichedDetails.before ?? null,
          after: enrichedDetails.after ?? null,
          at: new Date().toISOString(),
        },
        secret,
      );
    }

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        userId || null,
        action,
        resourceType || null,
        resourceId || null,
        enrichedDetails,
        ip || null,
        userAgent || null,
      ],
    );
  } catch (e) {
    // non-fatal, avoid throwing in hot paths
  }
}

export { writeAudit };
