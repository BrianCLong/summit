import { Router } from 'express';
import { requirePermission } from '../middleware/auth.js';

export const analyticsExtRouter = Router();

// Link prediction (placeholder): return pairs with simple score derived from IDs
analyticsExtRouter.get(
  '/link-prediction',
  requirePermission('analytics:run'),
  (req, res) => {
    const seeds = String(req.query.seeds || '')
      .split(',')
      .filter(Boolean);
    const out = [] as any[];
    for (let i = 0; i < seeds.length; i++) {
      for (let j = i + 1; j < seeds.length; j++) {
        const a = seeds[i],
          b = seeds[j];
        const score = ((a.length + b.length) % 10) / 10;
        out.push({ a, b, score });
      }
    }
    res.json({ items: out.sort((x, y) => y.score - x.score).slice(0, 50) });
  },
);
