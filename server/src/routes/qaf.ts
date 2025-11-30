import express from 'express';
import { SummitQAF } from '../qaf/factory.js';
import { AgentConfig } from '../qaf/types.js';

const router = express.Router();
const factory = new SummitQAF();

/**
 * @api {post} /api/qaf/spawn Spawn a new agent
 * @apiGroup QAF
 */
router.post('/spawn', async (req, res) => {
  try {
    const config: AgentConfig = req.body;
    // Default to quantum-secure if not specified, for "Quantum-Ready" prompt requirement
    if (!config.securityLevel) {
        config.securityLevel = 'quantum-secure';
    }
    const identity = await factory.spawnAgent(config);
    res.json(identity);
  } catch (error) {
    res.status(500).json({ error: 'Failed to spawn agent' });
  }
});

/**
 * @api {get} /api/qaf/telemetry Get ROI telemetry
 * @apiGroup QAF
 */
router.get('/telemetry', (req, res) => {
  res.json(factory.getTelemetry());
});

/**
 * @api {post} /api/qaf/scan Run quantum security scan
 * @apiGroup QAF
 */
router.post('/scan', async (req, res) => {
  const result = await factory.runQuantumScan();
  res.json(result);
});

export default router;
