import { Router, type Request, type Response } from 'express';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = Router();

// Mock Data Generators
function generateEvidence(id: string, weight: number): any {
  return {
    evidence_id: id,
    title: `Evidence Artifact ${id}`,
    url: `https://example.com/artifact/${id}`,
    ts: new Date().toISOString(),
    weight: weight,
    badges: [
      { kind: 'SBOM', href: '#' },
      { kind: 'Provenance', href: '#' }
    ].slice(0, Math.floor(Math.random() * 3) + 1) // Ensure at least 1 badge sometimes
  };
}

// GET /api/evidence-index?answer_id=...&node_id=...
router.get('/evidence-index', ensureAuthenticated, (req: Request, res: Response) => {
  const { answer_id, node_id } = req.query;
  const items = Array.from({ length: 5 }, (_, i) => generateEvidence(`ev-${i}`, Math.random()));
  // Sort by time (ts) is implicit in generation or random
  res.json({ items });
});

// GET /api/evidence-top?answer_id=...&limit=5
router.get('/evidence-top', ensureAuthenticated, (req: Request, res: Response) => {
  const { answer_id, limit } = req.query;
  const count = parseInt(limit as string) || 5;
  const items = Array.from({ length: count }, (_, i) => generateEvidence(`top-${i}`, Math.random()));
  items.sort((a: any, b: any) => b.weight - a.weight);
  res.json({ items });
});

// GET /api/claim-ranking?answer_id=...
router.get('/claim-ranking', ensureAuthenticated, (req: Request, res: Response) => {
  const { answer_id } = req.query;
  const claims = [
    {
      claim_id: 'c1',
      text: 'The suspect accessed the server at 2AM.',
      verifiability: 0.95,
      supporting: ['ev-0', 'ev-1'],
      delta: 0.5
    },
    {
      claim_id: 'c2',
      text: 'Data exfiltration occurred via port 443.',
      verifiability: 0.85,
      supporting: ['ev-2'],
      delta: 0.3
    },
    {
      claim_id: 'c3',
      text: 'No malware signatures were detected.',
      verifiability: 0.75,
      supporting: ['ev-3', 'ev-4'],
      delta: -0.2
    }
  ];
  // Sort by verifiability desc
  claims.sort((a, b) => b.verifiability - a.verifiability);
  res.json({ claims });
});

export default router;
