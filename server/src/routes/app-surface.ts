/**
 * App Surface API Routes
 *
 * Provides the policy preflight endpoint and tool allowlist query.
 * INVARIANT: No tool execution path exists without policy verdict = ALLOW.
 */

import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { runPolicyPreflight } from '../app-surface/policy-preflight.js';
import { getAllowedTools } from '../app-surface/tool-allowlist.js';
import { EnvironmentSchema } from '../app-surface/types.js';
import { emitAuditEvent } from '../audit/emit.js';
import logger from '../config/logger.js';

const routeLogger = logger.child({ name: 'AppSurfaceRoutes' });
const appSurfaceRouter = Router();

/**
 * POST /preflight
 *
 * Run policy preflight check for a set of tools in a given environment.
 * Returns ALLOW/DENY verdict with per-tool reasons and an evidence bundle ID.
 */
appSurfaceRouter.post('/preflight', async (req, res) => {
  try {
    const userId =
      (req as any).user?.id ||
      req.headers['x-user-id'] ||
      (req as any).user?.email ||
      'system';
    const tenantId = String(
      req.headers['x-tenant-id'] || req.headers['x-tenant'] || 'default-tenant',
    );

    // Inject actor from auth context if not provided
    const body = {
      ...req.body,
      actor: req.body.actor || userId,
    };

    const result = await runPolicyPreflight(body);

    // Emit audit event
    await emitAuditEvent(
      {
        eventId: randomUUID(),
        occurredAt: new Date().toISOString(),
        actor: {
          type: 'user',
          id: String(userId),
          ipAddress: req.ip,
        },
        action: {
          type: 'app_surface.policy_preflight',
          outcome: 'success',
        },
        tenantId,
        target: {
          type: 'policy_preflight',
          id: result.evidenceId,
        },
        metadata: {
          environment: result.environment,
          verdict: result.verdict,
          requestedTools: result.requestedTools,
          deniedTools: result.deniedTools,
          dryRun: result.dryRun,
        },
      },
      {
        correlationId: req.headers['x-request-id'] as string,
        serviceId: 'app-surface',
      },
    ).catch((error) => {
      routeLogger.warn(
        { error: (error as Error).message },
        'Failed to emit policy preflight audit event',
      );
    });

    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'validation_error',
        details: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    routeLogger.error(
      { error: (error as Error).message },
      'Policy preflight failed',
    );
    res.status(500).json({ error: 'internal_error', message: 'Policy preflight check failed' });
  }
});

/**
 * GET /tools/:env
 *
 * List the allowed tools for a given environment.
 */
appSurfaceRouter.get('/tools/:env', async (req, res) => {
  try {
    const env = EnvironmentSchema.parse(req.params.env);
    const tools = await getAllowedTools(env);
    res.json({ environment: env, tools });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Invalid environment. Must be one of: dev, staging, prod',
      });
    }

    routeLogger.error(
      { error: (error as Error).message },
      'Failed to load tools',
    );
    res.status(500).json({ error: 'internal_error' });
  }
});

export default appSurfaceRouter;
