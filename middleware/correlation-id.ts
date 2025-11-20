/**
 * Correlation ID middleware for request tracking
 * Maintains correlation IDs across async operations and includes them in all logs
 */
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  setCorrelationId,
  setUserId,
  setTenantId,
  runWithContext,
} from '@intelgraph/logger';

export interface CorrelationIdOptions {
  /**
   * Header name to read/write correlation ID
   * Default: 'x-correlation-id'
   */
  header?: string;

  /**
   * Whether to generate a new ID if one is not provided
   * Default: true
   */
  generateIfMissing?: boolean;

  /**
   * Whether to set the correlation ID in the response header
   * Default: true
   */
  setResponseHeader?: boolean;
}

/**
 * Express middleware to handle correlation IDs for request tracking
 *
 * Features:
 * - Reads correlation ID from request header
 * - Generates new ID if missing
 * - Sets correlation ID in response header
 * - Stores correlation ID in async context for logging
 * - Enriches context with user and tenant information
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { correlationIdMiddleware } from './middleware/correlation-id';
 *
 * const app = express();
 * app.use(correlationIdMiddleware());
 * ```
 */
export function correlationIdMiddleware(
  options: CorrelationIdOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const {
    header = 'x-correlation-id',
    generateIfMissing = true,
    setResponseHeader = true,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Get or generate correlation ID
    let correlationId = req.headers[header.toLowerCase()] as string | undefined;

    if (!correlationId && generateIfMissing) {
      correlationId = uuidv4();
    }

    if (!correlationId) {
      next();
      return;
    }

    // Set correlation ID in response header
    if (setResponseHeader) {
      res.setHeader(header, correlationId);
    }

    // Store in request object for backwards compatibility
    (req as any).correlationId = correlationId;

    // Extract user and tenant information if available
    const userId = (req as any).user?.id || (req as any).userId;
    const tenantId = (req as any).tenant?.id || (req as any).tenantId;

    // Run the rest of the request in an async context
    runWithContext(
      {
        correlationId,
        userId,
        tenantId,
        requestId: correlationId, // Alias for compatibility
      },
      () => {
        // Update context with correlation ID
        setCorrelationId(correlationId!);

        if (userId) {
          setUserId(userId);
        }

        if (tenantId) {
          setTenantId(tenantId);
        }

        next();
      }
    );
  };
}

/**
 * Default correlation ID middleware instance
 */
export const correlationId = correlationIdMiddleware();
