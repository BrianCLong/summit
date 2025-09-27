import { Router } from 'express';
import { Pool } from 'pg';
import { z } from 'zod';
import crypto from 'crypto';

const r = Router();
const db = new Pool({ connectionString: process.env.DATABASE_URL });

type RequestUser = {
  id?: string;
  role?: string;
  tenantId?: string;
  email?: string;
};

const rtbfAttestationSchema = z.object({
  signature: z.string().min(10, 'attestation signature required'),
  issued_at: z
    .string()
    .refine(value => !Number.isNaN(Date.parse(value)), 'issued_at must be ISO timestamp'),
  expires_at: z
    .string()
    .optional()
    .refine(value => !value || !Number.isNaN(Date.parse(value)), 'expires_at must be ISO timestamp'),
  authority: z.string().optional()
});

const rtbfRequestSchema = z.object({
  subject_id: z.string().min(1),
  tenant: z.string().min(1),
  reason: z.string().optional(),
  attestation: rtbfAttestationSchema
});

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function verifyRtbfAuthority(payload: z.infer<typeof rtbfRequestSchema>, actor: RequestUser): void {
  if (!actor?.id) {
    const error = new Error('Authentication required for RTBF');
    (error as any).status = 401;
    throw error;
  }

  const allowedRoles = ['ADMIN', 'admin', 'COMPLIANCE', 'PRIVACY_OFFICER', 'PRIVACY'];
  if (!allowedRoles.includes(actor.role || '')) {
    const error = new Error('Insufficient role for RTBF request');
    (error as any).status = 403;
    throw error;
  }

  if (actor.tenantId && actor.tenantId !== payload.tenant) {
    const error = new Error('Actor tenant mismatch');
    (error as any).status = 403;
    throw error;
  }

  const issuedAt = new Date(payload.attestation.issued_at);
  const now = new Date();
  const maxAgeMinutes = parseInt(process.env.RTBF_ATTESTATION_MAX_AGE_MINUTES || '1440', 10);
  const ageMinutes = Math.abs(now.getTime() - issuedAt.getTime()) / (1000 * 60);
  if (ageMinutes > maxAgeMinutes) {
    const error = new Error('Attestation is expired');
    (error as any).status = 400;
    throw error;
  }

  if (payload.attestation.expires_at) {
    const expiresAt = new Date(payload.attestation.expires_at);
    if (expiresAt.getTime() < now.getTime()) {
      const error = new Error('Attestation token already expired');
      (error as any).status = 400;
      throw error;
    }
  }

  const attestationSecret = process.env.RTBF_ATTESTATION_SECRET || 'rtbf-dev-secret';
  const expected = crypto
    .createHmac('sha256', attestationSecret)
    .update(`${payload.subject_id}:${payload.tenant}:${payload.attestation.issued_at}`)
    .digest('hex');

  if (!safeEqual(expected, payload.attestation.signature)) {
    const error = new Error('Invalid RTBF attestation signature');
    (error as any).status = 403;
    throw error;
  }
}

function getRequestUser(req: any): RequestUser {
  return (req?.user || {}) as RequestUser;
}

r.post('/dsar/request', async (req, res) => {
  const { subject_id, tenant } = req.body;
  // enqueue job; return tracking id
  const { rows } = await db.query(
    "insert into dsar_requests(subject_id, tenant, status) values ($1,$2,'queued') returning id",
    [subject_id, tenant],
  );
  res.status(202).json({ id: rows[0].id });
});

r.get('/dsar/export/:id', async (req, res) => {
  // stream a JSON export assembled offline; ensure fields masked via OPA purpose tags
  res.setHeader('content-type', 'application/json');
  res.write('{"status":"ready","parts":[]}');
  res.end();
});

r.post('/rtbf', async (req, res) => {
  try {
    const payload = rtbfRequestSchema.parse(req.body);
    const actor = getRequestUser(req);

    verifyRtbfAuthority(payload, actor);

    const existing = await db.query(
      `SELECT id, status FROM privacy_rtbf_requests
        WHERE subject_id = $1 AND tenant = $2 AND status IN ('queued', 'processing')`,
      [payload.subject_id, payload.tenant]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        queued: true,
        request_id: existing.rows[0].id,
        status: existing.rows[0].status,
        message: 'RTBF request already in progress'
      });
    }

    const attestationPayload = {
      authority: payload.attestation.authority || actor.email || actor.id,
      issued_at: payload.attestation.issued_at,
      expires_at: payload.attestation.expires_at || null,
      reason: payload.reason || null
    };

    const { rows } = await db.query(
      `INSERT INTO privacy_rtbf_requests
         (subject_id, tenant, status, requested_by, attestation_signature, attestation_issued_at,
          attestation_payload, authority_verified_at, verified_by, retention_tier_snapshot)
       VALUES ($1, $2, 'queued', $3, $4, $5, $6::jsonb, NOW(), $3, $7)
       RETURNING id`,
      [
        payload.subject_id,
        payload.tenant,
        actor.id || null,
        payload.attestation.signature,
        payload.attestation.issued_at,
        attestationPayload,
        'rtbf-anonymize'
      ]
    );

    res.status(202).json({ queued: true, request_id: rows[0].id });
  } catch (error) {
    const status = (error as any)?.status || 400;
    res.status(status).json({ error: (error as Error).message });
  }
});

export default r;
