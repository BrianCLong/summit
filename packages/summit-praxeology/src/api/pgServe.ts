import express from 'express';

import actionCoordinated from '../fixtures/action.coordinated-posting.example.json';
import actionCrossPlatform from '../fixtures/action.cross-platform-amplification.example.json';
import evidenceFixture from '../fixtures/evidence.sample.json';
import playbookFixture from '../fixtures/playbook.defensive.example.json';
import writeSetFixture from '../fixtures/writeset.pg.example.json';
import { matchPlaybook } from '../engine/matchPlaybook';
import { InMemoryPGQuarantine } from '../engine/quarantine';
import { validateActionSignature } from '../validate/validateActionSignature';
import { validatePGWriteSet } from '../validate/validatePGWriteSet';
import { validatePlaybook } from '../validate/validatePlaybook';

const app = express();
app.use(express.json({ limit: '2mb' }));

const quarantine = new InMemoryPGQuarantine();

app.get('/healthz', (_req, res) => {
  res.json({ ok: true, service: 'summit-praxeology' });
});

app.get('/pg/fixtures', (_req, res) => {
  res.json({
    playbook: playbookFixture,
    actionSignatures: [actionCoordinated, actionCrossPlatform],
    evidence: evidenceFixture,
    writeSet: writeSetFixture,
  });
});

app.post('/pg/validate-playbook', (req, res) => {
  const report = validatePlaybook(req.body);
  res.status(report.ok ? 200 : 400).json(report);
});

app.post('/pg/validate-action-signature', (req, res) => {
  const report = validateActionSignature(req.body);
  res.status(report.ok ? 200 : 400).json(report);
});

app.post('/pg/validate-writeset', (req, res) => {
  const report = validatePGWriteSet(req.body);

  if (report.ok && req.body && typeof req.body.id === 'string') {
    quarantine.put({
      id: req.body.id,
      receivedAt: new Date().toISOString(),
      raw: req.body,
      validation: report,
    });
  }

  res.status(report.ok ? 200 : 400).json(report);
});

app.get('/pg/quarantine', (_req, res) => {
  res.json({ items: quarantine.list() });
});

app.post('/pg/match', (req, res) => {
  const body = req.body ?? {};

  const playbook = body.playbook ?? playbookFixture;
  const evidence = body.evidence ?? evidenceFixture;
  const actionSignatures =
    body.actionSignatures ?? [actionCoordinated, actionCrossPlatform];

  const actionSignaturesById = Object.fromEntries(
    actionSignatures.map((signature: { id: string }) => [signature.id, signature]),
  );

  const hypothesis = matchPlaybook({
    playbook,
    actionSignaturesById,
    evidence,
  });

  res.json(hypothesis);
});

const port = Number(process.env.PORT ?? 4017);

app.listen(port, () => {
  console.log(`summit-praxeology listening on :${port}`);
});
