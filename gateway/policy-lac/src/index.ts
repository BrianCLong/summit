import express from 'express';

const app = express();
app.use(express.json());

app.post('/policy/explain', (req, res) => {
  res.json({ allowed: false, reason: 'Denied by default (no matching policy)', input: req.body || {} });
});

app.get('/health', (_, res) => res.send('ok'));

app.listen(4000, () => console.log('[policy-lac] listening on 4000'));
