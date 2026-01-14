import { Request, Response, NextFunction } from 'express';
import { ZodType as ZodSchema } from 'zod';
import { TenantContext } from '../middleware/tenantContext.js';
import { GovernanceError } from '../governance/errors.js';
import { GovernanceVerdict } from '../governance/types.js';
import { killSwitchGuard } from '../governance/guards.js';
import { logger } from './logger.js';
import { requireTenant } from './tenantUtils.js';

export interface GovernedHandlerContext<TBody = any, TQuery = any, TParams = any> extends TenantContext {
  body: TBody;
  query: TQuery;
  params: TParams;
  req: Request;
  res: Response;
}

export interface GovernedHandlerResult {
  status: number;
  body: any;
  headers?: Record<string, string>;
}

export interface GovernedHandlerOptions<TBody = any, TQuery = any, TParams = any> {
  operationId: string;
  action: string;
  resourceType: string;
  schema?: {
    body?: ZodSchema<TBody>;
    query?: ZodSchema<TQuery>;
    params?: ZodSchema<TParams>;
  };
  handler: (ctx: GovernedHandlerContext<TBody, TQuery, TParams>) => Promise<GovernedHandlerResult>;
}

export function createGovernedHandler<TBody = any, TQuery = any, TParams = any>(
  options: GovernedHandlerOptions<TBody, TQuery, TParams>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    let verdict: GovernanceVerdict | undefined;

    try {
      // 1. Resolve Tenant Context
      const tenantContext = (req as any).tenantContext;
      try {
        requireTenant(tenantContext);
      } catch (err) {
         return res.status(400).json({ error: 'Tenant context required' });
      }

      const ctx: GovernedHandlerContext<TBody, TQuery, TParams> = {
        ...tenantContext,
        body: req.body,
        query: req.query as any,
        params: req.params as any,
        req,
        res,
      };

      // 2. Validate Schema
      if (options.schema) {
        if (options.schema.body) {
          const result = options.schema.body.safeParse(req.body);
          if (!result.success) {
            return res.status(400).json({ error: 'Validation failed', details: result.error.errors });
          }
          ctx.body = result.data;
        }
        if (options.schema.query) {
           const result = options.schema.query.safeParse(req.query);
           if (!result.success) {
             return res.status(400).json({ error: 'Validation failed', details: result.error.errors });
           }
           ctx.query = result.data;
        }
        if (options.schema.params) {
           const result = options.schema.params.safeParse(req.params);
           if (!result.success) {
             return res.status(400).json({ error: 'Validation failed', details: result.error.errors });
           }
           ctx.params = result.data;
        }
      }

      // 3. Check Governance/Kill Switch
      const guard = await killSwitchGuard(ctx, { action: options.action });
      if (guard.action !== 'ALLOW') {
        throw new GovernanceError({
          code: 'GOVERNANCE_DENY',
          message: guard.reasons.join('; '),
          action: guard.action,
          policyId: guard.policyIds[0],
          status: 403,
        });
      }

      // 4. Execute Handler
      const result = await options.handler(ctx);

      // 5. Construct Success Verdict
      verdict = {
        action: 'ALLOW',
        reasons: ['Policy checks passed'],
        policyIds: [],
        metadata: {
          timestamp: new Date().toISOString(),
          evaluator: 'governedHandler',
          latencyMs: Date.now() - start,
          simulation: false,
        },
        provenance: {
          origin: options.operationId,
          confidence: 1.0,
        },
      };

      // 6. Send Response
      if (result.headers) {
        for (const [key, value] of Object.entries(result.headers)) {
          res.setHeader(key, value);
        }
      }

      // Attach verdict to header or envelope (Header for now)
      res.setHeader('x-governance-verdict', JSON.stringify(verdict));

      res.status(result.status).json(result.body);

    } catch (error: any) {
      if (error instanceof GovernanceError) {
        logger.warn({ err: error, operation: options.operationId }, 'Governance blocked request');
        return res.status(error.status).json({
          error: error.code,
          message: error.message,
          policyId: error.policyId,
        });
      }

      logger.error({ err: error, operation: options.operationId }, 'Handler failed');
      next(error);
    }
  };
}
