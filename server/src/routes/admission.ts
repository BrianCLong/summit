import express from 'express';
import { Pool } from 'pg';
import { admissionDecisionsTotal } from '../monitoring/metrics.js';

const router = express.Router();
const pg = new Pool({ connectionString: process.env.DATABASE_URL });

router.post('/event', express.json({ limit: '1mb' }), async (req, res) => {
  try {
    const { decision, policy, resource, details } = req.body || {};
    if (!decision) return res.status(400).json({ error: 'decision required' });
    await pg.query(
      `INSERT INTO admission_events(decision, policy, resource, details) VALUES ($1,$2,$3,$4)`,
      [decision, policy || null, resource || null, details || null],
    );
    admissionDecisionsTotal.inc({ decision, policy: policy || 'unknown' });
    res.status(202).json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'failed' });
  }
});

router.get('/stats', async (_req, res) => {
  const { rows } = await pg.query(
    `SELECT decision, policy, count(*) AS c FROM admission_events WHERE ts > now() - interval '24 hours' GROUP BY decision, policy ORDER BY c DESC`,
  );
  res.json(rows);
});

export default router;
