import { Router, Request, Response, NextFunction, type Router as ExpressRouter } from 'express';
import { approvalService } from '../services/approval-service.js';
import {
  CreateApprovalRequestSchema,
  ApprovalDecisionSchema,
  CancelRequestSchema,
  ListRequestsQuerySchema,
  AppError,
  ValidationError,
} from '../types.js';
import { logger } from '../utils/logger.js';
import { ZodError } from 'zod';

const router: ExpressRouter = Router();
const log = logger.child({ component: 'approvals-routes' });

// ============================================================================
// Middleware
// ============================================================================

function extractTenantId(req: Request, res: Response, next: NextFunction): void {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(400).json({
      code: 'MISSING_TENANT_ID',
      message: 'X-Tenant-ID header is required',
    });
    return;
  }
  req.tenantId = tenantId;
  next();
}

function handleError(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(422).json({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
        code: e.code,
      })),
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      ...(err.details && { details: err.details }),
    });
    return;
  }

  log.error({ err, path: req.path }, 'Unhandled error');
  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
}

// Apply tenant extraction to all routes
router.use(extractTenantId);

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/v1/requests - Create approval request
 */
router.post('/requests', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;
    const input = CreateApprovalRequestSchema.parse(req.body);

    const request = await approvalService.createRequest(
      req.tenantId!,
      input,
      idempotencyKey,
    );

    res.status(201).json(request);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/requests - List approval requests
 */
router.get('/requests', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = ListRequestsQuerySchema.parse(req.query);
    const result = await approvalService.listRequests(req.tenantId!, query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/requests/:requestId - Get single request
 */
router.get('/requests/:requestId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { requestId } = req.params;
    const request = await approvalService.getRequest(req.tenantId!, requestId);

    if (!request) {
      res.status(404).json({
        code: 'NOT_FOUND',
        message: `Approval request '${requestId}' not found`,
      });
      return;
    }

    res.json(request);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/requests/:requestId/decision - Submit decision
 */
router.post('/requests/:requestId/decision', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { requestId } = req.params;
    const input = ApprovalDecisionSchema.parse(req.body);

    const request = await approvalService.submitDecision(
      req.tenantId!,
      requestId,
      input,
    );

    res.json(request);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/requests/:requestId/cancel - Cancel request
 */
router.post('/requests/:requestId/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { requestId } = req.params;
    const input = CancelRequestSchema.parse(req.body);

    const request = await approvalService.cancelRequest(
      req.tenantId!,
      requestId,
      input,
    );

    res.json(request);
  } catch (err) {
    next(err);
  }
});

// Error handler
router.use(handleError);

export default router;

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}
