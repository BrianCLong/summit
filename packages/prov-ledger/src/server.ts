import express from 'express';
import bodyParser from 'body-parser';
import { buildWallet, disclose } from './wallet';
import { StepCommit } from './types';

const PRIVATE = process.env.PRIVATE_KEY_PEM!;
const app = express();
app.use(bodyParser.json({ limit: '4mb' }));

app.post('/wallet/build', (req, res) => {
  const { runId, caseId, steps } = req.body as {
    runId: string;
    caseId: string;
    steps: StepCommit[];
  };
  const out = buildWallet(runId, caseId, steps, PRIVATE);
  res.json(out);
});

app.post('/wallet/disclose', (req, res) => {
  const { manifest, steps, leaves, stepIds } = req.body;
  const bundle = disclose(stepIds, manifest, steps, leaves);
  res.json(bundle);
});

app.listen(process.env.PORT || 7101, () => console.log('prov-ledger on 7101'));
