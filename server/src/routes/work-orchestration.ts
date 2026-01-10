import express from 'express';
import { ensureAuthenticated } from '../middleware/auth.js';
import { getFeatureFlagService } from '../feature-flags/setup.js';
import { workOrchestrationService } from '../work-orchestration/service.js';
import type { CreateConvoyInput, CreateFormulaInput, CreateTaskInput } from '../work-orchestration/service.js';

const router = express.Router();

const ensureTenant = (req: any, res: any, next: any) => {
  if (!req.user || !req.user.tenantId) {
    return res.status(403).json({ error: 'Tenant context required' });
  }
  return next();
};

const requireFeatureFlag = async (req: any, res: any, next: any) => {
  const flagService = getFeatureFlagService();
  const enabled = await flagService.isEnabled('durable-work-orchestration', {
    userId: req.user?.id || req.user?.userId,
    userRole: req.user?.role,
    tenantId: req.user?.tenantId,
  });

  if (!enabled) {
    return res.status(403).json({ error: 'Durable work orchestration disabled' });
  }

  return next();
};

router.use(ensureAuthenticated, ensureTenant, requireFeatureFlag);

router.post('/work/convoys', async (req: any, res: any) => {
  try {
    const convoy = await workOrchestrationService.createConvoy(
      req.user.tenantId,
      req.user.id || req.user.userId || 'unknown',
      req.body as CreateConvoyInput,
    );
    res.status(201).json(convoy);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/work/convoys', async (req: any, res: any) => {
  try {
    const convoys = await workOrchestrationService.listConvoys(req.user.tenantId);
    res.json(convoys);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/work/tasks', async (req: any, res: any) => {
  try {
    const task = await workOrchestrationService.createTask(
      req.user.tenantId,
      req.user.id || req.user.userId || 'unknown',
      req.body as CreateTaskInput,
    );
    res.status(201).json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/work/tasks/:id/dependencies', async (req: any, res: any) => {
  try {
    const task = await workOrchestrationService.addDependencies(
      req.user.tenantId,
      req.params.id,
      req.body.dependencies || [],
    );

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    return res.json(task);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/work/formulas', async (req: any, res: any) => {
  try {
    const formula = await workOrchestrationService.createFormula(
      req.user.tenantId,
      req.user.id || req.user.userId || 'unknown',
      req.body as CreateFormulaInput,
    );
    res.status(201).json(formula);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/work/formulas/:id/compile', async (req: any, res: any) => {
  try {
    const formula = await workOrchestrationService.getFormula(
      req.user.tenantId,
      req.params.id,
    );

    if (!formula) {
      return res.status(404).json({ error: 'Formula not found' });
    }

    const molecule = await workOrchestrationService.compileFormulaToMolecule(
      req.user.tenantId,
      req.user.id || req.user.userId || 'unknown',
      formula,
      req.body.convoyId,
    );
    res.status(201).json(molecule);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/work/hooks/:id/assign', async (req: any, res: any) => {
  try {
    const hook = await workOrchestrationService.assignTaskToHook(
      req.user.tenantId,
      req.body.taskId,
      req.params.id,
    );

    if (!hook) {
      return res.status(404).json({ error: 'Hook not found' });
    }

    return res.json(hook);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/work/hooks', async (req: any, res: any) => {
  try {
    const hook = await workOrchestrationService.createHook(
      req.user.tenantId,
      req.body.agentId,
    );
    res.status(201).json(hook);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/work/hooks/:id/claim', async (req: any, res: any) => {
  try {
    const task = await workOrchestrationService.claimHookTask(
      req.user.tenantId,
      req.params.id,
    );
    res.json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/work/molecules/:id/next', async (req: any, res: any) => {
  try {
    const step = await workOrchestrationService.getNextStep(
      req.user.tenantId,
      req.params.id,
    );
    res.json(step);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/work/molecules/:id/steps/:stepId/close', async (req: any, res: any) => {
  try {
    const step = await workOrchestrationService.closeStep(
      req.user.tenantId,
      req.params.id,
      req.params.stepId,
    );

    if (!step) {
      return res.status(404).json({ error: 'Step not found' });
    }

    return res.json(step);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/work/dashboard', async (req: any, res: any) => {
  try {
    const data = await workOrchestrationService.getDashboard(req.user.tenantId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
