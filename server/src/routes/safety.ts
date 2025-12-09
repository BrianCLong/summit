import express from 'express';
import { AdversarialLabService } from '../services/safety/AdversarialLabService.js';
import { ModelAbuseWatch } from '../services/safety/ModelAbuseWatch.js';

const router = express.Router();
const lab = new AdversarialLabService();
const watch = new ModelAbuseWatch();

router.post('/drill', async (req, res) => {
  try {
    const { endpoint } = req.body;
    const results = await lab.runPromptInjectionDrill(endpoint);
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/telemetry/abuse', (req, res) => {
  const { userId, prompt, output } = req.body;
  watch.trackRequest(userId, prompt, output);
  res.sendStatus(200);
});

export default router;
