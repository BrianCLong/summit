
import { Router } from 'express';
import SummitCogWarService from '../cogwar/SummitCogWarService.js';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = Router();

// Launch Operation (Red or Blue)
router.post('/operation', ensureAuthenticated, async (req, res) => {
  try {
    const { type, params } = req.body;
    const result = await SummitCogWarService.launchOperation(type, params);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Run Simulation
router.post('/simulation', ensureAuthenticated, async (req, res) => {
  try {
    const { narrativeId } = req.body;
    const result = await SummitCogWarService.runSimulation(narrativeId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Service Status (for War Room)
router.get('/status', ensureAuthenticated, async (req, res) => {
  res.json({
    status: 'ACTIVE',
    activeThreats: 12, // Placeholder
    simulationCapacity: '95%',
    ethicsGuard: 'ENABLED'
  });
});

export default router;
