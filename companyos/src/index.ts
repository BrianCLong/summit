import express from 'express';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import { startPolicyManager } from './policy/index.js';
import { stubIdentity } from './authz/identity-middleware.js';
import { stepUpHandler } from './auth/step-up-route.js';
import { disclosureRouter } from './disclosure/routes.js';

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cookieParser());
app.use(bodyParser.json());
app.use(stubIdentity);

app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.get('/livez', (_req, res) => res.json({ ok: true }));
app.post('/auth/step-up', stepUpHandler);
app.post('/api/auth/step-up', stepUpHandler);
app.use('/api', disclosureRouter);

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
