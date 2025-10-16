import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getPostgresPool } from '../db/postgres.js';

const router = express.Router();
const SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || '';

function verifySlackSignature(req: any, body: string) {
  const ts = req.headers['x-slack-request-timestamp'];
  const sig = req.headers['x-slack-signature'] as string;
  if (!ts || !sig) return false;
  const base = `v0:${ts}:${body}`;
  const hmac = crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(base)
    .digest('hex');
  const expected = `v0=${hmac}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}

// Self-contained raw-body route: ensure we receive the raw payload before any global parsers
router.post(
  '/webhooks/slack',
  express.raw({ type: '*/*', limit: '1mb' }),
  async (req: Request, res: Response) => {
    if (!SIGNING_SECRET) return res.status(503).send('slack disabled');
    const raw = Buffer.isBuffer((req as any).body)
      ? (req as any).body.toString()
      : (req as any).rawBody || '';
    // Preserve rawBody for downstream logic
    (req as any).rawBody = raw;
    if (!verifySlackSignature(req as any, raw))
      return res.status(401).send('bad sig');

    // Parse JSON payload if present
    let payload: any = {};
    try {
      payload = JSON.parse(raw || '{}');
    } catch {
      payload = {};
    }
    (req as any).body = payload;
    let data: any = payload;
    if (
      typeof payload === 'string' ||
      (payload?.payload && typeof payload.payload === 'string')
    ) {
      try {
        data = JSON.parse(payload.payload || payload);
      } catch {}
    }
    const action = data?.actions?.[0];
    const val = action?.value || '';
    const [runId, stepId, verdict] = val.split('|');
    const ok = verdict === 'ok';
    const pool = getPostgresPool();
    const justification = `${ok ? 'approved' : 'declined'} via slack`;
    try {
      if (ok) {
        await pool.query(
          'INSERT INTO run_event (run_id, kind, payload) VALUES ($1,$2,$3)',
          [runId, 'approval.approved', { stepId, justification }],
        );
        await pool.query(
          'UPDATE run_step SET status=$1, blocked_reason=NULL WHERE run_id=$2 AND step_id=$3',
          ['RUNNING', runId, stepId],
        );
      } else {
        await pool.query(
          'INSERT INTO run_event (run_id, kind, payload) VALUES ($1,$2,$3)',
          [runId, 'approval.declined', { stepId, justification }],
        );
        await pool.query(
          'UPDATE run_step SET status=$1, blocked_reason=$2, ended_at=now() WHERE run_id=$3 AND step_id=$4',
          ['FAILED', `declined: ${justification}`, runId, stepId],
        );
        await pool.query(
          'UPDATE run SET status=$1, ended_at=now() WHERE id=$2 AND status<>$1',
          ['FAILED', runId],
        );
      }
    } catch {}
    res.json({ ok: true });
  },
);

export default router;
