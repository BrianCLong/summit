import { Request, Response, NextFunction } from 'express';
import { opaDecision } from '../graphql/abac.js';
import { opaRouterAuthzCounter } from '../utils/prometheus.js';

export async function opaRouterAuthz(req: Request, res: Response, next: NextFunction) {
  const input = {
    user: (req as any).user, // Assuming user is attached by authMiddleware
    path: req.path,
    method: req.method,
    body: req.body, // For GraphQL query analysis
  };

  try {
    const decision = await opaDecision(input);

    if (!decision.allow) {
      opaRouterAuthzCounter.inc({ decision: 'deny', reason: decision.reason || 'unspecified' });
      return res.status(403).json({
        error: 'Forbidden',
        reason: decision.reason || 'Authorization denied by OPA',
      });
    }

    opaRouterAuthzCounter.inc({ decision: 'allow' });
    next();
  } catch (error) {
    opaRouterAuthzCounter.inc({ decision: 'error', reason: 'opa_evaluation_error' });
    console.error('OPA Router Authorization Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      reason: 'Failed to evaluate OPA policy',
    });
  }
}
