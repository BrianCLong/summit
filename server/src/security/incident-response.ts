import type { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';
import { telemetry } from '../lib/telemetry/comprehensive-telemetry.js';

const SECURITY_RELEVANT_CODES = new Set([401, 403, 429, 499, 500, 503]);

interface AuthenticatedRequest extends Request {
  user?: {
    sub?: string;
    id?: string;
  };
  sessionId?: string;
}

export function securityIncidentLogger(req: Request, res: Response, next: NextFunction): void {
  const startedAt = Date.now();

  res.on('finish', () => {
    const status = res.statusCode;
    const flagged = SECURITY_RELEVANT_CODES.has(status) || res.getHeader('x-security-incident');
    if (!flagged) return;

    const durationMs = Date.now() - startedAt;
    const authReq = req as AuthenticatedRequest;
    const incident = {
      path: req.originalUrl,
      method: req.method,
      status,
      ip: req.ip,
      user: authReq.user?.sub || authReq.user?.id,
      sessionId: authReq.sessionId,
      durationMs,
    };

    logger.warn({ incident }, 'Security incident detected');
    telemetry.subsystems?.security?.incidents?.add?.(1);
    telemetry.subsystems?.security?.lastIncidentMs?.record?.(durationMs);
  });

  next();
}
