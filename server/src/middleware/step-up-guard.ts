import { Request, Response, NextFunction } from 'express';

export const STEP_UP_ERROR_CODE = 'STEP_UP_REQUIRED';

function isTruthy(value: string | undefined): boolean {
  return (value || '').toLowerCase() === 'true';
}

export function isStepUpGuardEnabled(): boolean {
  return isTruthy(process.env.STEP_UP_GUARD_ENABLED);
}

export function hasStepUpAuthentication(req: Request): boolean {
  const authContext = (req as any).authContext || (req as any).auth || {};
  const user = (req as any).user || {};
  const session = (req as any).session || {};

  return Boolean(
    authContext.stepUpVerified ||
      authContext.mfaVerified ||
      authContext.stepUpToken ||
      user.stepUpVerified ||
      user.mfaVerified ||
      user.stepUpToken ||
      session.stepUpVerified ||
      session.mfaVerified ||
      session.stepUpToken ||
      req.headers['x-step-up-auth'] ||
      req.headers['x-step-up-token']
  );
}

export function requireStepUpGuard(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!isStepUpGuardEnabled()) {
    return next();
  }

  if (hasStepUpAuthentication(req)) {
    return next();
  }

  res.status(403).json({
    error: 'Step-up authentication required',
    code: STEP_UP_ERROR_CODE,
  });
}
