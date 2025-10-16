import express from 'express';
import { planBackfill, runBackfill } from '../conductor/backfill.js';

const router = express.Router();

router.post('/plan', express.text({ type: '*/*' }), async (req, res) => {
  try {
    const slots = await planBackfill(String(req.body || ''));
    res.json({ slots });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'invalid yaml' });
  }
});

router.post('/run', express.text({ type: '*/*' }), async (req, res) => {
  try {
    const planned = await runBackfill(String(req.body || ''), true);
    res.json({ planned });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'invalid yaml' });
  }
});

export default router;
