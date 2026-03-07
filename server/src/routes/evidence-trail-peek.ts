import { Router, type Response } from 'express';
import {
  getEvidenceIndex,
  getRankedClaims,
  getTopEvidence,
} from '../services/evidence-trail-peek.js';

const router = Router();

const isFeatureEnabled = () =>
  process.env.FEATURE_EVIDENCE_TRAIL_PEEK === 'true';

const guardFeature = (res: Response) => {
  if (isFeatureEnabled()) return true;
  res.status(404).json({ error: 'Feature disabled' });
  return false;
};

router.get('/evidence-index', async (req, res) => {
  if (!guardFeature(res)) return;
  const answerId = String(req.query.answer_id || '');
  const nodeId = req.query.node_id ? String(req.query.node_id) : undefined;
  if (!answerId) {
    return res.status(400).json({ error: 'answer_id required' });
  }
  const items = await getEvidenceIndex(answerId, nodeId);
  return res.json({ items });
});

router.get('/evidence-top', async (req, res) => {
  if (!guardFeature(res)) return;
  const answerId = String(req.query.answer_id || '');
  const limit = Math.max(1, Math.min(20, Number(req.query.limit || 5)));
  if (!answerId) {
    return res.status(400).json({ error: 'answer_id required' });
  }
  const items = await getTopEvidence(answerId, limit);
  return res.json({ items });
});

router.get('/claim-ranking', async (req, res) => {
  if (!guardFeature(res)) return;
  const answerId = String(req.query.answer_id || '');
  if (!answerId) {
    return res.status(400).json({ error: 'answer_id required' });
  }
  const claims = await getRankedClaims(answerId);
  return res.json({ claims });
});

export default router;
