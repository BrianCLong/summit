import type { Request, Response, NextFunction } from 'express';
import type { UsageEvent } from './types';

/** Options for the metering middleware */
export interface MeteringMiddlewareOptions {
  /** Callback invoked with each usage event on response finish */
  onUsageEvent: (event: UsageEvent) => void;

  /** Header name for tenant identification (default: 'x-tenant-id') */
  tenantHeader?: string;

  /** Default operation type when detection fails (default: 'graphql_query') */
  defaultOperation?: string;
}

/**
 * Express middleware that records API usage events for cost metering.
 *
 * - Extracts tenant from request headers or auth context
 * - Determines operation type from request body (mutation vs query)
 * - Records duration and status code
 * - Emits usage event via the provided callback
 */
export function meteringMiddleware(options: MeteringMiddlewareOptions) {
  const tenantHeader = options.tenantHeader ?? 'x-tenant-id';
  const defaultOperation = options.defaultOperation ?? 'graphql_query';

  return (req: Request, _res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    _res.on('finish', () => {
      const duration = Date.now() - startTime;
      const tenant = extractTenant(req, tenantHeader);
      const operation = detectOperation(req, defaultOperation);

      const event: UsageEvent = {
        operation,
        dimensions: {
          tenant,
          status: String(_res.statusCode),
        },
        quantity: 1,
        timestamp: new Date(),
        metadata: {
          method: req.method,
          path: req.path,
          duration,
          statusCode: _res.statusCode,
        },
      };

      options.onUsageEvent(event);
    });

    next();
  };
}

/**
 * Extract tenant identifier from request headers or auth context.
 */
function extractTenant(req: Request, tenantHeader: string): string {
  // Try explicit header first
  const headerValue = req.headers[tenantHeader.toLowerCase()];
  if (headerValue) {
    return Array.isArray(headerValue) ? headerValue[0] : headerValue;
  }

  // Fall back to auth context if available
  const authUser = (req as Record<string, unknown>).user as
    | { tenantId?: string }
    | undefined;
  if (authUser?.tenantId) {
    return authUser.tenantId;
  }

  return 'unknown';
}

/**
 * Detect operation type from the GraphQL request body.
 * Mutations are identified by the 'mutation' keyword at the start of the query string.
 */
function detectOperation(req: Request, defaultOperation: string): string {
  if (req.body && typeof req.body === 'object') {
    const query: unknown = (req.body as Record<string, unknown>).query;
    if (typeof query === 'string') {
      const trimmed = query.trim();
      if (trimmed.startsWith('mutation')) {
        return 'graphql_mutation';
      }
      return 'graphql_query';
    }
  }
  return defaultOperation;
}
