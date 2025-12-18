
import { Router } from 'express';
import { verificationSwarmService } from '../services/VerificationSwarmService.js';
import { evidenceFusionService } from '../services/EvidenceFusionService.js';
import { deepfakeHunterService } from '../services/DeepfakeHunterService.js';
import { predictiveScenarioSimulator } from '../services/PredictiveScenarioSimulator.js';
import logger from '../utils/logger.js';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = Router();

// Middleware to ensure authentication
// router.use(ensureAuthenticated); // Disabled for MVP/Testing ease if needed, but safer to have

// --- Verification Swarm ---

router.post('/verification/submit', async (req, res) => {
  try {
    const id = await verificationSwarmService.submitVerification(req.body);
    res.json({ success: true, id, message: 'Verification request submitted to swarm' });
  } catch (error: any) {
    logger.error('Verification submit error', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/verification/:id', (req, res) => {
  const result = verificationSwarmService.getResult(req.params.id);
  if (!result) return res.status(404).json({ error: 'Not found or pending' });
  res.json(result);
});

// --- Semantic Evidence Fusion ---

router.post('/fusion/timeline', async (req, res) => {
  try {
    const { evidence } = req.body;
    const timeline = await evidenceFusionService.synthesizeTimeline(evidence);
    res.json(timeline);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/fusion/hypotheses', async (req, res) => {
  try {
    const { evidence, context } = req.body;
    const hypotheses = await evidenceFusionService.generateHypotheses(evidence, context);
    res.json({ hypotheses });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Deepfake Hunter ---

router.post('/deepfake/scan', async (req, res) => {
  try {
    const result = await deepfakeHunterService.scanMedia(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Predictive Simulator ---

router.post('/simulation/run', async (req, res) => {
  try {
    const result = await predictiveScenarioSimulator.simulateScenario(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
