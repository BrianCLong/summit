/**
 * Explainability Explorer API Routes
 *
 * Read-only endpoints for querying explainability artifacts.
 * Implements: docs/explainability/EXPLAINABILITY_CONTRACT.md
 *
 * Security:
 * - All endpoints are read-only (no mutations)
 * - Enforces RBAC and tenant isolation
 * - Admin-only for cross-tenant views
 */

import { Router, Request, Response } from 'express';
import { ExplainabilityExplorerService } from '../explainability/ExplainabilityExplorerService.js';
import { ListRunsFilter } from '../explainability/types.js';

const router = Router();
const service = ExplainabilityExplorerService.getInstance();

const ensureString = (param: any): string | undefined => {
  if (Array.isArray(param)) {
    return param[0] as string;
  }
  return param as string | undefined;
};

/**
 * GET /api/explainability/runs
 *
 * List runs with filtering and pagination.
 */
router.get('/runs', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant?.id || (req as any).user?.tenantId;
    const requesterId = (req as any).user?.id || 'anonymous';

    if (!tenantId) {
      return res.status(403).json({
        success: false,
        data: null,
        errors: [
          {
            code: 'TENANT_REQUIRED',
            message: 'Tenant context required for this operation',
          },
        ],
      });
    }

    const filter: ListRunsFilter = {
      run_type: ensureString(req.query.run_type) as any,
      actor_id: ensureString(req.query.actor_id),
      started_after: ensureString(req.query.started_after),
      started_before: ensureString(req.query.started_before),
      capability: ensureString(req.query.capability),
      min_confidence: req.query.min_confidence ? parseFloat(ensureString(req.query.min_confidence)!) : undefined,
      limit: req.query.limit ? parseInt(ensureString(req.query.limit)!, 10) : 50,
      offset: req.query.offset ? parseInt(ensureString(req.query.offset)!, 10) : 0,
    };

    const result = await service.listRuns(tenantId, filter, requesterId);

    return res.status(result.success ? 200 : 500).json(result);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      data: null,
      errors: [
        {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      ],
    });
  }
});

/**
 * GET /api/explainability/runs/:runId
 */
router.get('/runs/:runId', async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;
    const tenantId = (req as any).tenant?.id || (req as any).user?.tenantId;
    const requesterId = (req as any).user?.id || 'anonymous';

    if (!tenantId) {
      return res.status(403).json({
        success: false,
        data: null,
        errors: [
          {
            code: 'TENANT_REQUIRED',
            message: 'Tenant context required for this operation',
          },
        ],
      });
    }

    const result = await service.getRun(runId, tenantId, requesterId);

    return res.status(result.success ? 200 : 404).json(result);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      data: null,
      errors: [
        {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      ],
    });
  }
});

/**
 * GET /api/explainability/runs/:runId/lineage
 */
router.get('/runs/:runId/lineage', async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;
    const tenantId = (req as any).tenant?.id || (req as any).user?.tenantId;
    const depth = req.query.depth ? parseInt(ensureString(req.query.depth)!, 10) : 3;

    if (!tenantId) {
      return res.status(403).json({
        success: false,
        data: null,
        errors: [
          {
            code: 'TENANT_REQUIRED',
            message: 'Tenant context required for this operation',
          },
        ],
      });
    }

    const result = await service.getLineage(runId, tenantId, depth);

    return res.status(result.success ? 200 : 500).json(result);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      data: null,
      errors: [
        {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      ],
    });
  }
});

/**
 * GET /api/explainability/compare
 */
router.get('/compare', async (req: Request, res: Response) => {
  try {
    const runA = ensureString(req.query.run_a);
    const runB = ensureString(req.query.run_b);
    const tenantId = (req as any).tenant?.id || (req as any).user?.tenantId;

    if (!runA || !runB) {
      return res.status(400).json({
        success: false,
        data: null,
        errors: [
          {
            code: 'INVALID_PARAMS',
            message: 'Both run_a and run_b query parameters are required',
          },
        ],
      });
    }

    if (!tenantId) {
      return res.status(403).json({
        success: false,
        data: null,
        errors: [
          {
            code: 'TENANT_REQUIRED',
            message: 'Tenant context required for this operation',
          },
        ],
      });
    }

    const result = await service.compareRuns(runA, runB, tenantId);

    return res.status(result.success ? 200 : 404).json(result);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      data: null,
      errors: [
        {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      ],
    });
  }
});

/**
 * GET /api/explainability/runs/:runId/verify
 */
router.get('/runs/:runId/verify', async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;
    const tenantId = (req as any).tenant?.id || (req as any).user?.tenantId;

    if (!tenantId) {
      return res.status(403).json({
        success: false,
        data: null,
        errors: [
          {
            code: 'TENANT_REQUIRED',
            message: 'Tenant context required for this operation',
          },
        ],
      });
    }

    const result = await service.verifyLinkage(runId, tenantId);

    return res.status(result.success ? 200 : 500).json(result);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      data: null,
      errors: [
        {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      ],
    });
  }
});

/**
 * Health check endpoint.
 */
router.get('/health', async (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'explainability-explorer',
    version: '1.0.0',
    readonly: true,
  });
});

export default router;
