import type { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';
import { telemetry } from '../lib/telemetry/comprehensive-telemetry.js';

const SECURITY_RELEVANT_CODES = new Set([401, 403, 429, 499, 500, 503]);

export function securityIncidentLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now();

  res.on('finish', () => {
    const status = res.statusCode;
    const flagged = SECURITY_RELEVANT_CODES.has(status) || res.getHeader('x-security-incident');
    if (!flagged) return;

    const durationMs = Date.now() - startedAt;
    const incident = {
      path: req.originalUrl,
      method: req.method,
      status,
      ip: req.ip,
      user: (req as any).user?.sub || (req as any).user?.id,
      sessionId: (req as any).sessionId,
      durationMs,
    };

    logger.warn({ incident }, 'Security incident detected');
    telemetry.subsystems?.security?.incidents?.add?.(1);
    telemetry.subsystems?.security?.lastIncidentMs?.record?.(durationMs);
  });

  next();
}
