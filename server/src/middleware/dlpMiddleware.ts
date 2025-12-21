/**
 * DLP Middleware
 *
 * Express middleware that integrates DLP scanning into API requests and responses.
 */

import { Request, Response, NextFunction } from 'express';
import { dlpService, DLPContext } from '../services/DLPService.js';
import logger from '../utils/logger.js';
import { AppError } from '../lib/errors.js';

interface DLPRequest extends Request {
  dlp?: {
    scanned: boolean;
    violations: any[];
    processedBody?: any;
  };
}

export interface DLPMiddlewareOptions {
  enabled?: boolean;
  scanBody?: boolean;
  scanParams?: boolean;
  scanQuery?: boolean;
  scanResponse?: boolean;
  exemptRoutes?: string[];
  exemptMethods?: string[];
  blockOnViolation?: boolean;
  maxContentSize?: number;
}

const defaultOptions: DLPMiddlewareOptions = {
  enabled: true,
  scanBody: true,
  scanParams: false,
  scanQuery: false,
  scanResponse: false,
  exemptRoutes: ['/health', '/metrics', '/favicon.ico'],
  exemptMethods: ['OPTIONS', 'HEAD'],
  blockOnViolation: true,
  maxContentSize: 1024 * 1024, // 1MB
};

/**
 * Create DLP middleware with specified options
 */
export function createDLPMiddleware(
  options: DLPMiddlewareOptions = {},
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const config = { ...defaultOptions, ...options };

  return async (
    req: DLPRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // Skip if DLP is disabled
      if (!config.enabled) {
        return next();
      }

      // Skip exempt routes
      if (config.exemptRoutes?.some((route) => req.path.startsWith(route))) {
        return next();
      }

      // Skip exempt methods
      if (config.exemptMethods?.includes(req.method)) {
        return next();
      }

      // Extract DLP context from request
      const context: DLPContext = {
        userId: req.user?.id || 'anonymous',
        tenantId: req.user?.tenantId || 'default',
        userRole: req.user?.role || 'user',
        operationType: getDLPOperationType(req.method),
        contentType: req.get('Content-Type') || 'application/json',
        metadata: {
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          route: req.route?.path,
          method: req.method,
        },
      };

      const violations: any[] = [];
      let processedBody = req.body;

      // Scan request body
      if (config.scanBody && req.body) {
        const bodyResult = await scanRequestData(
          req.body,
          'body',
          context,
          config,
        );
        if (bodyResult.violations.length > 0) {
          violations.push(...bodyResult.violations);
          processedBody = bodyResult.processedContent;
        }
      }

      // Scan request parameters
      if (config.scanParams && Object.keys(req.params).length > 0) {
        const paramsResult = await scanRequestData(
          req.params,
          'params',
          context,
          config,
        );
        if (paramsResult.violations.length > 0) {
          violations.push(...paramsResult.violations);
        }
      }

      // Scan query parameters
      if (config.scanQuery && Object.keys(req.query).length > 0) {
        const queryResult = await scanRequestData(
          req.query,
          'query',
          context,
          config,
        );
        if (queryResult.violations.length > 0) {
          violations.push(...queryResult.violations);
        }
      }

      // Attach DLP information to request
      req.dlp = {
        scanned: true,
        violations,
        processedBody,
      };

      // Block request if violations found and blocking is enabled
      if (config.blockOnViolation && violations.length > 0) {
        const criticalViolations = violations.filter((v) =>
          v.recommendedActions.some(
            (action: any) => action.severity === 'critical',
          ),
        );

        if (criticalViolations.length > 0) {
          logger.warn(
            'DLP middleware blocked request due to critical violations',
            {
              component: 'DLPMiddleware',
              tenantId: context.tenantId,
              userId: context.userId,
              path: req.path,
              method: req.method,
              violationCount: criticalViolations.length,
              violations: criticalViolations.map((v) => ({
                policyId: v.policyId,
                detectedEntities: v.metadata.detectedEntities,
              })),
            },
          );

          throw new AppError(
            'Request blocked due to data loss prevention policy violations',
            403,
            'DLP_VIOLATION',
          );
        }
      }

      // Replace request body with processed content if redacted
      if (processedBody !== req.body) {
        req.body = processedBody;
      }

      // Scan response if enabled
      if (config.scanResponse) {
        const originalSend = res.send;
        const originalJson = res.json;

        // Override res.send()
        res.send = function (body: any) {
          if (body && typeof body === 'string') {
            scanAndProcessResponse(body, context, config)
              .then((processedResponse) => {
                return originalSend.call(this, processedResponse);
              })
              .catch((error) => {
                logger.error('DLP response scanning failed', {
                  component: 'DLPMiddleware',
                  error: error.message,
                  tenantId: context.tenantId,
                });
                return originalSend.call(this, body);
              });
          } else {
            return originalSend.call(this, body);
          }
        };

        // Override res.json()
        res.json = function (obj: any) {
          if (obj) {
            scanAndProcessResponse(obj, context, config)
              .then((processedResponse) => {
                return originalJson.call(this, processedResponse);
              })
              .catch((error) => {
                logger.error('DLP response scanning failed', {
                  component: 'DLPMiddleware',
                  error: error.message,
                  tenantId: context.tenantId,
                });
                return originalJson.call(this, obj);
              });
          } else {
            return originalJson.call(this, obj);
          }
        };
      }

      next();
    } catch (error) {
      logger.error('DLP middleware error', {
        component: 'DLPMiddleware',
        error: error.message,
        path: req.path,
        method: req.method,
        userId: req.user?.id,
      });

      if (error instanceof AppError) {
        throw error;
      }

      next(error);
    }
  };
}

/**
 * Scan request data for DLP violations
 */
async function scanRequestData(
  data: any,
  dataType: string,
  context: DLPContext,
  config: DLPMiddlewareOptions,
): Promise<{ violations: any[]; processedContent: any }> {
  try {
    // Check content size
    const contentStr = JSON.stringify(data);
    if (config.maxContentSize && contentStr.length > config.maxContentSize) {
      logger.warn('DLP middleware skipped scanning due to size limit', {
        component: 'DLPMiddleware',
        contentSize: contentStr.length,
        maxSize: config.maxContentSize,
        dataType,
        tenantId: context.tenantId,
      });
      return { violations: [], processedContent: data };
    }

    // Scan for violations
    const scanResults = await dlpService.scanContent(data, context);

    if (scanResults.length === 0) {
      return { violations: [], processedContent: data };
    }

    // Apply DLP actions
    const { processedContent, actionsApplied, blocked } =
      await dlpService.applyActions(data, scanResults, context);

    logger.info('DLP middleware scan completed', {
      component: 'DLPMiddleware',
      dataType,
      tenantId: context.tenantId,
      userId: context.userId,
      violationCount: scanResults.length,
      actionsApplied,
      blocked,
    });

    return {
      violations: scanResults,
      processedContent,
    };
  } catch (error) {
    logger.error('DLP request data scanning failed', {
      component: 'DLPMiddleware',
      error: error.message,
      dataType,
      tenantId: context.tenantId,
    });

    // Return original data if scanning fails
    return { violations: [], processedContent: data };
  }
}

/**
 * Scan and process response data
 */
async function scanAndProcessResponse(
  responseData: any,
  context: DLPContext,
  config: DLPMiddlewareOptions,
): Promise<any> {
  try {
    const responseContext = {
      ...context,
      operationType: 'read' as const,
    };

    const scanResults = await dlpService.scanContent(
      responseData,
      responseContext,
    );

    if (scanResults.length === 0) {
      return responseData;
    }

    const { processedContent } = await dlpService.applyActions(
      responseData,
      scanResults,
      responseContext,
    );

    logger.info('DLP response scanning completed', {
      component: 'DLPMiddleware',
      tenantId: context.tenantId,
      userId: context.userId,
      violationCount: scanResults.length,
    });

    return processedContent;
  } catch (error) {
    logger.error('DLP response scanning failed', {
      component: 'DLPMiddleware',
      error: error.message,
      tenantId: context.tenantId,
    });

    return responseData;
  }
}

/**
 * Map HTTP method to DLP operation type
 */
function getDLPOperationType(method: string): DLPContext['operationType'] {
  switch (method.toUpperCase()) {
    case 'GET':
    case 'HEAD':
      return 'read';
    case 'POST':
    case 'PUT':
    case 'PATCH':
      return 'write';
    case 'DELETE':
      return 'delete';
    default:
      return 'read';
  }
}

/**
 * DLP status endpoint middleware
 */
export function dlpStatusMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const policies = dlpService.listPolicies();
    const enabledPolicies = policies.filter((p) => p.enabled);

    const status = {
      enabled: true,
      totalPolicies: policies.length,
      enabledPolicies: enabledPolicies.length,
      policies: enabledPolicies.map((p) => ({
        id: p.id,
        name: p.name,
        priority: p.priority,
        enabled: p.enabled,
        actionTypes: p.actions.map((a) => a.type),
      })),
    };

    res.json(status);
  } catch (error) {
    logger.error('DLP status endpoint error', {
      component: 'DLPMiddleware',
      error: error.message,
    });
    next(error);
  }
}

// Pre-configured middleware instances
export const dlpMiddleware = createDLPMiddleware();
export const dlpReadOnlyMiddleware = createDLPMiddleware({
  scanBody: true,
  scanResponse: true,
  blockOnViolation: false,
});
export const dlpStrictMiddleware = createDLPMiddleware({
  scanBody: true,
  scanParams: true,
  scanQuery: true,
  scanResponse: true,
  blockOnViolation: true,
});

export default createDLPMiddleware;
