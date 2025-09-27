import express from 'express';
import {
  listSnapshots,
  getSnapshotForResponse,
  computeLineageDiff,
  generateReplayManifest,
} from '../provenance/eltm-service.js';

const router = express.Router();
router.use(express.json());

router.get('/snapshots', (_req, res) => {
  res.json({ snapshots: listSnapshots() });
});

router.get('/snapshots/:id', (req, res) => {
  try {
    const snapshot = getSnapshotForResponse(req.params.id);
    res.json({ snapshot });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Snapshot not found';
    res.status(404).json({ error: message });
  }
});

router.post('/diff', (req, res) => {
  const { sourceId, targetId } = req.body ?? {};
  if (typeof sourceId !== 'string' || typeof targetId !== 'string') {
    return res.status(400).json({ error: 'sourceId and targetId are required' });
  }

  try {
    const diff = computeLineageDiff(sourceId, targetId);
    res.json({ diff });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to compute diff';
    res.status(404).json({ error: message });
  }
});

router.get('/replay-manifest/:id', (req, res) => {
  try {
    const manifest = generateReplayManifest(req.params.id);
    res.json({ manifest });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Replay manifest not found';
    res.status(404).json({ error: message });
  }
});

export default router;
