import express from 'express';
import { computeBurn } from '../slo.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const runbook = String((((req.query.runbook as string) as string) as string) || '');
    const tenant = String((((req.query.tenant as string) as string) as string) || '');
    if (!runbook || !tenant)
      return res.status(400).json({ error: 'runbook and tenant required' });
    const r = await computeBurn(
      runbook,
      tenant,
      process.env.SLO_WINDOW || '24h',
    );
    res.json(r);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'failed' });
  }
});

export default router;
