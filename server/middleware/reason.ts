import type { Request, Response, NextFunction } from 'express';
export function requireReason(actions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!actions.includes(req.path)) return next();
    const reason = req.header('x-reason') || '';
    if (!reason) return res.status(400).json({ error: 'reason_required' });
    (req as any).reason = reason;
    next();
  };
}
