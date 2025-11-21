import { Request, Response, NextFunction } from 'express';
import pino from 'pino';

const logger = pino({ name: 'api-deprecation' });

export interface DeprecationConfig {
  /** Date when the endpoint will be removed (ISO 8601) */
  sunsetDate: string;
  /** Link to successor endpoint or migration guide */
  successorUrl?: string;
  /** Custom deprecation message */
  message?: string;
  /** Whether to log each request (default: true) */
  logRequests?: boolean;
  /** Migration guide URL */
  migrationGuide?: string;
}

export interface SunsetConfig {
  /** Link to successor endpoint */
  successorUrl?: string;
  /** Custom message for removed endpoint */
  message?: string;
  /** Link to documentation about deprecations */
  documentationUrl?: string;
}

/**
 * Calculate days until a sunset date
 */
function getDaysUntilSunset(sunsetDate: Date): number {
  const now = new Date();
  return Math.ceil((sunsetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Marks an endpoint as deprecated and adds appropriate headers:
 * - Deprecation: true
 * - Sunset: RFC 8594 formatted date
 * - Link: rel="successor-version" pointing to new endpoint
 * - Warning: RFC 7234 deprecation warning
 *
 * @example
 * router.get('/old', deprecated({
 *   sunsetDate: '2025-12-31T23:59:59Z',
 *   successorUrl: '/api/v2/new',
 *   message: 'Use v2 for better performance'
 * }), handler);
 */
export function deprecated(config: DeprecationConfig) {
  const sunsetDate = new Date(config.sunsetDate);

  // Validate sunset date at middleware creation time
  if (isNaN(sunsetDate.getTime())) {
    throw new Error(`Invalid sunset date: ${config.sunsetDate}`);
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const daysUntilSunset = getDaysUntilSunset(sunsetDate);

    // Add RFC 8594 Deprecation header
    res.setHeader('Deprecation', 'true');

    // Add RFC 8594 Sunset header
    res.setHeader('Sunset', sunsetDate.toUTCString());

    // Add Link header for successor endpoint (RFC 8288)
    if (config.successorUrl) {
      const linkHeader = `<${config.successorUrl}>; rel="successor-version"`;
      const existingLink = res.getHeader('Link');
      if (existingLink) {
        res.setHeader('Link', `${existingLink}, ${linkHeader}`);
      } else {
        res.setHeader('Link', linkHeader);
      }
    }

    // Add migration guide link if provided
    if (config.migrationGuide) {
      const migrationLink = `<${config.migrationGuide}>; rel="help"`;
      const existingLink = res.getHeader('Link');
      if (existingLink) {
        res.setHeader('Link', `${existingLink}, ${migrationLink}`);
      } else {
        res.setHeader('Link', migrationLink);
      }
    }

    // Construct warning message (RFC 7234)
    let warningMessage = config.message ||
      `This endpoint is deprecated and will be removed on ${sunsetDate.toISOString().split('T')[0]}.`;

    if (config.successorUrl) {
      warningMessage += ` Migrate to ${config.successorUrl}`;
    }

    // Escalate warning urgency as sunset approaches
    let urgencyPrefix = '';
    if (daysUntilSunset <= 0) {
      urgencyPrefix = 'EXPIRED: ';
    } else if (daysUntilSunset <= 7) {
      urgencyPrefix = `URGENT (${daysUntilSunset} days left): `;
    } else if (daysUntilSunset <= 30) {
      urgencyPrefix = `WARNING (${daysUntilSunset} days left): `;
    }

    res.setHeader('Warning', `299 - "${urgencyPrefix}${warningMessage}"`);

    // Log deprecation usage with appropriate level based on urgency
    if (config.logRequests !== false) {
      const logData = {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        daysUntilSunset,
        sunsetDate: config.sunsetDate,
        successorUrl: config.successorUrl,
        userId: (req as any).user?.id,
        tenantId: (req as any).tenantId
      };

      if (daysUntilSunset <= 7) {
        logger.error(logData, `CRITICAL: Deprecated endpoint accessed ${req.method} ${req.path} - expires in ${daysUntilSunset} days`);
      } else if (daysUntilSunset <= 30) {
        logger.warn(logData, `Deprecated endpoint accessed: ${req.method} ${req.path}`);
      } else {
        logger.info(logData, `Deprecated endpoint accessed: ${req.method} ${req.path}`);
      }
    }

    next();
  };
}

/**
 * Returns 410 Gone for sunset endpoints that have been removed.
 * Use this to replace deprecated endpoints after their sunset date.
 *
 * @example
 * // After sunset date, replace the handler:
 * router.all('/removed', sunset({
 *   successorUrl: '/api/v2/new',
 *   message: 'This endpoint was removed on 2024-12-31.'
 * }));
 */
export function sunset(config: SunsetConfig = {}) {
  return (req: Request, res: Response): void => {
    const logData = {
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: (req as any).user?.id,
      tenantId: (req as any).tenantId,
      successorUrl: config.successorUrl
    };

    logger.error(logData, `Sunset endpoint accessed: ${req.method} ${req.path}`);

    // Add helpful headers even for 410 responses
    if (config.successorUrl) {
      res.setHeader('Link', `<${config.successorUrl}>; rel="successor-version"`);
    }

    res.status(410).json({
      error: 'Gone',
      code: 'ENDPOINT_REMOVED',
      message: config.message || 'This endpoint has been permanently removed.',
      successorUrl: config.successorUrl || null,
      documentation: config.documentationUrl || 'https://docs.internal/api/deprecations'
    });
  };
}

/**
 * Creates a deprecation monitor that tracks usage metrics.
 * Can be used to generate reports on deprecated endpoint usage.
 */
export interface DeprecationMetrics {
  endpoint: string;
  method: string;
  requestCount: number;
  uniqueUsers: Set<string>;
  lastAccess: Date;
  daysUntilSunset: number;
}

const deprecationMetrics = new Map<string, DeprecationMetrics>();

/**
 * Get current deprecation metrics (useful for monitoring/alerting)
 */
export function getDeprecationMetrics(): DeprecationMetrics[] {
  return Array.from(deprecationMetrics.values()).map(m => ({
    ...m,
    uniqueUsers: new Set(m.uniqueUsers) // Clone to prevent mutation
  }));
}

/**
 * Clear deprecation metrics (useful for testing)
 */
export function clearDeprecationMetrics(): void {
  deprecationMetrics.clear();
}

/**
 * Enhanced deprecated middleware that also tracks metrics
 */
export function deprecatedWithMetrics(config: DeprecationConfig) {
  const sunsetDate = new Date(config.sunsetDate);

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${req.method}:${req.path}`;

    // Update metrics
    if (!deprecationMetrics.has(key)) {
      deprecationMetrics.set(key, {
        endpoint: req.path,
        method: req.method,
        requestCount: 0,
        uniqueUsers: new Set(),
        lastAccess: new Date(),
        daysUntilSunset: getDaysUntilSunset(sunsetDate)
      });
    }

    const metrics = deprecationMetrics.get(key)!;
    metrics.requestCount++;
    metrics.lastAccess = new Date();
    metrics.daysUntilSunset = getDaysUntilSunset(sunsetDate);

    const userId = (req as any).user?.id;
    if (userId) {
      metrics.uniqueUsers.add(userId);
    }

    // Call the standard deprecated middleware
    deprecated(config)(req, res, next);
  };
}
