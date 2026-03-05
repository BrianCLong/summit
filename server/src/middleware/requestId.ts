import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Assigns a stable request ID for downstream logging and trace correlation.
 */
export function requestId() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const existing = req.headers['x-request-id'];
    const value = typeof existing === 'string' && existing.length > 0
      ? existing
      : randomUUID();

    (req as Request & { reqId?: string }).reqId = value;
    res.setHeader('x-request-id', value);
    next();
  };
}

export default requestId;
