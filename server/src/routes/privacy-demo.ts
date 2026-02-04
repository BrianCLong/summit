import express from 'express';
import { dpGate } from '../middleware/dpGate.js';

const router = express.Router();

// Example aggregate endpoint protected by DP
router.get('/stats', dpGate({ epsilon: 0.5, sensitivity: 1 }), (req, res) => {
  // In a real app, this would fetch from DB
  const stats = {
    count: 150, // This will be noisy
    avg: 45.2   // This requires more complex handling, but for now we noisy-fy 'count'
  };
  res.json(stats);
});

router.get('/sensitive-count', dpGate({ epsilon: 1.0, sensitivity: 1, minK: 5 }), (req, res) => {
  const count = 3; // Small N
  res.json({ count });
});

export default router;
