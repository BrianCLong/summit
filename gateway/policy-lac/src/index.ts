import express from 'express';
import { evaluateOperation, loadPolicies } from './policy-engine';

const app = express();
app.use(express.json());

const config = loadPolicies();

app.post('/policy/explain', (req, res) => {
  const opText: string = req.body?.query ?? '';
  const result = evaluateOperation(opText, config);
  res.json({ ...result, input: req.body || {} });
});

app.get('/policy/snapshot', (_req, res) => {
  res.json(config);
});

app.get('/health', (_req, res) => res.send('ok'));

app.listen(4000, () => console.log('[policy-lac] listening on 4000'));
