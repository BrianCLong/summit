import { Router } from 'express';
import { poll, ack } from '../relay/queue';
import { Pool } from 'pg';
import { verifySiteAuth } from '../sites/auth';

const r = Router();
const pg = new Pool({ connectionString: process.env.DATABASE_URL });

r.post('/poll', verifySiteAuth, async (req, res) => {
  const siteId = (req as any).siteId || req.body.siteId;
  const max = Number(req.body?.max || 50);
  const msgs = await poll(siteId, max);
  res.json({ msgs });
});

r.post('/ack', verifySiteAuth, async (req, res) => {
  const ids = (req.body?.dbIds || [])
    .map((x: any) => Number(x))
    .filter((n: any) => Number.isFinite(n));
  await ack(ids);
  res.json({ ok: true });
});

r.post('/push', verifySiteAuth, async (req: any, res) => {
  try {
    const siteId = req.siteId as string;
    const {
      ticketId,
      artifacts = [],
      logs = [],
      metrics = {},
    } = req.body || {};
    if (!ticketId) return res.status(400).json({ error: 'ticketId required' });
    const {
      rows: [t],
    } = await pg.query(
      `SELECT status FROM remote_tickets WHERE ticket_id=$1 AND site_id=$2`,
      [ticketId, siteId],
    );
    if (t?.status === 'DONE') return res.json({ ok: true, idempotent: true });
    await pg.query(
      `UPDATE remote_tickets SET status='DONE', result=$1, completed_at=now() WHERE ticket_id=$2 AND site_id=$3`,
      [{ artifacts, logs, metrics }, ticketId, siteId],
    );
    await pg.query(
      `UPDATE sync_outbox SET status='ACK' WHERE ref=$1 AND site_id=$2 AND kind='exec.step'`,
      [ticketId, siteId],
    );
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'failed' });
  }
});

export default r;
