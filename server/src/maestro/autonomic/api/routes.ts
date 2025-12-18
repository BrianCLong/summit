
import { Router } from 'express';
import { SignalsService } from '../signals/signals-service';
import { SLOPolicyEngine } from '../policy/slo-policy-engine';
import { ReliabilityLoop } from '../loops/reliability-loop';
import { CostOptimizationLoop } from '../loops/cost-loop';
import { GovernanceEngine } from '../governance/governance-engine';
import { ExperimentationService } from '../experiments/experimentation-service';
import { HealingExecutor } from '../healing/healing-executor';
import { SignalType } from '../signals/types';

// Composition Root (Singleton-ish for demo)
const signalsService = new SignalsService();
const policyEngine = new SLOPolicyEngine(signalsService);
const governanceEngine = new GovernanceEngine();
const experimentationService = new ExperimentationService();
const healingExecutor = new HealingExecutor();

const reliabilityLoop = new ReliabilityLoop();
const costLoop = new CostOptimizationLoop();

const router = Router();

router.get('/health', (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string || 'default';
  const snapshot = signalsService.generateHealthSnapshot(tenantId);
  res.json(snapshot);
});

router.get('/slo', (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string || 'default';
  const alerts = policyEngine.evaluate(tenantId);
  // Ideally also return status of all budgets
  res.json({ alerts });
});

router.post('/simulate', async (req, res) => {
  const { tenantId, signalOverride } = req.body;

  // Create a hypothetical health snapshot
  // This requires refactoring monitor() to accept snapshot, which we did.
  const snapshot = signalsService.generateHealthSnapshot(tenantId || 'default');
  if (signalOverride) {
      // Apply overrides deep merge style (simplified)
      if (signalOverride.systemStatus) snapshot.system.status = signalOverride.systemStatus;
  }

  // Run loops against it
  const relPlan = await reliabilityLoop.monitor(snapshot, []).then(() => reliabilityLoop.plan());
  const costPlan = await costLoop.monitor(snapshot, []).then(() => costLoop.plan());

  const plans = [relPlan, costPlan].filter(p => p !== null);

  // Check governance
  const governedResults = [];
  for (const p of plans) {
      if (p) {
          const decisions = await governanceEngine.reviewPlan(p);
          governedResults.push({ plan: p, decisions });
      }
  }

  res.json({ simulatedPlans: governedResults });
});

router.get('/experiments/:id/results', (req, res) => {
    // Mock result
    res.json({ experimentId: req.params.id, status: 'ACTIVE', results: {} });
});

export const autonomicRouter = router;
