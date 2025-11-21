import { Router } from 'express';
import {
  goldenPathEventsTotal,
  copilotInteractionsTotal,
  deploymentFrequency,
  changeFailureRate,
  timeToRestoreService,
  leadTimeForChanges
} from '../metrics.js';
import logger from '../utils/logger.js';

const router = Router();

router.post('/metrics', (req, res) => {
  const { event, labels } = req.body;

  if (!event) {
    return res.status(400).json({ error: 'Missing event name' });
  }

  try {
    switch (event) {
      case 'golden_path':
        if (labels?.step) {
          goldenPathEventsTotal.inc({ step: labels.step });
        }
        break;
      case 'copilot_interaction':
        copilotInteractionsTotal.inc({ status: labels?.status || 'unknown' });
        break;
      default:
        // Log unknown events but don't fail hard
        logger.warn(`Received unknown telemetry event: ${event}`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error recording telemetry metric', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DORA Metrics Webhook Endpoint
 * Intended to be called by CI/CD pipelines
 */
router.post('/dora', (req, res) => {
  const { event, labels, value } = req.body;

  // Secure this endpoint in production (placeholder check)
  // if (req.headers['x-api-key'] !== process.env.DORA_API_KEY) ...

  try {
    switch (event) {
      case 'deployment':
        deploymentFrequency.inc({ environment: labels?.environment || 'production' });
        break;

      case 'change_failure':
        // value can be 1 (failure occurred) or 0 (resolved)
        // Using Gauge to represent current rate or state
        if (typeof value === 'number') {
          changeFailureRate.set(value);
        }
        break;

      case 'incident_resolved':
         if (value && typeof value === 'number') {
           timeToRestoreService.observe(value);
         }
         break;

      case 'change_lead_time':
         if (value && typeof value === 'number') {
           leadTimeForChanges.observe(value);
         }
         break;

      default:
        return res.status(400).json({ error: 'Unknown DORA event type' });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error recording DORA metric', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
