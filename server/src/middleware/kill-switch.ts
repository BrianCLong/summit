import { Request, Response, NextFunction } from 'express';
import { featureFlagClient } from '../feature-flags/opaFeatureFlagClient.js';
import { buildContextFromRequest } from '../feature-flags/context.js';

export function killSwitchGuard(moduleName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const context = buildContextFromRequest(req);
    const { decision } = await featureFlagClient.isKillSwitchActive(
      moduleName,
      context,
    );

    if (decision.active) {
      return res.status(503).json({
        message: `Module ${moduleName} is temporarily disabled via kill switch`,
        reason: decision.reason,
        evaluationId: decision.evaluationId,
      });
    }

    return next();
  };
}
