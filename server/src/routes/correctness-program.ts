import { Router } from 'express';
import { correctnessProgram } from '../correctness-program/index.js';
import { correlationIdMiddleware } from '../correctness-program/observability.js';

const router = Router();
router.use(correlationIdMiddleware);

router.get('/truth-map', (_req, res) => {
  res.json({ truthMap: correctnessProgram.truthMap.listTruthMap(), debt: correctnessProgram.truthMap.listTruthDebt() });
});

router.post('/truth-debt', (req, res) => {
  const { domain, kind, description, mitigation, owner } = req.body;
  const record = correctnessProgram.truthMap.addTruthDebt(domain, kind, description, mitigation, owner);
  res.status(201).json(record);
});

router.post('/truth-check', (req, res) => {
  const { domain, entityId, sources } = req.body;
  const result = correctnessProgram.truthMap.truthCheck(domain, entityId, sources || []);
  res.json(result);
});

router.get('/invariants/violations', (req, res) => {
  const domain = req.query.domain as string;
  const violations = domain
    ? correctnessProgram.invariants.violationsByDomain(domain as any)
    : correctnessProgram.invariants.violationsByDomain('customer');
  res.json({ violations });
});

router.post('/reconciliation/run', async (req, res, next) => {
  try {
    const { pairId } = req.body;
    const run = await correctnessProgram.reconciliation.runPair(pairId);
    res.json(run);
  } catch (error: any) {
    next(error);
  }
});

router.get('/reconciliation/metrics', (_req, res) => {
  res.json(correctnessProgram.reconciliation.metrics());
});

router.post('/migrations/start', (req, res) => {
  const { domain, scope, total } = req.body;
  const manifest = correctnessProgram.buildMigrationManifest(domain, scope);
  const progress = correctnessProgram.startMigration(manifest, total);
  res.status(201).json({ manifest, progress });
});

router.post('/migrations/advance', (req, res) => {
  const { manifestId, batch } = req.body;
  const manifest = { id: manifestId } as any;
  const progress = correctnessProgram.migrations.advance(manifest, batch || []);
  res.json(progress);
});

router.post('/events/validate', (req, res) => {
  const { envelope } = req.body;
  const result = correctnessProgram.eventContracts.validateEnvelope(envelope);
  res.json(result);
});

router.get('/governance/scorecards', (_req, res) => {
  res.json({ scorecards: correctnessProgram.governance.getScorecards(), waivers: correctnessProgram.governance.activeWaivers() });
});

router.post('/admin/repair', (req, res) => {
  const action = correctnessProgram.adminRepairs.queueAction(req.body);
  res.status(201).json(action);
});

router.post('/admin/repair/:id/approve', (req, res) => {
  const updated = correctnessProgram.adminRepairs.approve(req.params.id, req.body.approver);
  res.json(updated);
});

export default router;
