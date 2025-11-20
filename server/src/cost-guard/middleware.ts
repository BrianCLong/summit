/**
 * Cost Guard Middleware
 *
 * Drop-in middleware for enforcing query budgets and rate limits per tenant.
 * Can be wrapped around expensive operations without modifying business logic.
 *
 * Usage:
 *   import { withCostGuard, costGuardMiddleware } from '@/cost-guard/middleware';
 *
 *   // Express middleware
 *   app.use(costGuardMiddleware());
 *
 *   // Wrap expensive operations
 *   const result = await withCostGuard({
 *     tenantId: 'acme-corp',
 *     userId: 'user-123',
 *     operation: 'cypher_query',
 *     complexity: 8,
 *   }, async () => {
 *     return await executeExpensiveQuery(query);
 *   });
 */

import { Request, Response, NextFunction } from 'express';
import { costGuard, CostGuardService } from '../services/cost-guard';
import pino from 'pino';

const logger = pino({ name: 'cost-guard:middleware' });

export interface CostGuardContext {
  tenantId: string;
  userId: string;
  operation: string;
  complexity?: number;
  metadata?: Record<string, any>;
}

export interface CostGuardOptions {
  enabled?: boolean;
  onBudgetExceeded?: (context: CostGuardContext, reason: string) => void;
  onRateLimited?: (context: CostGuardContext) => void;
  skipPaths?: string[];
  extractTenantId?: (req: Request) => string;
  extractUserId?: (req: Request) => string;
}

export class CostGuardError extends Error {
  public readonly statusCode: number;
  public readonly budgetRemaining: number;
  public readonly estimatedCost: number;
  public readonly warnings: string[];

  constructor(
    message: string,
    budgetRemaining: number,
    estimatedCost: number,
    warnings: string[],
  ) {
    super(message);
    this.name = 'CostGuardError';
    this.statusCode = 429; // Too Many Requests
    this.budgetRemaining = budgetRemaining;
    this.estimatedCost = estimatedCost;
    this.warnings = warnings;
  }
}

/**
 * Express middleware for cost guard
 * Checks cost allowance before allowing requests to proceed
 */
export function costGuardMiddleware(options: CostGuardOptions = {}): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const {
    enabled = true,
    skipPaths = ['/health', '/metrics', '/ready'],
    extractTenantId = (req) => req.headers['x-tenant-id'] as string || 'default',
    extractUserId = (req) => req.headers['x-user-id'] as string || 'anonymous',
    onBudgetExceeded,
    onRateLimited,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    if (!enabled) {
      return next();
    }

    // Skip health check and metrics endpoints
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const tenantId = extractTenantId(req);
    const userId = extractUserId(req);

    // Determine operation type from request
    let operation = 'api_request';
    if (req.path.includes('graphql')) {
      operation = 'graphql_query';
    } else if (req.path.includes('export')) {
      operation = 'export_operation';
    } else if (req.path.includes('query')) {
      operation = 'cypher_query';
    }

    const context = {
      tenantId,
      userId,
      operation,
      metadata: {
        path: req.path,
        method: req.method,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      },
    };

    try {
      // Pre-flight cost check
      const costCheck = await costGuard.checkCostAllowance(context);

      if (!costCheck.allowed) {
        // Budget exceeded - reject request
        const errorMessage = costCheck.killReason || 'Cost budget exceeded';

        if (onBudgetExceeded) {
          onBudgetExceeded(context, errorMessage);
        }

        logger.warn({
          tenantId,
          userId,
          operation,
          budgetRemaining: costCheck.budgetRemaining,
          estimatedCost: costCheck.estimatedCost,
          warnings: costCheck.warnings,
        }, 'Request blocked: cost budget exceeded');

        return res.status(429).json({
          error: 'Cost Limit Exceeded',
          message: errorMessage,
          details: {
            budgetRemaining: costCheck.budgetRemaining,
            estimatedCost: costCheck.estimatedCost,
            warnings: costCheck.warnings,
            retryAfter: '1h', // Suggest retry after daily reset
          },
        });
      }

      if (costCheck.rateLimited) {
        if (onRateLimited) {
          onRateLimited(context);
        }

        // Add rate limit headers
        res.set('X-RateLimit-Cost', 'true');
        res.set('X-RateLimit-Budget-Remaining', costCheck.budgetRemaining.toFixed(4));
        res.set('X-RateLimit-Utilization', (costCheck.budgetUtilization * 100).toFixed(2));
      }

      // Attach cost context to request for later recording
      (req as any).costContext = context;
      (req as any).estimatedCost = costCheck.estimatedCost;
      (req as any).costCheckResult = costCheck;

      // Add cost headers to response
      res.set('X-Cost-Estimated', costCheck.estimatedCost.toFixed(4));
      res.set('X-Cost-Budget-Remaining', costCheck.budgetRemaining.toFixed(4));

      next();
    } catch (error) {
      logger.error({
        error,
        tenantId,
        operation,
      }, 'Cost guard middleware error');

      // Allow request to proceed on error (fail open)
      next();
    }
  };
}

/**
 * Middleware to record actual costs after request completion
 */
export function costRecordingMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    res.on('finish', async () => {
      const costContext = (req as any).costContext;
      if (!costContext) {
        return;
      }

      const duration = Date.now() - startTime;

      // Enhance context with actual execution data
      const enhancedContext = {
        ...costContext,
        duration,
        metadata: {
          ...costContext.metadata,
          statusCode: res.statusCode,
          responseTime: duration,
          success: res.statusCode < 400,
        },
      };

      try {
        await costGuard.recordActualCost(enhancedContext);

        logger.debug({
          tenantId: costContext.tenantId,
          operation: costContext.operation,
          duration,
          statusCode: res.statusCode,
        }, 'Cost recorded');
      } catch (error) {
        logger.error({
          error,
          context: enhancedContext,
        }, 'Failed to record cost');
      }
    });

    next();
  };
}

/**
 * Wrapper function to guard expensive operations
 * Throws CostGuardError if budget is exceeded
 *
 * @example
 * const result = await withCostGuard({
 *   tenantId: 'acme',
 *   userId: 'user123',
 *   operation: 'cypher_query',
 *   complexity: 10,
 * }, async () => {
 *   return await db.query(expensiveQuery);
 * });
 */
export async function withCostGuard<T>(
  context: CostGuardContext,
  operation: () => Promise<T>,
): Promise<T> {
  const operationId = `${context.tenantId}:${context.operation}:${Date.now()}`;
  const startTime = Date.now();

  try {
    // Pre-flight cost check
    const costCheck = await costGuard.checkCostAllowance(context);

    if (!costCheck.allowed) {
      const reason = costCheck.warnings.join('; ');
      logger.warn({
        tenantId: context.tenantId,
        operation: context.operation,
        reason,
      }, 'Operation blocked: cost budget exceeded');

      throw new CostGuardError(
        `Operation blocked: ${reason}`,
        costCheck.budgetRemaining,
        costCheck.estimatedCost,
        costCheck.warnings,
      );
    }

    // Start monitoring the operation
    costGuard.startCostlyOperation(operationId, context);

    // Execute the operation
    const result = await operation();

    // Record success
    const duration = Date.now() - startTime;
    await costGuard.recordActualCost({
      ...context,
      duration,
    });

    costGuard.completeCostlyOperation(operationId);

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    // Record failure with cost
    await costGuard.recordActualCost({
      ...context,
      duration,
      metadata: {
        ...context.metadata,
        error: error instanceof Error ? error.message : String(error),
        success: false,
      },
    });

    costGuard.completeCostlyOperation(operationId);

    throw error;
  }
}

/**
 * GraphQL resolver wrapper with cost guard
 *
 * @example
 * const resolvers = {
 *   Query: {
 *     expensiveQuery: withCostGuardResolver(
 *       async (parent, args, context) => {
 *         return await fetchExpensiveData(args);
 *       },
 *       { operation: 'graphql_query', complexity: 5 }
 *     ),
 *   },
 * };
 */
export function withCostGuardResolver<TArgs = any, TResult = any>(
  resolver: (parent: any, args: TArgs, context: any, info: any) => Promise<TResult>,
  options: { operation: string; complexity?: number } = { operation: 'graphql_query' },
) {
  return async (parent: any, args: TArgs, context: any, info: any): Promise<TResult> => {
    const tenantId = context.tenantId || 'default';
    const userId = context.user?.id || 'anonymous';

    const costContext: CostGuardContext = {
      tenantId,
      userId,
      operation: options.operation,
      complexity: options.complexity,
      metadata: {
        fieldName: info.fieldName,
        operationType: info.operation?.operation,
        parentType: info.parentType?.name,
      },
    };

    return withCostGuard(costContext, async () => {
      return await resolver(parent, args, context, info);
    });
  };
}

/**
 * Database operation wrapper with cost guard
 *
 * @example
 * const results = await withCostGuardDB({
 *   tenantId: 'acme',
 *   userId: 'user123',
 *   operation: 'cypher_query',
 *   complexity: calculateComplexity(query),
 * }, async () => {
 *   return await neo4j.run(query);
 * });
 */
export async function withCostGuardDB<T>(
  context: CostGuardContext,
  dbOperation: () => Promise<T>,
): Promise<T> {
  return withCostGuard(context, dbOperation);
}

/**
 * Export operation wrapper with cost guard
 * Exports are typically expensive operations
 */
export async function withCostGuardExport<T>(
  context: Omit<CostGuardContext, 'operation'>,
  exportOperation: () => Promise<T>,
): Promise<T> {
  return withCostGuard(
    {
      ...context,
      operation: 'export_operation',
      complexity: context.complexity || 10, // Exports are inherently expensive
    },
    exportOperation,
  );
}

// Re-export the cost guard service for direct access
export { costGuard, CostGuardService };
