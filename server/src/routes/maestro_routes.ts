import { randomUUID } from 'crypto';
import { Router, type Request, type Response, type NextFunction } from 'express';
import { Maestro } from '../maestro/core.js';
import { MaestroQueries } from '../maestro/queries.js';
import { opaClient } from '../services/opa-client.js';
import { getCorrelationContext } from '../middleware/correlation-id.js';
import { logger } from '../utils/logger.js';
import { policyActionGate } from '../middleware/policy-action-gate.js';
import {
  normalizeReasoningBudget,
  summarizeBudgetForPolicy,
} from '../maestro/budget.js';

type OpaEvaluator = {
  evaluateQuery: (policyPath: string, input: any) => Promise<any>;
};

const DEFAULT_POLICY_PATH = 'maestro/authz/allow';
const DEFAULT_RESOURCE_TYPE = 'maestro/run';

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

type MaestroOPAEnforcerOptions = {
  action?: string | ((req: Request) => string);
  resourceType?: string | ((req: Request) => string);
  resolveResourceId?: (req: Request) => string | undefined;
  buildResourceAttributes?: (req: Request) => Record<string, unknown>;
};

export function createMaestroOPAEnforcer(
  opa: OpaEvaluator = opaClient,
  policyPath: string = DEFAULT_POLICY_PATH,
  options: MaestroOPAEnforcerOptions = {},
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const correlation = getCorrelationContext(req);
    const traceId =
      correlation.traceId ||
      (req as any).traceId ||
      correlation.correlationId ||
      (req.headers['x-trace-id'] as string) ||
      randomUUID();

    const principal = {
      id: (req as any).user?.id || req.body?.userId || 'anonymous',
      role: (req as any).user?.role,
      tenantId:
        (req as any).user?.tenantId ||
        (req as any).user?.tenant_id ||
        (req.headers['x-tenant-id'] as string) ||
        'unknown',
    };

    const resourceType =
      typeof options.resourceType === 'function'
        ? options.resourceType(req)
        : options.resourceType || DEFAULT_RESOURCE_TYPE;

    const resourceId =
      options.resolveResourceId?.(req) ||
      req.params.runId ||
      req.params.taskId ||
      req.body?.pipeline_id;

    const resourceAttributes = {
      method: req.method.toLowerCase(),
      path: req.path,
      runId: req.params.runId,
      pipelineId: req.body?.pipeline_id,
      taskId: req.params.taskId,
      ...(options.buildResourceAttributes ? options.buildResourceAttributes(req) : {}),
    };

    const opaInput = {
      action:
        typeof options.action === 'function'
          ? options.action(req)
          : options.action || 'maestro.run.create',
      principal,
      resource: {
        type: resourceType,
        id: resourceId,
        attributes: resourceAttributes,
      },
      traceId,
      correlationId: correlation.correlationId,
    };

    try {
      const rawDecision = await opa.evaluateQuery(policyPath, opaInput);
      const decision = normalizeDecision(rawDecision);

      const decisionLog = {
        event: 'maestro_opa_decision',
        traceId,
        correlationId: correlation.correlationId,
        principalId: principal.id,
        principalRole: principal.role,
        tenantId: principal.tenantId,
        resourceType,
        resourceId: opaInput.resource.id,
        action: opaInput.action,
        decision: decision.allow ? 'allow' : 'deny',
        allow: decision.allow,
        reason: decision.reason,
        resourceAttributes,
      };

      const logMessage = 'Maestro OPA decision evaluated';
      if (!decision.allow) {
        logger.warn(decisionLog, logMessage);
        return res.status(403).json({
          error: 'Forbidden',
          reason: decision.reason || 'Access denied by policy',
        });
      }

      logger.info(decisionLog, logMessage);

      (req as any).opaDecision = decision;
      return next();
    } catch (error: any) {
      logger.error(
        {
          event: 'maestro_opa_error',
          traceId,
          correlationId: correlation.correlationId,
          principalId: principal.id,
          tenantId: principal.tenantId,
          resourceType,
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
  const enforceStartRunPolicy = policyActionGate({
    action: 'start_run',
    resource: 'maestro_run',
    resolveResourceId: (req) => req.body?.pipeline_id,
    buildResourceAttributes: (req) => ({
      pipelineId: req.body?.pipeline_id,
      requestText: req.body?.requestText,
      reasoningBudget: summarizeBudgetForPolicy(
        normalizeReasoningBudget(req.body?.reasoningBudget),
      ),
    }),
  });
  const enforceRunReadPolicy = createMaestroOPAEnforcer(opa, DEFAULT_POLICY_PATH, {
    action: 'maestro.run.read',
    resourceType: 'maestro/run',
    resolveResourceId: (req) => req.params.runId,
  });
  const enforceTaskReadPolicy = createMaestroOPAEnforcer(opa, DEFAULT_POLICY_PATH, {
    action: 'maestro.task.read',
    resourceType: 'maestro/task',
    resolveResourceId: (req) => req.params.taskId || req.params.runId,
    buildResourceAttributes: (req) => ({
      taskId: req.params.taskId,
      runId: req.params.runId,
    }),
  });

  // POST /api/maestro/runs – fire-and-return (current v0.1)
  router.post('/runs', enforceStartRunPolicy, async (req, res, next) => {
    try {
      const { userId, requestText } = req.body ?? {};
      if (!userId || !requestText) {
        return res.status(400).json({
          error: 'Missing userId or requestText',
        });
      }

      const reasoningBudget = normalizeReasoningBudget(
        req.body?.reasoningBudget,
      );
      const tenantId =
        (req as any).user?.tenantId ||
        (req as any).user?.tenant_id ||
        req.body?.tenantId;
      const result = await maestro.runPipeline(userId, requestText, {
        tenantId,
        reasoningBudget,
      });
      return res.json(result);
    } catch (e: any) {
      next(e);
    }
  });

  // GET /api/maestro/runs/:runId – reconstruct current state (for polling)
  router.get('/runs/:runId', enforceRunReadPolicy, async (req, res, next) => {
    try {
      const { runId } = req.params;
      const response = await queries.getRunResponse(runId);
      if (!response) {
        return res.status(404).json({ error: 'Run not found' });
      }
      return res.json(response);
    } catch (e: any) {
      next(e);
    }
  });

  // GET /api/maestro/runs/:runId/tasks – list tasks only
  router.get('/runs/:runId/tasks', enforceRunReadPolicy, async (req, res, next) => {
    try {
      const { runId } = req.params;
      const run = await queries.getRunResponse(runId);
      if (!run) return res.status(404).json({ error: 'Run not found' });
      return res.json(run.tasks);
    } catch (e: any) {
      next(e);
    }
  });

  // GET /api/maestro/tasks/:taskId – detailed task + artifacts
  router.get('/tasks/:taskId', enforceTaskReadPolicy, async (req, res, next) => {
    try {
      const { taskId } = req.params;
      const result = await queries.getTaskWithArtifacts(taskId);
      if (!result) return res.status(404).json({ error: 'Task not found' });
      return res.json(result);
    } catch (e: any) {
      next(e);
    }
  });

  return router;
}
