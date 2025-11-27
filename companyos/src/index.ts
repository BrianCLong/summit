import express from 'express';
import { startPolicyManager } from './policy/index.js';
import { createCompanyOSRouter } from './api/index.js';
import { pool } from './db/client.js';
import {
  createDisclosureIngestHandler,
  createDisclosureRoutes,
} from './disclosure/routes.js';

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json());
app.use('/api/companyos', createCompanyOSRouter(pool));
app.use('/api/disclosure-packs', createDisclosureRoutes(pool));
app.post('/api/internal/disclosure-packs', createDisclosureIngestHandler(pool));

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
