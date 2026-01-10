import express from 'express';
import { ensureAuthenticated } from '../middleware/auth.js';
import { authorize } from '../middleware/authorization.js';
import { createRuntimeSnapshot } from '../security/policyDrift/runtimeSnapshotProducer.js';
import { createRepoBaselineSnapshot } from '../security/policyDrift/repoBaselineProducer.js';
import { PolicyDriftMonitor } from '../security/policyDrift/monitor.js';

const router = express.Router();
const monitor = new PolicyDriftMonitor({ warnOnly: true });

router.use(ensureAuthenticated, authorize('manage_users'));

router.get('/policy/snapshot', (_req, res) => {
  const runtime = createRuntimeSnapshot();
  res.json({ snapshot: runtime, baseline: createRepoBaselineSnapshot() });
});

router.post('/policy/drift/check', async (_req, res) => {
  await monitor.runCheck();
  res.json({ status: 'ok' });
});

export default router;
