import type { Request, Response, NextFunction } from 'express';
export function requireStepUp(level = 2) {
  return (req: Request, res: Response, next: NextFunction) => {
    const mfa = Number(req.headers['x-mfa-level'] || 0);
    if (mfa >= level) return next();
    res.status(401).json({ error: 'step_up_required', level });
  };
}
