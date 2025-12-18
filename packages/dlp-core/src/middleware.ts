/**
 * DLP Express Middleware
 *
 * Express middleware for integrating DLP scanning into HTTP request/response pipeline.
 *
 * @package dlp-core
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { DLPService } from './DLPService';
import type { DLPServiceConfig, ContentScanResult } from './types';

export interface DLPMiddlewareOptions {
  inspectionPoints: ('request' | 'response')[];
  asyncMode?: boolean;
  failOpen?: boolean;
  excludePaths?: string[];
  maxBodySize?: number;
}

export interface DLPMiddlewareResult {
  inspect: () => RequestHandler;
}

/**
 * Create DLP middleware for Express
 */
export function createDLPMiddleware(
  serviceConfig: DLPServiceConfig,
  options: DLPMiddlewareOptions
): DLPMiddlewareResult {
  const dlpService = new DLPService(serviceConfig);

  const defaultOptions: Required<DLPMiddlewareOptions> = {
    inspectionPoints: ['request', 'response'],
    asyncMode: false,
    failOpen: false,
    excludePaths: ['/health', '/metrics', '/ready', '/live'],
    maxBodySize: 10 * 1024 * 1024, // 10MB
    ...options,
  };

  const inspect = (): RequestHandler => {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Check if path is excluded
      if (defaultOptions.excludePaths.some((p) => req.path.startsWith(p))) {
        return next();
      }

      // Inspect request body if configured
      if (
        defaultOptions.inspectionPoints.includes('request') &&
        req.body &&
        Object.keys(req.body).length > 0
      ) {
        try {
          const bodyString = JSON.stringify(req.body);

          // Skip if body is too large
          if (bodyString.length > defaultOptions.maxBodySize) {
            console.warn('[DLP] Request body exceeds max size, skipping inspection');
            return next();
          }

          const result = await dlpService.scan({
            content: bodyString,
            contentType: req.get('content-type') || 'application/json',
            context: {
              contentType: 'request',
              purpose: getOperationType(req.method, req.path),
              actor: extractActor(req),
            },
            metadata: {
              path: req.path,
              method: req.method,
              ip: req.ip,
            },
          });

          // Attach result to request for downstream use
          (req as Request & { dlpResult?: ContentScanResult }).dlpResult = result;

          if (!result.allowed) {
            return res.status(403).json({
              error: 'DLP_BLOCKED',
              message: 'Request blocked by data loss prevention policy',
              violations: result.violations.map((v) => ({
                type: v.type,
                message: v.message,
              })),
              auditEventId: result.auditEventId,
            });
          }

          // Handle warnings
          if (result.action === 'WARN') {
            res.setHeader('X-DLP-Warning', 'true');
            res.setHeader('X-DLP-Audit-Id', result.auditEventId);
          }
        } catch (error) {
          console.error('[DLP] Request inspection failed:', error);

          if (!defaultOptions.failOpen) {
            return res.status(500).json({
              error: 'DLP_ERROR',
              message: 'Data loss prevention check failed',
            });
          }
        }
      }

      // For response inspection, wrap res.json
      if (defaultOptions.inspectionPoints.includes('response')) {
        const originalJson = res.json.bind(res);

        res.json = function (body: unknown): Response {
          // Async inspection - don't block response
          if (defaultOptions.asyncMode) {
            setImmediate(async () => {
              try {
                await dlpService.scan({
                  content: JSON.stringify(body),
                  contentType: 'application/json',
                  context: {
                    contentType: 'response',
                    purpose: 'EGRESS',
                    actor: extractActor(req),
                  },
                  metadata: {
                    path: req.path,
                    method: req.method,
                  },
                });
              } catch (error) {
                console.error('[DLP] Response inspection failed:', error);
              }
            });
            return originalJson(body);
          }

          // Sync inspection would go here if needed
          return originalJson(body);
        };
      }

      next();
    };
  };

  return { inspect };
}

/**
 * Extract actor information from request
 */
function extractActor(req: Request): { id: string; tenantId: string; roles: string[] } | undefined {
  // This would integrate with your auth middleware
  const user = (req as Request & { user?: { id: string; tenantId: string; roles: string[] } }).user;

  if (user) {
    return {
      id: user.id,
      tenantId: user.tenantId,
      roles: user.roles || [],
    };
  }

  return undefined;
}

/**
 * Determine operation type from HTTP method and path
 */
function getOperationType(method: string, path: string): string {
  if (path.includes('/export') || path.includes('/download')) {
    return 'EXPORT';
  }
  if (path.includes('/share')) {
    return 'SHARE';
  }

  switch (method.toUpperCase()) {
    case 'GET':
      return 'READ';
    case 'POST':
      return 'CREATE';
    case 'PUT':
    case 'PATCH':
      return 'UPDATE';
    case 'DELETE':
      return 'DELETE';
    default:
      return 'UNKNOWN';
  }
}

export default createDLPMiddleware;
