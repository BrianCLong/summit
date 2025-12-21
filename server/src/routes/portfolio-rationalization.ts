import express from 'express';
import { ensureAuthenticated } from '../middleware/auth.js';
import { PortfolioRationalizationService } from '../governance/rationalization/PortfolioRationalizationService.js';

const router = express.Router();
const service = new PortfolioRationalizationService();

router.use(ensureAuthenticated);

router.get('/inventory', async (_req, res) => {
  res.json(await service.listModules());
});

router.post('/modules', async (req, res) => {
  try {
    const module = await service.upsertModule(req.body);
    res.status(201).json(module);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/modules/:id/classification', async (req, res) => {
  try {
    const updated = await service.classifyModule(
      req.params.id,
      req.body.classification,
      req.body.reason,
      req.body.horizonMonths,
    );
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/modules/:id/deprecation', async (req, res) => {
  try {
    const updated = await service.planDeprecation(
      req.params.id,
      req.body.segments,
      req.body.compat,
      req.body.exceptionPolicy || [],
    );
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/modules/:id/telemetry', async (req, res) => {
  try {
    const updated = await service.recordTelemetry(req.params.id, req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/modules/:id/removal-check', async (req, res) => {
  try {
    const result = await service.requestRemoval(req.params.id, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/reports/deletions', (req, res) => {
  const month = typeof req.query.month === 'string' ? req.query.month : '';
  res.json(service.generateDeletionReport(month));
});

router.post('/compat', async (req, res) => {
  try {
    const toggle = await service.toggleCompatModeForCohort(
      req.body.cohort,
      req.body.enabled,
      req.body.reason,
      req.body.expiresAt,
    );
    res.json(toggle);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
