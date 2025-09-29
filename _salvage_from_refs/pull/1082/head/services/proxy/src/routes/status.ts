import { Router } from 'express';
const r = Router();

r.get('/status/health.json', (_req, res) => {
  res.json({ services: { litellm: true, ollama: true, gateway: true }, version: process.env.APP_VERSION || 'dev' });
});

r.get('/status/burndown.json', (_req, res) => {
  const now = new Date().toISOString();
  res.json({ generated_at: now, windows: { m1: {}, h1: {}, d1: {} } });
});

export default r;
