import { Request, Response, NextFunction } from 'express';
import { writeAudit } from '../utils/audit.js';

export function auditLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = Date.now();
  res.on('finish', () => {
    const userId = (req as any).user?.id;
    writeAudit({
      userId,
      action: `${req.method} ${req.originalUrl}`,
      resourceType: 'http',
      details: { status: res.statusCode, durationMs: Date.now() - start },
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });
  next();
}
