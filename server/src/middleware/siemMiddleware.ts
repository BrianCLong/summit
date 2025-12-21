/**
 * SIEM Integration Middleware
 *
 * Express middleware that automatically sends security events to SIEM systems
 * based on request patterns, authentication events, and security violations.
 */

import { Request, Response, NextFunction } from 'express';
import { siemService, SIEMEvent } from '../services/SIEMService.js';
import logger from '../utils/logger.js';

interface SIEMRequest extends Request {
  siem?: {
    startTime: number;
    events: SIEMEvent[];
    skipLogging?: boolean;
  };
}

export interface SIEMMiddlewareOptions {
  enabled?: boolean;
  logAllRequests?: boolean;
  logFailedAuth?: boolean;
  logPrivilegedOperations?: boolean;
  logDataAccess?: boolean;
  logSuspiciousActivity?: boolean;
  skipPaths?: string[];
  skipMethods?: string[];
  sensitiveHeaders?: string[];
  maxPayloadSize?: number;
}

const defaultOptions: SIEMMiddlewareOptions = {
  enabled: true,
  logAllRequests: false,
  logFailedAuth: true,
  logPrivilegedOperations: true,
  logDataAccess: true,
  logSuspiciousActivity: true,
  skipPaths: ['/health', '/metrics', '/favicon.ico'],
  skipMethods: ['OPTIONS'],
  sensitiveHeaders: ['authorization', 'cookie', 'x-api-key'],
  maxPayloadSize: 1024 * 10, // 10KB
};

/**
 * Create SIEM middleware with specified options
 */
export function createSIEMMiddleware(
  options: SIEMMiddlewareOptions = {},
): (req: Request, res: Response, next: NextFunction) => void {
  const config = { ...defaultOptions, ...options };

  return (req: SIEMRequest, res: Response, next: NextFunction): void => {
    try {
      // Skip if SIEM is disabled
      if (!config.enabled) {
        return next();
      }

      // Skip paths and methods
      if (config.skipPaths?.some((path) => req.path.startsWith(path))) {
        return next();
      }

      if (config.skipMethods?.includes(req.method)) {
        return next();
      }

      // Initialize SIEM context
      req.siem = {
        startTime: Date.now(),
        events: [],
        skipLogging: false,
      };

      // Log request start if enabled
      if (config.logAllRequests) {
        const event = createRequestEvent(req, 'request_started', 'low');
        req.siem.events.push(event);
      }

      // Check for suspicious patterns
      if (config.logSuspiciousActivity) {
        checkSuspiciousActivity(req);
      }

      // Override res.end to capture response
      const originalEnd = res.end;
      res.end = function (chunk?: any, encoding?: any) {
        try {
          // Process response
          processResponse(req, res, config);
        } catch (error) {
          logger.error('SIEM middleware response processing error', {
            component: 'SIEMMiddleware',
            error: error.message,
            path: req.path,
          });
        }

        return originalEnd.call(this, chunk, encoding);
      };

      next();
    } catch (error) {
      logger.error('SIEM middleware error', {
        component: 'SIEMMiddleware',
        error: error.message,
        path: req.path,
        method: req.method,
      });
      next();
    }
  };
}

/**
 * Create authentication event middleware
 */
export function siemAuthMiddleware(
  options: { logSuccess?: boolean; logFailure?: boolean } = {},
) {
  const config = { logSuccess: true, logFailure: true, ...options };

  return (req: SIEMRequest, res: Response, next: NextFunction): void => {
    const originalJson = res.json;

    res.json = function (body: any) {
      try {
        // Detect authentication events
        if (isAuthenticationEndpoint(req.path)) {
          const isSuccess = res.statusCode >= 200 && res.statusCode < 300;

          if (
            (isSuccess && config.logSuccess) ||
            (!isSuccess && config.logFailure)
          ) {
            const event = createAuthenticationEvent(req, res, isSuccess);

            if (req.siem) {
              req.siem.events.push(event);
            } else {
              // Send immediately if no SIEM context
              siemService.sendEvent(event);
            }
          }
        }
      } catch (error) {
        logger.error('SIEM auth middleware error', {
          component: 'SIEMMiddleware',
          error: error.message,
        });
      }

      return originalJson.call(this, body);
    };

    next();
  };
}

/**
 * Create privileged operation middleware
 */
export function siemPrivilegedMiddleware() {
  return (req: SIEMRequest, res: Response, next: NextFunction): void => {
    // Check if this is a privileged operation
    if (isPrivilegedOperation(req)) {
      const event = createPrivilegedOperationEvent(req);

      if (req.siem) {
        req.siem.events.push(event);
      } else {
        siemService.sendEvent(event);
      }
    }

    next();
  };
}

/**
 * Create data access logging middleware
 */
export function siemDataAccessMiddleware() {
  return (req: SIEMRequest, res: Response, next: NextFunction): void => {
    if (isDataAccessOperation(req)) {
      const event = createDataAccessEvent(req);

      if (req.siem) {
        req.siem.events.push(event);
      } else {
        siemService.sendEvent(event);
      }
    }

    next();
  };
}

/**
 * Process response and send SIEM events
 */
function processResponse(
  req: SIEMRequest,
  res: Response,
  config: SIEMMiddlewareOptions,
): void {
  if (!req.siem || req.siem.skipLogging) return;

  const duration = Date.now() - req.siem.startTime;

  // Add response completion event
  if (config.logAllRequests) {
    const event = createRequestEvent(req, 'request_completed', 'low', {
      statusCode: res.statusCode,
      duration,
    });
    req.siem.events.push(event);
  }

  // Check for error responses
  if (res.statusCode >= 400) {
    const severity = res.statusCode >= 500 ? 'high' : 'medium';
    const event = createRequestEvent(req, 'request_error', severity, {
      statusCode: res.statusCode,
      duration,
    });
    req.siem.events.push(event);
  }

  // Check for slow responses
  const slowThreshold = 5000; // 5 seconds
  if (duration > slowThreshold) {
    const event = createRequestEvent(req, 'slow_request', 'medium', {
      statusCode: res.statusCode,
      duration,
    });
    req.siem.events.push(event);
  }

  // Send all events to SIEM
  if (req.siem.events.length > 0) {
    siemService.sendEvents(req.siem.events).catch((error) => {
      logger.error('Failed to send SIEM events', {
        component: 'SIEMMiddleware',
        error: error.message,
        eventCount: req.siem?.events.length,
      });
    });
  }
}

/**
 * Check for suspicious activity patterns
 */
function checkSuspiciousActivity(req: SIEMRequest): void {
  const suspiciousPatterns = [
    // SQL injection patterns
    /'.*(\bunion\b|\bselect\b|\bdrop\b|\bdelete\b|\binsert\b)/i,

    // XSS patterns
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,

    // Path traversal
    /\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c/i,

    // Command injection
    /[;&|`$(){}[\]]/,

    // Unusual user agents
    /curl|wget|python|scanner|bot/i,
  ];

  const checkContent = [
    req.path,
    req.query ? JSON.stringify(req.query) : '',
    req.body ? JSON.stringify(req.body).substring(0, 1000) : '', // Limit body size
    req.get('User-Agent') || '',
  ].join(' ');

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(checkContent)) {
      const event: SIEMEvent = {
        timestamp: new Date(),
        eventType: 'suspicious_activity',
        severity: 'high',
        source: 'intelgraph_waf',
        message: `Suspicious pattern detected: ${pattern.toString()}`,
        details: {
          pattern: pattern.toString(),
          path: req.path,
          method: req.method,
          userAgent: req.get('User-Agent'),
          matched_content: checkContent.substring(0, 200),
        },
        userId: req.user?.id,
        tenantId: req.user?.tenantId,
        ipAddress: getClientIP(req),
        userAgent: req.get('User-Agent'),
        tags: ['suspicious', 'waf', 'security'],
      };

      if (req.siem) {
        req.siem.events.push(event);
      } else {
        siemService.sendEvent(event);
      }

      break; // Only log first match to avoid spam
    }
  }

  // Check for unusual request patterns
  checkRequestAnomalies(req);
}

/**
 * Check for request anomalies
 */
function checkRequestAnomalies(req: SIEMRequest): void {
  const anomalies = [];

  // Unusually large headers
  const headerSize = JSON.stringify(req.headers).length;
  if (headerSize > 8192) {
    // 8KB
    anomalies.push('large_headers');
  }

  // Too many parameters
  const paramCount =
    Object.keys(req.query || {}).length + Object.keys(req.body || {}).length;
  if (paramCount > 100) {
    anomalies.push('excessive_parameters');
  }

  // Unusual request methods
  const unusualMethods = ['TRACE', 'CONNECT', 'PATCH'];
  if (unusualMethods.includes(req.method)) {
    anomalies.push('unusual_method');
  }

  // Missing expected headers
  if (req.method === 'POST' && !req.get('Content-Type')) {
    anomalies.push('missing_content_type');
  }

  if (anomalies.length > 0) {
    const event: SIEMEvent = {
      timestamp: new Date(),
      eventType: 'request_anomaly',
      severity: 'medium',
      source: 'intelgraph_middleware',
      message: `Request anomalies detected: ${anomalies.join(', ')}`,
      details: {
        anomalies,
        path: req.path,
        method: req.method,
        headerSize,
        paramCount,
      },
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ipAddress: getClientIP(req),
      userAgent: req.get('User-Agent'),
      tags: ['anomaly', 'security'],
    };

    if (req.siem) {
      req.siem.events.push(event);
    }
  }
}

/**
 * Create generic request event
 */
function createRequestEvent(
  req: SIEMRequest,
  eventType: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  additional: Record<string, any> = {},
): SIEMEvent {
  return {
    timestamp: new Date(),
    eventType,
    severity,
    source: 'intelgraph_api',
    message: `${eventType.replace('_', ' ')} for ${req.method} ${req.path}`,
    details: {
      method: req.method,
      path: req.path,
      query: sanitizeObject(req.query),
      headers: sanitizeHeaders(req.headers),
      body: sanitizeBody(req.body),
      ...additional,
    },
    userId: req.user?.id,
    tenantId: req.user?.tenantId,
    ipAddress: getClientIP(req),
    userAgent: req.get('User-Agent'),
    tags: ['api', 'request'],
  };
}

/**
 * Create authentication event
 */
function createAuthenticationEvent(
  req: SIEMRequest,
  res: Response,
  success: boolean,
): SIEMEvent {
  return {
    timestamp: new Date(),
    eventType: success ? 'authentication_success' : 'authentication_failed',
    severity: success ? 'low' : 'medium',
    source: 'intelgraph_auth',
    message: `Authentication ${success ? 'succeeded' : 'failed'} for ${req.path}`,
    details: {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      email: req.body?.email,
      provider: req.body?.provider || 'local',
    },
    userId: success ? req.user?.id : undefined,
    tenantId: req.user?.tenantId,
    ipAddress: getClientIP(req),
    userAgent: req.get('User-Agent'),
    tags: ['authentication', success ? 'success' : 'failure'],
  };
}

/**
 * Create privileged operation event
 */
function createPrivilegedOperationEvent(req: SIEMRequest): SIEMEvent {
  return {
    timestamp: new Date(),
    eventType: 'privilege_escalation',
    severity: 'high',
    source: 'intelgraph_rbac',
    message: `Privileged operation attempted: ${req.method} ${req.path}`,
    details: {
      method: req.method,
      path: req.path,
      userRole: req.user?.role,
      requiredPermissions: getRequiredPermissions(req.path),
    },
    userId: req.user?.id,
    tenantId: req.user?.tenantId,
    ipAddress: getClientIP(req),
    userAgent: req.get('User-Agent'),
    tags: ['privilege', 'admin', 'security'],
  };
}

/**
 * Create data access event
 */
function createDataAccessEvent(req: SIEMRequest): SIEMEvent {
  return {
    timestamp: new Date(),
    eventType: 'data_access',
    severity: 'medium',
    source: 'intelgraph_data',
    message: `Data access: ${req.method} ${req.path}`,
    details: {
      method: req.method,
      path: req.path,
      dataType: getDataType(req.path),
      query: sanitizeObject(req.query),
    },
    userId: req.user?.id,
    tenantId: req.user?.tenantId,
    ipAddress: getClientIP(req),
    userAgent: req.get('User-Agent'),
    tags: ['data', 'access'],
  };
}

/**
 * Helper functions
 */
function getClientIP(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    '127.0.0.1'
  );
}

function isAuthenticationEndpoint(path: string): boolean {
  return (
    path.includes('/auth/') ||
    path.includes('/login') ||
    path.includes('/logout') ||
    path.includes('/token')
  );
}

function isPrivilegedOperation(req: SIEMRequest): boolean {
  const privilegedPaths = [
    '/api/admin/',
    '/api/rbac/',
    '/api/users/',
    '/api/tenants/',
    '/api/system/',
    '/api/compliance/',
    '/api/dlp/',
  ];

  return (
    privilegedPaths.some((path) => req.path.startsWith(path)) ||
    req.user?.role === 'admin' ||
    req.method === 'DELETE'
  );
}

function isDataAccessOperation(req: SIEMRequest): boolean {
  const dataEndpoints = [
    '/api/graph/',
    '/api/entities/',
    '/api/relationships/',
    '/api/investigations/',
    '/graphql',
  ];

  return dataEndpoints.some((endpoint) => req.path.startsWith(endpoint));
}

function sanitizeHeaders(headers: any): Record<string, string> {
  const sanitized: Record<string, string> = {};
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
  ];

  for (const [key, value] of Object.entries(headers)) {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = String(value).substring(0, 200);
    }
  }

  return sanitized;
}

function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized: any = {};
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];

  for (const [key, value] of Object.entries(obj)) {
    if (
      sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))
    ) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string' && value.length > 200) {
      sanitized[key] = value.substring(0, 200) + '...';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

function sanitizeBody(body: any): any {
  if (!body) return null;

  const bodyStr = JSON.stringify(body);
  if (bodyStr.length > 1024) {
    return bodyStr.substring(0, 1024) + '... [TRUNCATED]';
  }

  return sanitizeObject(body);
}

function getRequiredPermissions(path: string): string[] {
  // Map paths to required permissions
  const permissionMap: Record<string, string[]> = {
    '/api/admin/': ['admin'],
    '/api/users/': ['user:admin'],
    '/api/rbac/': ['rbac:admin'],
    '/api/system/': ['system:admin'],
    '/api/compliance/': ['compliance:admin'],
    '/api/dlp/': ['dlp:admin'],
  };

  for (const [pathPrefix, permissions] of Object.entries(permissionMap)) {
    if (path.startsWith(pathPrefix)) {
      return permissions;
    }
  }

  return [];
}

function getDataType(path: string): string {
  if (path.includes('/entities')) return 'entities';
  if (path.includes('/relationships')) return 'relationships';
  if (path.includes('/investigations')) return 'investigations';
  if (path.includes('/graph')) return 'graph';
  if (path.includes('/graphql')) return 'graphql';
  return 'unknown';
}

// Pre-configured middleware instances
export const siemMiddleware = createSIEMMiddleware();
export const siemSecurityMiddleware = createSIEMMiddleware({
  logFailedAuth: true,
  logPrivilegedOperations: true,
  logSuspiciousActivity: true,
  logDataAccess: false,
});
export const siemFullLoggingMiddleware = createSIEMMiddleware({
  logAllRequests: true,
  logFailedAuth: true,
  logPrivilegedOperations: true,
  logDataAccess: true,
  logSuspiciousActivity: true,
});

export default createSIEMMiddleware;
