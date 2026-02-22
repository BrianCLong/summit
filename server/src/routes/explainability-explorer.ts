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

/**
 * GET /api/explainability/runs
 *
 * List runs with filtering and pagination.
 * Query params:
 *   - run_type: filter by type
 *   - actor_id: filter by actor
 *   - started_after: ISO 8601 timestamp
 *   - started_before: ISO 8601 timestamp
 *   - capability: filter by capability used
 *   - min_confidence: minimum confidence threshold
 *   - limit: pagination limit (default 50)
 *   - offset: pagination offset (default 0)
 */
router.get('/runs', async (req: Request, res: Response) => {
  try {
    // Extract tenant from request (assumes middleware sets req.tenant)
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
      run_type: req.query.run_type as any,
      actor_id: req.query.actor_id as string,
      started_after: req.query.started_after as string,
      started_before: req.query.started_before as string,
      capability: req.query.capability as string,
      min_confidence: (req.query.min_confidence as any) ? parseFloat(req.query.min_confidence as string) : undefined,
      limit: (req.query.limit as any) ? parseInt(req.query.limit as string, 10) : 50,
      offset: (req.query.offset as any) ? parseInt(req.query.offset as string, 10) : 0,
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
 *
 * Fetch a single run by ID.
 * Returns full explanation with links to artifacts, SBOM, and provenance.
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
 *
 * Traverse lineage: run → artifacts → SBOM → provenance.
 * Query params:
 *   - depth: how many levels to traverse (default 3)
 */
router.get('/runs/:runId/lineage', async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;
    const tenantId = (req as any).tenant?.id || (req as any).user?.tenantId;
    const depth = (req.query.depth as any) ? parseInt(req.query.depth as string, 10) : 3;

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
 *
 * Compare two runs: inputs/outputs/confidence deltas.
 * Query params:
 *   - run_a: first run ID
 *   - run_b: second run ID
 */
router.get('/compare', async (req: Request, res: Response) => {
  try {
    const runA = req.query.run_a as string;
    const runB = req.query.run_b as string;
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
 *
 * Verify linkage: run → provenance → SBOM hashes.
 * Returns verification report.
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
