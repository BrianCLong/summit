import type { Request, Response, NextFunction } from 'express';
import { precheck, PrecheckResult } from '../threat/ingest/precheck';

/**
 * Middleware enforcing file allowlist and running pre-ingest checks.
 * Attaches the precheck result to `req.threatPrecheck`.
 */
export function uploadGuard(req: Request, res: Response, next: NextFunction) {
  const file: any = (req as any).file;
  if (!file) return next();
  const result: PrecheckResult = precheck({
    mimetype: file.mimetype,
    size: file.size,
    buffer: file.buffer
  });
  if (!result.allowed) {
    return res.status(400).json({ error: 'blocked', flags: result.flags });
  }
  (req as any).threatPrecheck = result;
  next();
}
