import { Request, Response, NextFunction } from 'express';
import { buildContextFromRequest } from '../feature-flags/context.js';
import { FeatureFlagContext } from '../feature-flags/types.js';

declare global {
  namespace Express {
    interface Request {
      featureFlagContext?: FeatureFlagContext;
    }
  }
}

export function featureFlagContextMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  req.featureFlagContext = buildContextFromRequest(req);
  next();
}
