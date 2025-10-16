import express from 'express';
import client from 'prom-client';
const r = express.Router();
const g = new client.Gauge({
  name: 'rum_metric',
  help: 'web vitals',
  labelNames: ['name'],
});
r.post('/rum', express.text({ type: '*/*' }), (req, res) => {
  try {
    const { name, value } = JSON.parse(req.body || '{}');
    g.set({ name }, Number(value));
  } catch {}
  res.status(204).end();
});
export default r;
