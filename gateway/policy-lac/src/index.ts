import express from 'express';
import { evaluate, loadDefaultPolicy } from './policy-engine';

const app = express();
app.use(express.json());

const policy = loadDefaultPolicy();

app.post('/policy/explain', (req, res) => {
  const { action, resource, attributes } = req.body || {};
  if(!action || !resource){
    res.status(400).json({ error: 'action and resource are required' });
    return;
  }
  const decision = evaluate(policy, { action, resource, attributes: attributes ?? {} });
  res.json({ ...decision, input: { action, resource, attributes: attributes ?? {} } });
});

app.get('/health', (_, res) => res.send('ok'));

app.listen(4000, () => console.log('[policy-lac] listening on 4000'));
