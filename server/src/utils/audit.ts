import crypto from 'crypto';
import { getPostgresPool } from '../config/database.js';

type JsonObject = Record<string, unknown>;

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

function signAuditPayload(payload: JsonObject, secret?: string): string | null {
  try {
    const h = crypto.createHmac('sha256', String(secret));
    h.update(Buffer.from(JSON.stringify(payload)));
    return h.digest('base64');
  } catch (_) {
    return null;
  }
}

interface WriteAuditParams {
  userId?: string;
  userEmail?: string;
  tenantId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: JsonObject;
  ip?: string;
  userAgent?: string;
  actorRole?: string;
  sessionId?: string;
  before?: JsonObject;
  after?: JsonObject;
  success?: boolean;
  errorMessage?: string;
}

async function writeAudit({
  userId,
  userEmail,
  tenantId,
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
  success = true,
  errorMessage,
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
      `INSERT INTO audit_events (
        user_id, user_email, tenant_id, action, resource_type, resource_id,
        resource_data, old_values, new_values, success, error_message, ip_address, user_agent, session_id
      )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        userId || 'system',
        userEmail || 'system',
        tenantId || 'system',
        action,
        resourceType || 'unknown',
        resourceId || null,
        enrichedDetails,
        before || null,
        after || null,
        success,
        errorMessage || null,
        ip || null,
        userAgent || null,
        sessionId || null
      ],
    );
  } catch (e) {
    // non-fatal, avoid throwing in hot paths, but log it
    console.error('Audit write failed:', e);
  }
}

export { writeAudit };
