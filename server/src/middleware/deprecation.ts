import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

export interface DeprecationConfig {
  /** Date when the endpoint will be removed (ISO 8601) */
  sunsetDate: string;
  /** Link to successor endpoint or migration guide */
  successorUrl?: string;
  /** Custom deprecation message */
  message?: string;
  /** Whether to log each request (default: true) */
  logRequests?: boolean;
}

/**
 * Marks an endpoint as deprecated and adds appropriate headers
 */
export function deprecated(config: DeprecationConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const sunsetDate = new Date(config.sunsetDate);
    const now = new Date();
    const daysUntilSunset = Math.ceil((sunsetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Add deprecation headers
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', sunsetDate.toUTCString());

    if (config.successorUrl) {
      res.setHeader('Link', `<${config.successorUrl}>; rel="successor-version"`);
    }

    // Construct warning message
    let warningMessage = config.message || `This endpoint is deprecated and will be removed on ${sunsetDate.toISOString().split('T')[0]}.`;

    if (config.successorUrl) {
      warningMessage += ` Migrate to ${config.successorUrl}`;
    }

    // Escalate warning urgency as sunset approaches
    if (daysUntilSunset <= 7) {
      warningMessage = `⚠️ URGENT (${daysUntilSunset} days left): ${warningMessage}`;
    } else if (daysUntilSunset <= 30) {
      warningMessage = `⚠️ WARNING (${daysUntilSunset} days left): ${warningMessage}`;
    }

    res.setHeader('Warning', `299 - "${warningMessage}"`);

    // Log deprecation usage
    if (config.logRequests !== false) {
      const logLevel = daysUntilSunset <= 7 ? 'error' : daysUntilSunset <= 30 ? 'warn' : 'info';

      logger[logLevel]({
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        daysUntilSunset,
        sunsetDate: config.sunsetDate,
        userId: (req as any).user?.id
      }, `Deprecated endpoint accessed: ${req.method} ${req.path}`);
    }

    next();
  };
}

/**
 * Returns 410 Gone for sunset endpoints
 */
export function sunset(config: { successorUrl?: string; message?: string }) {
  return (req: Request, res: Response) => {
    logger.error({
      path: req.path,
      method: req.method,
      ip: req.ip,
      userId: (req as any).user?.id
    }, 'Sunset endpoint accessed');

    return res.status(410).json({
      error: 'Gone',
      message: config.message || 'This endpoint has been removed.',
      successorUrl: config.successorUrl,
      documentation: 'https://docs.internal/api/deprecations'
    });
  };
}
