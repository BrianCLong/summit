import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();
  const { method, url, ip } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;

    const logData = {
      method,
      url,
      statusCode,
      duration,
      ip,
      userAgent: req.get('user-agent'),
      tenantId: (req as Request & { tenantId?: string }).tenantId,
    };

    if (statusCode >= 500) {
      logger.error('Request completed with server error', logData);
    } else if (statusCode >= 400) {
      logger.warn('Request completed with client error', logData);
    } else if (duration > 1000) {
      logger.warn('Slow request', logData);
    } else {
      logger.debug('Request completed', logData);
    }
  });

  next();
}
