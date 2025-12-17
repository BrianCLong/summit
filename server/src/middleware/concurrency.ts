import { Request, Response, NextFunction } from 'express';

const limits = new Map<string, { in: number; max: number }>();

export function limit(path: string, max = 100) {
  limits.set(path, { in: 0, max });
  return (req: Request, res: Response, next: NextFunction) => {
    const s = limits.get(path)!;
    if (s.in >= s.max) {
      res.setHeader('Retry-After', '2');
      res.status(429).json({ error: 'over_capacity' });
      return;
    }
    s.in++;
    res.on('finish', () => s.in--);
    next();
  };
}
