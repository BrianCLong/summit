import express, { Router } from 'express';
import cookieParser from 'cookie-parser';
import { startPolicyManager } from './policy/index.js';
import { stepUpHandler } from './auth/step-up-route.js';
import { stubIdentity } from './authz/identity-middleware.js';
import { createDisclosurePackRouter } from './api/disclosure-packs.js';

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cookieParser());
app.use(express.json());
app.use(stubIdentity);

app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.get('/livez', (_req, res) => res.json({ ok: true }));

const apiRouter = Router();
apiRouter.post('/auth/step-up', stepUpHandler);
apiRouter.use('/disclosure-packs', createDisclosurePackRouter());

app.use('/api', apiRouter);
app.post('/auth/step-up', stepUpHandler);

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
