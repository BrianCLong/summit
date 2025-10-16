import { Router } from 'express';
import { estimateCost } from '../utils/cost.js';

export const copilotRouter = Router();

copilotRouter.post('/estimate', (req, res) => {
  const prompt = String(req.body?.prompt || '');
  const est = estimateCost(prompt);
  res.json({ ok: true, cost: est });
});

// Safety classifier (stub): deny bulk PII or policy-bypass intents
copilotRouter.post('/classify', (req, res) => {
  const p = String(req.body?.prompt || '');
  const risky = [
    /enumerate\s+all\s+(emails|phones|ssn|pii)/i,
    /(bypass|disable)\s+(policy|guard)/i,
    /bulk\s+export/i,
  ];
  const deny = risky.some((r) => r.test(p));
  res.json({
    ok: true,
    classification: deny ? 'unsafe' : 'safe',
    reasons: deny ? ['risky_intent'] : [],
  });
});

// Prompt toolkit/cookbook coverage (stub): return suggested queries
copilotRouter.post('/cookbook', (req, res) => {
  const topic = String(req.body?.topic || '');
  const items = [
    {
      id: 'centrality',
      title: 'Centrality for IDs',
      query:
        'query Centrality($ids:[ID!]){ centralityAnalysis(entityIds:$ids){ id centrality{ eigenvector betweenness } }}',
    },
    {
      id: 'communities',
      title: 'Communities overview',
      query: '{ communityDetection(entityIds:[], algorithm:"louvain") }',
    },
  ];
  res.json({ ok: true, topic, items });
});
