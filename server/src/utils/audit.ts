import crypto from 'crypto';
import { getPostgresPool } from '../config/database.js';

type JsonObject = Record<string, unknown>;

function deepDiff(before: JsonObject = {}, after: JsonObject = {}): JsonObject {
  // Simple structural diff capturing changed keys only
  const changed: JsonObject = {};
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  for (const k of keys) {
    const bv = (before as any)?.[k];
    const av = (after as any)?.[k];
    const bothObjects = bv && av && typeof bv === 'object' && typeof av === 'object';
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
}

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

    let previousHash: string | null = null;
    // Fetch the signature of the most recent audit log
    try {
      const lastAuditResult = await pool.query(
        `SELECT signature FROM audit_logs ORDER BY created_at DESC LIMIT 1`
      );
      if (lastAuditResult.rows.length > 0) {
        previousHash = lastAuditResult.rows[0].signature;
      }
    } catch (e) {
      console.warn('Could not fetch previous audit hash:', e);
      // Non-fatal: proceed without previous hash if fetching fails
    }

    // Signature for integrity
    const secret = process.env.AUDIT_SIGNING_SECRET;
    if (secret) {
      const payloadToSign: JsonObject = {
        userId: userId || null,
        action,
        resourceType: resourceType || null,
        resourceId: resourceId || null,
        before: enrichedDetails.before ?? null,
        after: enrichedDetails.after ?? null,
        at: new Date().toISOString(),
        previousHash: previousHash, // Include previous hash in the payload for current signature
      };
      enrichedDetails.signature = signAuditPayload(payloadToSign, secret);
    }

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent, previous_hash, signature)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        userId || null,
        action,
        resourceType || null,
        resourceId || null,
        enrichedDetails,
        ip || null,
        userAgent || null,
        previousHash, // Store the previous hash in the database
        enrichedDetails.signature, // Store the new signature
      ],
    );
  } catch (e) {
    // non-fatal, avoid throwing in hot paths
    console.error('Error writing audit log:', e);
  }
}

export { writeAudit };