import express from 'express';
import { secureApp } from '../../libs/ops/src/http-secure';
import { csrfGuard, requireRole } from '../../libs/ops/src/auth';
import { log } from '../../libs/ops/src/log';
import { renderDisclosure } from './pack';

const app = express();
app.use(express.json());
secureApp(app);
app.use(log);
app.use(csrfGuard());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/disclosure/:id', requireRole('DisclosureApprover'), (req, res) => {
  const id = String(req.params.id);
  const body = renderDisclosure(id, `Export for ${id}`);
  res.type('html').send(body);
});

export default app;
