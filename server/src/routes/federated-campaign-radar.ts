import express from 'express';
import { FcrService } from '../services/fcr/fcr-service.js';
import { FcrSignal } from '../services/fcr/types.js';

const router = express.Router();
const fcrService = new FcrService();

router.post('/fcr/budget', express.json(), async (req, res) => {
  const { tenant_id: tenantId, epsilon, delta } = req.body || {};
  if (!tenantId || typeof epsilon !== 'number' || typeof delta !== 'number') {
    res.status(400).json({ error: 'tenant_id, epsilon, and delta are required.' });
    return;
  }
  fcrService.configureTenantBudget(tenantId, epsilon, delta);
  res.status(200).json({ ok: true });
});

router.post('/fcr/ingest', express.json(), async (req, res) => {
  const { tenant_id: tenantId, signals } = req.body || {};
  if (!tenantId || !Array.isArray(signals)) {
    res.status(400).json({ error: 'tenant_id and signals array are required.' });
    return;
  }
  const ingestResult = await fcrService.ingestSignals(
    tenantId,
    signals as FcrSignal[],
  );
  if (!ingestResult.ok) {
    const errors = 'errors' in ingestResult ? ingestResult.errors : ['Ingest failed'];
    res.status(422).json({ ok: false, errors });
    return;
  }
  res.status(200).json({ ok: true, signals: ingestResult.signals });
});

router.post('/fcr/run', express.json(), async (req, res) => {
  const { tenant_id: tenantId, signals } = req.body || {};
  if (!tenantId || !Array.isArray(signals)) {
    res.status(400).json({ error: 'tenant_id and signals array are required.' });
    return;
  }
  const result = await fcrService.runPipeline(tenantId, signals as FcrSignal[]);
  if (!result.ok) {
    const errors = 'errors' in result ? result.errors : ['Pipeline failed'];
    res.status(422).json({ ok: false, errors });
    return;
  }
  res.status(200).json(result);
});

export default router;
