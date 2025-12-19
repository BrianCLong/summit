import { Router, type Request, type Response, type NextFunction } from 'express';
import { Maestro } from '../maestro/core.js';
import { MaestroQueries } from '../maestro/queries.js';
import { opaClient } from '../services/opa-client';
import { getCorrelationContext } from '../middleware/correlation-id';
import { logger } from '../utils/logger';

type OpaEvaluator = {
  evaluateQuery: (policyPath: string, input: any) => Promise<any>;
};

const DEFAULT_POLICY_PATH = 'maestro/authz/allow';

function normalizeDecision(result: any): { allow: boolean; reason?: string } {
  if (typeof result === 'boolean') {
    return { allow: result };
  }

  if (result && typeof result === 'object') {
    if (typeof result.allow === 'boolean') {
      return { allow: result.allow, reason: result.reason || result.message };
    }

    if (typeof result.result === 'boolean') {
      return { allow: result.result, reason: result.reason || result.message };
    }
  }

  return { allow: false, reason: 'invalid_decision' };
}

export function createMaestroOPAEnforcer(
  opa: OpaEvaluator = opaClient,
  policyPath: string = DEFAULT_POLICY_PATH,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const correlation = getCorrelationContext(req);
    const traceId =
      correlation.traceId ||
      (req as any).traceId ||
      correlation.correlationId ||
      (req.headers['x-trace-id'] as string) ||
      '';

    const principal = {
      id: (req as any).user?.id || req.body?.userId || 'anonymous',
      role: (req as any).user?.role,
      tenantId:
        (req as any).user?.tenantId ||
        (req as any).user?.tenant_id ||
        (req.headers['x-tenant-id'] as string) ||
        'unknown',
    };

    const resourceAttributes = {
      method: req.method.toLowerCase(),
      path: req.path,
      runId: req.params.runId,
      pipelineId: req.body?.pipeline_id,
    };

    const opaInput = {
      action: 'maestro.run.create',
      principal,
      resource: {
        type: 'maestro/run',
        id: req.params.runId || req.body?.pipeline_id,
        attributes: resourceAttributes,
      },
      traceId,
      correlationId: correlation.correlationId,
    };

    try {
      const rawDecision = await opa.evaluateQuery(policyPath, opaInput);
      const decision = normalizeDecision(rawDecision);

      logger.info(
        {
          event: 'maestro_opa_decision',
          traceId,
          correlationId: correlation.correlationId,
          principalId: principal.id,
          principalRole: principal.role,
          tenantId: principal.tenantId,
          resourceType: 'maestro/run',
          resourceId: opaInput.resource.id,
          action: opaInput.action,
          allow: decision.allow,
          reason: decision.reason,
          resourceAttributes,
        },
        'Maestro OPA decision evaluated',
      );

      if (!decision.allow) {
        return res.status(403).json({
          error: 'Forbidden',
          reason: decision.reason || 'Access denied by policy',
        });
      }

      (req as any).opaDecision = decision;
      return next();
    } catch (error) {
      logger.error(
        {
          event: 'maestro_opa_error',
          traceId,
          correlationId: correlation.correlationId,
          principalId: principal.id,
          tenantId: principal.tenantId,
          resourceType: 'maestro/run',
          error:
            error instanceof Error ? error.message : 'Unknown OPA evaluation error',
        },
        'Failed to evaluate Maestro OPA policy',
      );

      return res
        .status(500)
        .json({ error: 'Policy evaluation failed', code: 'opa_error' });
    }
  };
}

export function buildMaestroRouter(
  maestro: Maestro,
  queries: MaestroQueries,
  opa: OpaEvaluator = opaClient,
): Router {
  const router = Router();
  const enforceRunPolicy = createMaestroOPAEnforcer(opa);

  // POST /api/maestro/runs – fire-and-return (current v0.1)
  router.post('/runs', enforceRunPolicy, async (req, res, next) => {
    try {
      const { userId, requestText } = req.body ?? {};
      if (!userId || !requestText) {
        return res.status(400).json({
          error: 'Missing userId or requestText',
        });
      }

      const result = await maestro.runPipeline(userId, requestText);
      return res.json(result);
    } catch (e) {
      next(e);
    }
  });

  // GET /api/maestro/runs/:runId – reconstruct current state (for polling)
  router.get('/runs/:runId', async (req, res, next) => {
    try {
      const { runId } = req.params;
      const response = await queries.getRunResponse(runId);
      if (!response) {
        return res.status(404).json({ error: 'Run not found' });
      }
      return res.json(response);
    } catch (e) {
      next(e);
    }
  });

  // GET /api/maestro/runs/:runId/tasks – list tasks only
  router.get('/runs/:runId/tasks', async (req, res, next) => {
    try {
      const { runId } = req.params;
      const run = await queries.getRunResponse(runId);
      if (!run) return res.status(404).json({ error: 'Run not found' });
      return res.json(run.tasks);
    } catch (e) {
      next(e);
    }
  });

  // GET /api/maestro/tasks/:taskId – detailed task + artifacts
  router.get('/tasks/:taskId', async (req, res, next) => {
    try {
      const { taskId } = req.params;
      const result = await queries.getTaskWithArtifacts(taskId);
      if (!result) return res.status(404).json({ error: 'Task not found' });
      return res.json(result);
    } catch (e) {
      next(e);
    }
  });

  return router;
}
