// @ts-nocheck
/**
 * App Surface Routes
 *
 * Provides the Policy Preflight Runner endpoint.
 * Deny-by-default: no tool execution path exists without policy verdict = ALLOW.
 * All user-provided strings are treated as untrusted (strict allowlist matching only).
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { PolicyPreflightRequestSchema } from '../app-surface/schemas.js';
import type { ToolVerdict, PolicyPreflightResponse } from '../app-surface/schemas.js';
import { isToolAllowed, getAllowedTools } from '../app-surface/toolAllowlist.js';
import { buildEvidenceBundle, persistEvidenceBundle } from '../app-surface/evidence.js';

const router = Router();

/**
 * POST /api/app-surface/preflight
 *
 * Run a policy preflight check for a set of tools in a given environment.
 * Returns allow/deny per tool, an overall verdict, and an evidence bundle ID.
 */
router.post('/preflight', async (req: Request, res: Response) => {
  try {
    const parsed = PolicyPreflightRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Invalid preflight request',
        details: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const request = parsed.data;
    const actor = (req as any).user?.id ?? (req as any).user?.sub ?? 'anonymous';

    // Deny-by-default: evaluate each tool against the allowlist
    const toolVerdicts: ToolVerdict[] = request.tools.map((tool) => {
      const allowed = isToolAllowed(request.environment, tool);
      return {
        tool,
        allowed,
        reason: allowed
          ? `Tool "${tool}" is in the ${request.environment} allowlist`
          : `Tool "${tool}" is NOT in the ${request.environment} allowlist (deny-by-default)`,
      };
    });

    // Overall verdict
    const allAllowed = toolVerdicts.every((v) => v.allowed);
    const noneAllowed = toolVerdicts.every((v) => !v.allowed);
    const verdict = allAllowed ? 'ALLOW' : noneAllowed ? 'DENY' : 'PARTIAL';

    // Build and persist evidence bundle
    const bundle = buildEvidenceBundle(request, toolVerdicts, verdict, actor);
    await persistEvidenceBundle(bundle);

    const response: PolicyPreflightResponse = {
      verdict,
      environment: request.environment,
      toolVerdicts,
      evidenceId: bundle.id,
      timestamp: bundle.timestamp,
      dryRun: request.dryRun ?? false,
    };

    return res.status(200).json(response);
  } catch (err: any) {
    return res.status(500).json({
      error: 'InternalError',
      message: 'Policy preflight check failed',
    });
  }
});

/**
 * GET /api/app-surface/allowlist/:env
 *
 * Returns the tool allowlist for a given environment.
 */
router.get('/allowlist/:env', (req: Request, res: Response) => {
  const env = req.params.env;
  if (!['dev', 'staging', 'prod'].includes(env)) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'Invalid environment. Must be one of: dev, staging, prod',
    });
  }

  const tools = getAllowedTools(env as any);
  return res.status(200).json({ environment: env, tools });
});

export default router;
