import express from 'express';
import { evalRule } from './engine';
import rules from '../../.maestro/rules.json';
const app = express();
app.use(express.json());
app.post('/hook', async (req, res) => {
  const ev = {
    kind: req.headers['x-github-event'] as string,
    payload: req.body,
  };
  await Promise.all(rules.map((r) => evalRule(ev as any, r)));
  res.json({ ok: true });
});
app.listen(process.env.PORT || 4080);
