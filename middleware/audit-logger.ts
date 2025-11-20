/**
 * Audit logger middleware for security event tracking
 * Logs HTTP requests, authentication attempts, authorization failures, and more
 */
import { Request, Response, NextFunction } from 'express';
import {
  logAuditEvent,
  logAuthSuccess,
  logAuthFailure,
  logAuthzDenied,
  AuditEventType,
  getCorrelationId,
} from '@intelgraph/logger';

export interface AuditLoggerOptions {
  /**
   * Whether to log all HTTP requests
   * Default: true
   */
  logAllRequests?: boolean;

  /**
   * Whether to log request/response bodies
   * Default: false (for security/privacy)
   */
  logBodies?: boolean;

  /**
   * Paths to exclude from audit logging
   * Default: ['/health', '/metrics', '/ready']
   */
  excludePaths?: string[];

  /**
   * HTTP methods to exclude from audit logging
   * Default: ['OPTIONS', 'HEAD']
   */
  excludeMethods?: string[];

  /**
   * Whether to log only failed requests (4xx, 5xx)
   * Default: false
   */
  logOnlyFailures?: boolean;
}

/**
 * Express middleware for audit logging
 *
 * Features:
 * - Logs HTTP requests with timing information
 * - Captures user, tenant, and correlation information
 * - Tracks authentication and authorization events
 * - Records IP addresses and user agents
 * - Supports path and method exclusions
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { auditLoggerMiddleware } from './middleware/audit-logger';
 *
 * const app = express();
 * app.use(auditLoggerMiddleware({
 *   excludePaths: ['/health', '/metrics'],
 *   logOnlyFailures: false,
 * }));
 * ```
 */
export function auditLoggerMiddleware(
  options: AuditLoggerOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const {
    logAllRequests = true,
    logBodies = false,
    excludePaths = ['/health', '/metrics', '/ready', '/livez', '/readyz'],
    excludeMethods = ['OPTIONS', 'HEAD'],
    logOnlyFailures = false,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Check if this request should be excluded
    const shouldExclude =
      excludePaths.some(path => req.path === path) ||
      excludeMethods.includes(req.method);

    if (shouldExclude) {
      next();
      return;
    }

    const startTime = Date.now();

    // Capture response when finished
    const originalSend = res.send;
    let responseBody: any;

    if (logBodies) {
      res.send = function (data: any): Response {
        responseBody = data;
        return originalSend.call(this, data);
      };
    }

    // Log on response finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      const isFailure = statusCode >= 400;

      // Skip if only logging failures and this is not a failure
      if (logOnlyFailures && !isFailure) {
        return;
      }

      // Skip if not logging all requests and this is a success
      if (!logAllRequests && !isFailure) {
        return;
      }

      // Extract context information
      const userId = (req as any).user?.id || (req as any).userId;
      const tenantId = (req as any).tenant?.id || (req as any).tenantId;
      const correlationId = getCorrelationId() || (req as any).correlationId;

      // Determine audit event type based on status code
      let action = `http.${req.method.toLowerCase()}`;
      let result: 'success' | 'failure' = 'success';

      if (statusCode === 401) {
        action = AuditEventType.AUTH_LOGIN_FAILURE;
        result = 'failure';
      } else if (statusCode === 403) {
        action = AuditEventType.AUTHZ_ACCESS_DENIED;
        result = 'failure';
      } else if (statusCode >= 400) {
        result = 'failure';
      }

      // Build audit details
      const details: Record<string, unknown> = {
        method: req.method,
        path: req.path,
        url: req.originalUrl,
        statusCode,
        duration,
        correlationId,
      };

      // Add query parameters if present
      if (Object.keys(req.query).length > 0) {
        details.query = req.query;
      }

      // Add request body if logging is enabled
      if (logBodies && req.body && Object.keys(req.body).length > 0) {
        details.requestBody = req.body;
      }

      // Add response body if logging is enabled
      if (logBodies && responseBody) {
        details.responseBody = responseBody;
      }

      // Add error information for failures
      if (isFailure) {
        details.error = res.statusMessage || 'Unknown error';
      }

      // Log the audit event
      logAuditEvent({
        userId,
        tenantId,
        action,
        resourceType: 'http',
        resourceId: req.path,
        details,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
        result,
      });
    });

    next();
  };
}

/**
 * Default audit logger middleware instance
 */
export const auditLogger = auditLoggerMiddleware();

/**
 * Helper to manually log authentication success
 * Use this in authentication routes/handlers
 */
export function logAuthenticationSuccess(
  req: Request,
  userId: string
): void {
  logAuthSuccess(userId, {
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    details: {
      path: req.path,
      method: req.method,
    },
  });
}

/**
 * Helper to manually log authentication failure
 * Use this in authentication routes/handlers
 */
export function logAuthenticationFailure(
  req: Request,
  reason: string,
  attemptedUsername?: string
): void {
  logAuthFailure(reason, {
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    details: {
      path: req.path,
      method: req.method,
      attemptedUsername,
    },
  });
}

/**
 * Helper to manually log authorization denial
 * Use this in authorization/permission checks
 */
export function logAuthorizationDenied(
  req: Request,
  resourceType: string,
  resourceId: string,
  reason: string
): void {
  const userId = (req as any).user?.id || (req as any).userId;
  const tenantId = (req as any).tenant?.id || (req as any).tenantId;

  logAuthzDenied(resourceType, resourceId, reason, {
    userId,
    tenantId,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    details: {
      path: req.path,
      method: req.method,
    },
  });
}
