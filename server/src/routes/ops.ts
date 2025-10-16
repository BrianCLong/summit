import { Router } from 'express';
import { rollup } from '../ops/capacity';

const r = Router();

r.get('/ops/capacity', async (req, res) => {
  const { tenant = 'acme', from, to } = req.query as any;
  if (!from || !to)
    return res.status(400).json({ error: 'from,to required (ISO)' });
  const out = await rollup(String(tenant), String(from), String(to));
  res.json(out);
});

export default r;
