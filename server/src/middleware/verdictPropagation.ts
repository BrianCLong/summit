import { Request, Response, NextFunction } from 'express';
import { GovernanceVerdict } from '../governance/types.js';

/**
 * Verdict Propagation Middleware
 *
 * Intercepts the response to inject Governance Verdict headers.
 * This ensures that any downstream client or service is aware of the
 * governance decision that accompanied the response.
 */
export const verdictPropagationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  const originalSend = res.send;

  // Helper to apply headers
  const applyGovernanceHeaders = () => {
    if (res.locals.governanceVerdict) {
      const verdict = res.locals.governanceVerdict as GovernanceVerdict;

      // Avoid overwriting if already set (though usually this is the authority)
      if (!res.getHeader('X-Governance-Action')) {
        res.setHeader('X-Governance-Action', verdict.action);
      }

      if (verdict.policyIds && verdict.policyIds.length > 0) {
        res.setHeader('X-Governance-Policy-Ids', verdict.policyIds.join(','));
      }

      if (verdict.metadata?.evaluator) {
        res.setHeader('X-Governance-Evaluator', verdict.metadata.evaluator);
      }

      // If we have a trace ID or similar in metadata, we can map it
      // Using runId as Trace ID if available in metadata context, otherwise just timestamp
      // Ideally we use a standard trace ID from the verdict if it exists.
    }
  };

  res.json = function (body: any): Response {
    if (!res.headersSent) {
      applyGovernanceHeaders();
    }
    return originalJson.call(this, body);
  };

  res.send = function (body: any): Response {
    if (!res.headersSent) {
      applyGovernanceHeaders();
    }
    return originalSend.call(this, body);
  };

  next();
};
