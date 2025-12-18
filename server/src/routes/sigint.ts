import express from 'express';
import { SigIntManager } from '../sigint/SigIntManager.js';
import { z } from 'zod';

const router = express.Router();
const sigIntManager = SigIntManager.getInstance();

// Validation Schemas
const IngestSchema = z.object({
  emitterId: z.string().optional(),
  frequency: z.number().min(1),
  bandwidth: z.number().min(1),
  power: z.number().max(0),
  snr: z.number().optional(),
  duration: z.number().optional(),
  protocol: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

/**
 * POST /sigint/ingest
 * Ingest a raw signal event for processing.
 */
router.post('/ingest', async (req, res) => {
  try {
    const validated = IngestSchema.parse(req.body);
    const result = await sigIntManager.processSignalEvent(validated);
    res.json({ success: true, signal: result });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid Input' });
  }
});

/**
 * GET /sigint/emitters
 * List active emitters detected by the system.
 */
router.get('/emitters', (req, res) => {
  const emitters = sigIntManager.getActiveEmitters();
  res.json({ count: emitters.length, emitters });
});

/**
 * GET /sigint/signals
 * Get recent raw signal logs.
 */
router.get('/signals', (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
  const signals = sigIntManager.getRecentSignals(limit);
  res.json({ count: signals.length, signals });
});

/**
 * POST /sigint/scan
 * Trigger a simulated spectrum scan.
 */
router.post('/scan', (req, res) => {
  const start = req.body.start ? Number(req.body.start) : 88e6;
  const stop = req.body.stop ? Number(req.body.stop) : 108e6;

  const scanResult = sigIntManager.performSpectrumScan(start, stop);
  res.json(scanResult);
});

export default router;
