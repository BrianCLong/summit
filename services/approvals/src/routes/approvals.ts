import { Router, Request, Response, NextFunction, type Router as ExpressRouter } from 'express';
import { approvalService } from '../services/approval-service.js';
import {
  CreateApprovalRequestSchema,
  ApprovalDecisionSchema,
  CancelRequestSchema,
  ListRequestsQuerySchema,
  AppError,
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

function parseFieldsQuery(fieldsParam: unknown): string[] | undefined {
  if (!fieldsParam || typeof fieldsParam !== 'string') {
    return undefined;
  }
  return fieldsParam
    .split(',')
    .map((field) => field.trim())
    .filter(Boolean);
}

function discloseReceiptFields<T extends Record<string, unknown>>(
  receipt: T,
  fields?: string[],
): Partial<T> {
  if (!fields || fields.length === 0) {
    return receipt;
  }
  const output: Partial<T> = {};
  for (const field of fields) {
    if (field in receipt) {
      output[field as keyof T] = receipt[field as keyof T];
    }
  }
  return output;
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

/**
 * POST /api/v1/requests/:requestId/simulate - re-run policy simulation
 */
router.post('/requests/:requestId/simulate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { requestId } = req.params;
    const simulation = await approvalService.simulateRequest(req.tenantId!, requestId);
    res.json(simulation);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/requests/:requestId/receipts - list receipts for a request
 */
router.get('/requests/:requestId/receipts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { requestId } = req.params;
    const fields = parseFieldsQuery(req.query.fields);
    const receipts = await approvalService.listReceiptsForRequest(req.tenantId!, requestId);
    const disclosed = receipts.map((receipt) =>
      discloseReceiptFields(receipt as unknown as Record<string, unknown>, fields),
    );
    res.json({ items: disclosed, total: disclosed.length });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/receipts/:receiptId - get a specific receipt
 */
router.get('/receipts/:receiptId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { receiptId } = req.params;
    const fields = parseFieldsQuery(req.query.fields);
    const receipt = await approvalService.getReceiptById(req.tenantId!, receiptId);
    if (!receipt) {
      res.status(404).json({
        code: 'NOT_FOUND',
        message: `Receipt '${receiptId}' not found`,
      });
      return;
    }
    res.json(discloseReceiptFields(receipt as unknown as Record<string, unknown>, fields));
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
