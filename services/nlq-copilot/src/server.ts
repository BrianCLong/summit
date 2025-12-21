import express from 'express';
import { estimate, forbidDangerous } from './guard';

const app = express();

app.use(express.json());

app.post('/copilot/plan', (req, res) => {
  const plan = 'MATCH (n) RETURN n LIMIT 10';
  res.json({ plan, cost: estimate(plan) });
});

app.post('/copilot/execute', (req, res) => {
  const { cypher } = req.body || {};
  try {
    forbidDangerous(String(cypher || ''));
  } catch (_e) {
    return res.status(400).json({ error: 'dangerous_query' });
  }
  res.json({ sandbox: req.query.sandbox === 'true', rows: [] });
});

export default app;
