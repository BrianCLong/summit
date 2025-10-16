import express from 'express';
import { Pool } from 'pg';
import { syncRunbooks } from '../gitops/sync.js';

const router = express.Router();
const pg = new Pool({ connectionString: process.env.DATABASE_URL });

router.post('/sync', async (_req, res) => {
  try {
    const out = await syncRunbooks();
    res.json(out);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'failed' });
  }
});

router.get('/runbooks/:family/:name/versions', async (req, res) => {
  try {
    const { family, name } = req.params as any;
    const { rows } = await pg.query(
      `SELECT version FROM runbook_versions WHERE family=$1 AND name=$2 ORDER BY created_at DESC`,
      [family, name],
    );
    res.json(rows.map((r) => r.version));
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'failed' });
  }
});

export default router;
