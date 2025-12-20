import express from 'express';
import { defaultPolicySimulationService } from '../governance/policy-simulation-service.js';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = express.Router();

router.use(ensureAuthenticated);

router.post('/simulate', async (req, res) => {
  if (process.env.POLICY_SIMULATION !== '1') {
    return res.status(403).json({
      error: 'Policy simulation feature is disabled. Set POLICY_SIMULATION=1 to enable.',
    });
  }

  try {
    const { events = [], candidatePolicy } = req.body || {};
    const result = await defaultPolicySimulationService.runSimulation({
      events,
      candidatePolicy,
    });

    return res.json({ ok: true, result });
  } catch (error: any) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});

export default router;
