import { Router } from 'express';
import { DefensivePsyOpsService } from '../services/DefensivePsyOpsService.js';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = Router();
const psyOpsService = new DefensivePsyOpsService();

// Get active threats
router.get('/threats', ensureAuthenticated, async (req, res) => {
  try {
    const threats = await psyOpsService.getActiveThreats();
    res.json(threats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch threats' });
  }
});

// Manual scan
router.post('/scan', ensureAuthenticated, async (req, res) => {
  try {
    const { content, source } = req.body;
    if (!content)
      return res.status(400).json({ error: 'Content is required' });

    const threat = await psyOpsService.detectPsychologicalThreats(content, {
      source: source || 'MANUAL_SCAN',
      user: (req as any).user,
    });

    if (threat) {
      res.status(200).json({ detected: true, threat });
    } else {
      res.status(200).json({ detected: false });
    }
  } catch (error) {
    res.status(500).json({ error: 'Scan failed' });
  }
});

// Resolve threat
router.post('/threats/:id/resolve', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    await psyOpsService.resolveThreat(id, notes || 'Resolved by user');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Resolution failed' });
  }
});

export default router;
