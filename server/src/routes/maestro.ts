
// @ts-nocheck
import express, { Request, Response } from 'express';
import { z } from 'zod';
import { ensureAuthenticated } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { workflowService } from '../maestro/workflow-service.js';
import { runService } from '../maestro/run-service.js';
import { policyClient } from '../maestro/policy-client.js';
import {
  WorkflowDefinitionSchema,
  StartRunSchema,
  ApprovalSchema,
  ApprovalInput
} from '../maestro/api-types.js';

const router = express.Router({ mergeParams: true });

// --- Workflows ---

router.post('/tenants/:tenantId/workflows', ensureAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = req.params;

  // Validate tenant access
  if (req.user?.tenantId !== tenantId && !req.user?.roles?.includes('admin')) {
    return res.status(403).json({ error: 'Unauthorized access to tenant' });
  }

  const input = WorkflowDefinitionSchema.parse(req.body);
  const workflow = await workflowService.createDefinition(tenantId, input);
  res.status(201).json(workflow);
}));

// --- Runs ---

router.post('/tenants/:tenantId/runs', ensureAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const { tenantId } = req.params;

  if (req.user?.tenantId !== tenantId && !req.user?.roles?.includes('admin')) {
    return res.status(403).json({ error: 'Unauthorized access to tenant' });
  }

  // 1. OPA Preflight Check
  const policyResult = await policyClient.evaluate({
    action: 'start_run',
    user: req.user,
    resource: { tenantId }
  });

  if (!policyResult.allowed) {
    return res.status(403).json({ error: 'Policy denied: ' + policyResult.reason });
  }

  const input = StartRunSchema.parse(req.body);

  // 2. Execute
  const run = await runService.createRun(
    tenantId,
    input.workflowId,
    input.input,
    req.user!.id,
    input.env || 'dev'
  );

  res.status(201).json(run);
}));

router.get('/tenants/:tenantId/runs/:runId', ensureAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, runId } = req.params;

  if (req.user?.tenantId !== tenantId && !req.user?.roles?.includes('admin')) {
    return res.status(403).json({ error: 'Unauthorized access to tenant' });
  }

  // Retrieve logic (stub for now, assuming graph persistence works)
  // In a real implementation, we'd add `runService.getRun(runId)`
  res.json({
    id: runId,
    tenantId,
    workflowId: 'wf-stub',
    status: 'PENDING',
    input: '{}',
    receipts: []
  });
}));

// --- Approvals ---

router.post('/tenants/:tenantId/runs/:runId/approve', ensureAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, runId } = req.params;

  if (req.user?.tenantId !== tenantId && !req.user?.roles?.includes('admin')) {
    return res.status(403).json({ error: 'Unauthorized access to tenant' });
  }

  const input = ApprovalSchema.parse(req.body);

  // Policy check for approval
  const policyResult = await policyClient.evaluate({
    action: 'approve_run',
    user: req.user,
    resource: { tenantId, runId }
  });

  if (!policyResult.allowed) {
    return res.status(403).json({ error: 'Policy denied: ' + policyResult.reason });
  }

  // Stub logic for approval processing
  res.json({ status: 'PROCESSED', decision: input.decision });
}));

// --- Events ---

router.get('/tenants/:tenantId/runs/:runId/events', ensureAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const { tenantId, runId } = req.params;

  if (req.user?.tenantId !== tenantId && !req.user?.roles?.includes('admin')) {
    return res.status(403).json({ error: 'Unauthorized access to tenant' });
  }

  // Stub response
  res.json([
    { id: 'evt-1', type: 'run.created', timestamp: new Date().toISOString(), payload: '{}' }
  ]);
}));

export default router;
