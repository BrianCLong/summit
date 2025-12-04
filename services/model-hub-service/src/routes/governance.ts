/**
 * Governance API Routes (Approvals, Evaluations, Audit)
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { approvalService } from '../governance/ApprovalService.js';
import { auditService } from '../governance/AuditService.js';
import { evaluationService } from '../evaluation/EvaluationService.js';

export const governanceRouter = Router();

// ============================================================================
// Approvals
// ============================================================================

// List approvals
governanceRouter.get(
  '/approvals',
  asyncHandler(async (req: Request, res: Response) => {
    const { modelVersionId, environment, status, requestedBy, reviewedBy, limit, offset } = req.query;

    const result = await approvalService.listApprovals({
      modelVersionId: modelVersionId as string,
      environment: environment as any,
      status: status as any,
      requestedBy: requestedBy as string,
      reviewedBy: reviewedBy as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json(result);
  }),
);

// Get approval
governanceRouter.get(
  '/approvals/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const approval = await approvalService.getApproval(req.params.id);
    res.json(approval);
  }),
);

// Request approval
governanceRouter.post(
  '/approvals',
  asyncHandler(async (req: Request, res: Response) => {
    const { modelVersionId, environment, requestedBy, evaluationRequirements } = req.body;

    const approval = await approvalService.requestApproval({
      modelVersionId,
      environment,
      requestedBy,
      evaluationRequirements,
    });

    res.status(201).json(approval);
  }),
);

// Review approval
governanceRouter.post(
  '/approvals/:id/review',
  asyncHandler(async (req: Request, res: Response) => {
    const { reviewedBy, status, notes, rejectionReason, expiresInDays } = req.body;

    const approval = await approvalService.reviewApproval({
      approvalId: req.params.id,
      reviewedBy,
      status,
      notes,
      rejectionReason,
      expiresInDays,
    });

    res.json(approval);
  }),
);

// Revoke approval
governanceRouter.post(
  '/approvals/:id/revoke',
  asyncHandler(async (req: Request, res: Response) => {
    const { revokedBy, reason } = req.body;
    const approval = await approvalService.revokeApproval(req.params.id, revokedBy, reason);
    res.json(approval);
  }),
);

// Check if approved
governanceRouter.get(
  '/approvals/check/:modelVersionId/:environment',
  asyncHandler(async (req: Request, res: Response) => {
    const { modelVersionId, environment } = req.params;
    const isApproved = await approvalService.isApproved(modelVersionId, environment as any);
    res.json({ isApproved, modelVersionId, environment });
  }),
);

// ============================================================================
// Evaluations
// ============================================================================

// List evaluation suites
governanceRouter.get(
  '/evaluations/suites',
  asyncHandler(async (req: Request, res: Response) => {
    const suites = evaluationService.listEvaluationSuites();
    res.json({ suites });
  }),
);

// Get evaluation suite
governanceRouter.get(
  '/evaluations/suites/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const suite = evaluationService.getEvaluationSuite(req.params.id);
    if (!suite) {
      res.status(404).json({ error: { message: 'Evaluation suite not found' } });
      return;
    }
    res.json(suite);
  }),
);

// List evaluation runs
governanceRouter.get(
  '/evaluations/runs',
  asyncHandler(async (req: Request, res: Response) => {
    const { modelVersionId, evaluationSuiteId, status, limit, offset } = req.query;

    const result = await evaluationService.listEvaluationRuns({
      modelVersionId: modelVersionId as string,
      evaluationSuiteId: evaluationSuiteId as string,
      status: status as any,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json(result);
  }),
);

// Get evaluation run
governanceRouter.get(
  '/evaluations/runs/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const run = await evaluationService.getEvaluationRun(req.params.id);
    res.json(run);
  }),
);

// Start evaluation
governanceRouter.post(
  '/evaluations/runs',
  asyncHandler(async (req: Request, res: Response) => {
    const { modelVersionId, evaluationSuiteId, triggeredBy, triggerType } = req.body;

    const run = await evaluationService.startEvaluation({
      modelVersionId,
      evaluationSuiteId,
      triggeredBy,
      triggerType: triggerType || 'manual',
    });

    res.status(201).json(run);
  }),
);

// Cancel evaluation
governanceRouter.post(
  '/evaluations/runs/:id/cancel',
  asyncHandler(async (req: Request, res: Response) => {
    const run = await evaluationService.cancelEvaluation(req.params.id);
    res.json(run);
  }),
);

// Check promotion readiness
governanceRouter.get(
  '/evaluations/readiness/:modelVersionId',
  asyncHandler(async (req: Request, res: Response) => {
    const readiness = await evaluationService.checkPromotionReadiness(req.params.modelVersionId);
    res.json(readiness);
  }),
);

// ============================================================================
// Audit
// ============================================================================

// List audit events
governanceRouter.get(
  '/audit',
  asyncHandler(async (req: Request, res: Response) => {
    const {
      entityType,
      entityId,
      actorId,
      eventType,
      tenantId,
      startDate,
      endDate,
      limit,
      offset,
    } = req.query;

    const result = await auditService.listAuditEvents({
      entityType: entityType as any,
      entityId: entityId as string,
      actorId: actorId as string,
      eventType: eventType as any,
      tenantId: tenantId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json(result);
  }),
);

// Get audit event
governanceRouter.get(
  '/audit/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const event = await auditService.getAuditEvent(req.params.id);
    res.json(event);
  }),
);

// Get entity audit trail
governanceRouter.get(
  '/audit/trail/:entityType/:entityId',
  asyncHandler(async (req: Request, res: Response) => {
    const { entityType, entityId } = req.params;
    const { limit } = req.query;

    const events = await auditService.getEntityAuditTrail(
      entityType as any,
      entityId,
      limit ? parseInt(limit as string) : undefined,
    );

    res.json({ events });
  }),
);

// Get actor activity
governanceRouter.get(
  '/audit/activity/:actorId',
  asyncHandler(async (req: Request, res: Response) => {
    const { actorId } = req.params;
    const { limit } = req.query;

    const events = await auditService.getActorActivity(
      actorId,
      limit ? parseInt(limit as string) : undefined,
    );

    res.json({ events });
  }),
);
