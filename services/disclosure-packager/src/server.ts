import express from 'express';
import { secureApp } from '../../../libs/ops/src/http-secure';
import { authenticate, csrfGuard, requireRole } from '../../../libs/ops/src/auth';
import { log } from '../../../libs/ops/src/log';
import { buildDisclosure } from './pack';

const app = express();
app.use(express.json());
secureApp(app);
app.use(log);
app.use(csrfGuard());

app.get('/disclosure/:caseId', authenticate(), (req, res) => res.json({ ok: true }));

app.post('/disclosure/:caseId/export', requireRole('DisclosureApprover'), (req, res) => {
  const doc = buildDisclosure(req.params.caseId, String(req.body?.content || ''));
  res.type('text/html').send(doc);
});

if (require.main === module) {
  const port = Number(process.env.PORT || 7016);
  app.listen(port, () => console.log(`Disclosure Packager listening on ${port}`));
}

export default app;
