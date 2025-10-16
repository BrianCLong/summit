import type { Request, Response, NextFunction } from 'express';

export function requireReason(labels: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (labels.includes('sensitivity:restricted') && !req.headers['x-rfa']) {
      return res.status(403).json({ error: 'reason-for-access required' });
    }
    next();
  };
}
