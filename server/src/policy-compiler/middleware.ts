
import { Request, Response, NextFunction } from 'express';
import { EnforcementService } from './EnforcementService.js';
import { RuntimeContext } from './types.js';

/**
 * Express Middleware for policy enforcement on routes.
 *
 * @param actionType 'query' | 'export' | 'runbook'
 * @param targetExtractor Function to extract the target resource from the request
 */
export const enforcePolicy = (
  actionType: 'query' | 'export' | 'runbook',
  targetExtractor: (req: Request) => string
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const enforcement = EnforcementService.getInstance();

    // Construct RuntimeContext from Request
    // This assumes req.user is populated by auth middleware
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Authentication required for policy enforcement' });
      return;
    }

    const target = targetExtractor(req);
    const context: RuntimeContext = {
      user: {
        id: user.id,
        roles: user.roles || [],
        clearanceLevel: user.clearanceLevel || 0
      },
      action: {
        type: actionType,
        target: target
      },
      activeAuthority: (req as any).activeAuthority || [] // Assuming authority attached to req
    };

    let result;
    switch (actionType) {
      case 'query': result = enforcement.evaluateQuery(context); break;
      case 'export': result = enforcement.evaluateExport(context); break;
      case 'runbook': result = enforcement.evaluateRunbookStep(context); break;
    }

    if (!result.allowed) {
      res.status(403).json({
        error: 'Policy Enforcement Denied',
        decisionId: result.decisionId,
        reason: result.reason
      });
      return;
    }

    // Attach decision ID to request for audit logging downstream
    (req as any).enforcementDecisionId = result.decisionId;
    next();
  };
};

/**
 * Helper to wrap a function (e.g. GraphQL resolver) with enforcement.
 */
export async function withEnforcement<T>(
  context: RuntimeContext,
  action: () => Promise<T>
): Promise<T> {
  const enforcement = EnforcementService.getInstance();
  let result;

  switch (context.action.type) {
    case 'query': result = enforcement.evaluateQuery(context); break;
    case 'export': result = enforcement.evaluateExport(context); break;
    case 'runbook': result = enforcement.evaluateRunbookStep(context); break;
  }

  if (!result.allowed) {
    throw new Error(`Policy Denied: ${result.reason?.humanMessage} (Code: ${result.reason?.code})`);
  }

  return action();
}
