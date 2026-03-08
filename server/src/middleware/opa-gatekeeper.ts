import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from 'apollo-server-express';
import { OPAClient } from './opa-abac';
import { logger } from '../utils/logger';
import type { User } from '../graphql/intelgraph/types';

export function opaGatekeeperMiddleware(opaClient: OPAClient, simulate = false) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
      const user = (req as any).user as User;

      if (!user) {
        // In a real application, we would deny the request.
        // For now, we'll just log a warning.
        logger.warn('No user in request for OPA gatekeeper');
        return next();
      }

      const policyInput = {
        user,
        resource: {
          type: 'api',
          path: req.path,
          tenant: user.tenant,
        },
        operation_type: req.method.toLowerCase(),
      };

      const allowed = await opaClient.evaluate(
        'intelgraph.abac.gatekeeper',
        policyInput
      );

      if (simulate) {
        logger.info('OPA gatekeeper simulation:', {
          input: policyInput,
          decision: allowed,
        });
        return next();
      }

      if (!allowed) {
        throw new ForbiddenError('Access denied by OPA gatekeeper');
      }
    }

    next();
  };
}
