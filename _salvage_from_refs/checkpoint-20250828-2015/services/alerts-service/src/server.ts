import express from 'express';
import { v4 as uuidv4 } from 'uuid';

export type Watchlist = { id: string; name: string; rule: string; createdBy: string; createdAt: string };
const watchlists = new Map<string, Watchlist>();

function validateRule(rule: string): boolean {
  // Very small DSL: entity.type='X' AND riskScore>=0.7 (no injection risk if validated strictly)
  return /^entity\.type\s*=\s*'[^']+'(\s+AND\s+riskScore\s*>=\s*\d+(\.\d+)?)?$/i.test(rule);
}

export async function createServer() {
  const app = express();
  app.use(express.json());

  // CRUD watchlists
  app.post('/alerts/v1/watchlists', (req, res) => {
    const { name, rule, createdBy } = req.body || {};
    if (!name || !rule || !createdBy) return res.status(400).json({ error: 'invalid_payload' });
    if (!validateRule(rule)) return res.status(400).json({ error: 'invalid_rule' });
    const id = uuidv4();
    const wl: Watchlist = { id, name, rule, createdBy, createdAt: new Date().toISOString() };
    watchlists.set(id, wl);
    res.status(201).json(wl);
  });

  app.get('/alerts/v1/watchlists', (_req, res) => res.json(Array.from(watchlists.values())));

  app.put('/alerts/v1/watchlists/:id', (req, res) => {
    const { id } = req.params;
    if (!watchlists.has(id)) return res.status(404).json({ error: 'not_found' });
    const { name, rule } = req.body || {};
    if (rule && !validateRule(rule)) return res.status(400).json({ error: 'invalid_rule' });
    const prev = watchlists.get(id)!;
    const next = { ...prev, ...(name ? { name } : {}), ...(rule ? { rule } : {}) };
    watchlists.set(id, next);
    res.json(next);
  });

  app.delete('/alerts/v1/watchlists/:id', (req, res) => {
    const { id } = req.params;
    watchlists.delete(id);
    res.status(204).end();
  });

  // Evaluate (stub): returns hits based on trivial conditions
  app.post('/alerts/v1/evaluate', (req, res) => {
    const { entityId, type, riskScore } = req.body || {};
    const hits: string[] = [];
    for (const wl of watchlists.values()) {
      const okType = wl.rule.match(/entity\.type\s*=\s*'([^']+)'/i);
      const okRisk = wl.rule.match(/riskScore\s*>=\s*(\d+(?:\.\d+)?)/i);
      const typeMatch = okType ? String(type) === okType[1] : true;
      const riskMatch = okRisk ? Number(riskScore || 0) >= Number(okRisk[1]) : true;
      if (typeMatch && riskMatch) hits.push(wl.id);
    }
    res.json({ hits, entityId });
  });

  return app;
}
