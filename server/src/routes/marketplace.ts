import express from 'express';
import { installStep } from '../marketplace.js';

const router = express.Router();

router.post('/install', async (req, res) => {
  const name = String(req.query.name || '');
  const version = String(req.query.version || '');
  if (!name || !version)
    return res.status(400).json({ error: 'name and version required' });
  try {
    const file = await installStep(name, version);
    res.json({ ok: true, file });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'failed' });
  }
});

export default router;
