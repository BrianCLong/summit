import express from 'express';
import { startPolicyManager } from './policy/index.js';

const app = express();
const port = Number(process.env.PORT || 3000);

app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.get('/livez', (_req, res) => res.json({ ok: true }));

if (
  process.env.NODE_ENV !== 'test' &&
  process.env.POLICY_AUTO_START !== 'false'
) {
  try {
    startPolicyManager();
  } catch (e) {
    console.warn('policy manager start failed', (e as Error).message);
  }
}

app.listen(port, () => console.log(`[companyos] listening on :${port}`));
