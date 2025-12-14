import { Request, Response, NextFunction } from 'express';

export function policyGuard(req: Request, res: Response, next: NextFunction) {
  const enforce = process.env.FEATURE_LAC_ENFORCE === 'true';
  if (!enforce) {
    return next();
  }
  if (req.path === '/healthz') {
    return next();
  }
  const allowed = req.query.purpose === 'investigation';
  if (!allowed) {
    return res.status(403).json({ error: 'forbidden', reason: 'policy enforcement enabled' });
  }
  return next();
}
