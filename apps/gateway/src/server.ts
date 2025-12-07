import express from 'express';
import { security } from './security';
import { policyGuard } from './middleware/policyGuard';

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(security);
app.use(policyGuard);
app.get('/healthz', (_req, res) => res.json({ ok: true, service: 'gateway' }));

const port = process.env.PORT || 8080;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`gateway listening on ${port}`);
});

export default app;
