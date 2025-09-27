import crypto from 'crypto';
import { Pool } from 'pg';

const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });

interface Evidence {
  tenant: string;
  action: string;
  subject: string;
  details: Record<string, any>;
  resourceType?: string;
  resourceId?: string;
  actorId?: string;
  ipAddress?: string;
  userAgent?: string;
}

function computeSignature(payload: Record<string, unknown>, secret?: string): string | null {
  if (!secret) return null;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(Buffer.from(JSON.stringify(payload)));
  return hmac.digest('hex');
}

export async function createEvidence(evidence: Evidence): Promise<{ id: string; signature: string | null }> {
  const client = await pgPool.connect();

  try {
    const lastSignatureResult = await client.query(
      'SELECT signature FROM audit_logs ORDER BY created_at DESC LIMIT 1'
    );
    const previousHash: string | null = lastSignatureResult.rows[0]?.signature || null;

    const auditDetails = {
      tenant: evidence.tenant,
      subject: evidence.subject,
      ...evidence.details
    };

    const signingSecret = process.env.AUDIT_SIGNING_SECRET;
    const signaturePayload = {
      tenant: evidence.tenant,
      subject: evidence.subject,
      action: evidence.action,
      resourceType: evidence.resourceType || null,
      resourceId: evidence.resourceId || null,
      previousHash
    };
    const signature = computeSignature(signaturePayload, signingSecret);

    const insertResult = await client.query(
      `INSERT INTO audit_logs
         (user_id, action, resource_type, resource_id, details, ip_address, user_agent, previous_hash, signature)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)
       RETURNING id, signature`,
      [
        evidence.actorId || null,
        evidence.action,
        evidence.resourceType || 'privacy_event',
        evidence.resourceId || null,
        auditDetails,
        evidence.ipAddress || null,
        evidence.userAgent || null,
        previousHash,
        signature
      ]
    );

    return { id: insertResult.rows[0].id, signature: insertResult.rows[0].signature };
  } finally {
    client.release();
  }
}

