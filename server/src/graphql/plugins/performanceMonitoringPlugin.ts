/**
 * Comprehensive GraphQL Performance Monitoring Plugin
 * Tracks detailed metrics for query performance, DataLoader usage, and N+1 detection
 */

import type { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import pino from 'pino';
import type { DataLoaders } from '../dataloaders/index.js';

const logger = pino();

export interface PerformanceMetrics {
  operationName: string | undefined;
  duration: number;
  resolverCount: number;
  dataLoaderStats: {
    entityCalls: number;
    relationshipCalls: number;
    investigationCalls: number;
    userCalls: number;
    totalBatchedCalls: number;
  };
  potentialN1Issues: Array<{
    resolver: string;
    callCount: number;
  }>;
  queryDepth: number;
  fieldCount: number;
}

interface ResolverCallTracker {
  [key: string]: number;
}

/**
 * Calculates the depth of a GraphQL selection set
 */
function calculateQueryDepth(selectionSet: any, currentDepth = 0): number {
  if (!selectionSet || !selectionSet.selections) {
    return currentDepth;
  }

  let maxDepth = currentDepth;
  for (const selection of selectionSet.selections) {
    if (selection.selectionSet) {
      const depth = calculateQueryDepth(selection.selectionSet, currentDepth + 1);
      maxDepth = Math.max(maxDepth, depth);
    }
  }

  return maxDepth;
}

/**
 * Counts total fields in a GraphQL query
 */
function countFields(selectionSet: any): number {
  if (!selectionSet || !selectionSet.selections) {
    return 0;
  }

  let count = selectionSet.selections.length;
  for (const selection of selectionSet.selections) {
    if (selection.selectionSet) {
      count += countFields(selection.selectionSet);
    }
  }

  return count;
}

/**
 * Creates a performance monitoring plugin
 */
export function createPerformanceMonitoringPlugin(): ApolloServerPlugin {
  return {
    async requestDidStart({ request, contextValue }): Promise<GraphQLRequestListener<any>> {
      const startTime = Date.now();
      const resolverCalls: ResolverCallTracker = {};
      let resolverCount = 0;

      // Track DataLoader initial state
      const initialDataLoaderStats = contextValue?.loaders
        ? getDataLoaderStats(contextValue.loaders)
        : null;

      return {
        async executionDidStart() {
          return {
            willResolveField({ info }) {
              const resolverName = `${info.parentType.name}.${info.fieldName}`;
              resolverCalls[resolverName] = (resolverCalls[resolverName] || 0) + 1;
              resolverCount++;

              return () => {
                // Field resolution complete
              };
            },
          };
        },

        async willSendResponse({ response, document }) {
          const duration = Date.now() - startTime;

          // Get final DataLoader stats
          const finalDataLoaderStats = contextValue?.loaders
            ? getDataLoaderStats(contextValue.loaders)
            : null;

          // Detect potential N+1 issues
          const potentialN1Issues = Object.entries(resolverCalls)
            .filter(([_, count]) => count > 10) // Called more than 10 times
            .map(([resolver, callCount]) => ({ resolver, callCount }))
            .sort((a, b) => b.callCount - a.callCount);

          // Calculate query metrics
          const queryDepth = document ? calculateQueryDepth(document.definitions[0] as any) : 0;
          const fieldCount = document ? countFields((document.definitions[0] as any).selectionSet) : 0;

          const metrics: PerformanceMetrics = {
            operationName: request.operationName,
            duration,
            resolverCount,
            dataLoaderStats: {
              entityCalls: finalDataLoaderStats?.entity.calls || 0,
              relationshipCalls: finalDataLoaderStats?.relationship.calls || 0,
              investigationCalls: finalDataLoaderStats?.investigation.calls || 0,
              userCalls: finalDataLoaderStats?.user.calls || 0,
              totalBatchedCalls: calculateTotalBatchedCalls(finalDataLoaderStats),
            },
            potentialN1Issues,
            queryDepth,
            fieldCount,
          };

          // Log performance metrics
          const logLevel = duration > 1000 ? 'warn' : 'info';
          logger[logLevel](
            {
              ...metrics,
              user: contextValue?.user?.id,
              hasErrors: !!(response.body as any).errors,
            },
            'GraphQL operation performance'
          );

          // Log warnings for potential issues
          if (potentialN1Issues.length > 0) {
            logger.warn(
              {
                operationName: request.operationName,
                issues: potentialN1Issues,
              },
              'Potential N+1 query issues detected'
            );
          }

          if (queryDepth > 5) {
            logger.warn(
              {
                operationName: request.operationName,
                depth: queryDepth,
              },
              'Deep query detected'
            );
          }

          // Add performance metrics to response extensions in development
          if (process.env.NODE_ENV !== 'production') {
            const body = response.body as any;
            if (body.kind === 'single' && body.singleResult) {
              body.singleResult.extensions = {
                ...body.singleResult.extensions,
                performance: metrics,
              };
            }
          }
        },
      };
    },
  };
}

/**
 * Get DataLoader statistics
 */
function getDataLoaderStats(loaders: DataLoaders) {
  return {
    entity: {
      calls: getLoaderCallCount(loaders.entityLoader),
      cacheSize: getLoaderCacheSize(loaders.entityLoader),
    },
    relationship: {
      calls: getLoaderCallCount(loaders.relationshipLoader),
      cacheSize: getLoaderCacheSize(loaders.relationshipLoader),
    },
    investigation: {
      calls: getLoaderCallCount(loaders.investigationLoader),
      cacheSize: getLoaderCacheSize(loaders.investigationLoader),
    },
    user: {
      calls: getLoaderCallCount(loaders.userLoader),
      cacheSize: getLoaderCacheSize(loaders.userLoader),
    },
  };
}

/**
 * Get call count for a DataLoader
 */
function getLoaderCallCount(loader: any): number {
  // Access internal DataLoader stats
  return loader._promiseCache?.size || 0;
}

/**
 * Get cache size for a DataLoader
 */
function getLoaderCacheSize(loader: any): number {
  return loader._cacheMap?.size || 0;
}

/**
 * Calculate total batched calls across all DataLoaders
 */
function calculateTotalBatchedCalls(stats: ReturnType<typeof getDataLoaderStats> | null): number {
  if (!stats) return 0;

  return (
    stats.entity.calls +
    stats.relationship.calls +
    stats.investigation.calls +
    stats.user.calls
  );
}

/**
 * N+1 Query Detector Middleware
 * Analyzes resolver execution patterns to detect N+1 queries
 */
export class N1Detector {
  private resolverExecutions = new Map<string, Array<{ timestamp: number; args: any }>>();
  private threshold = 10; // Report if a resolver is called more than this many times

  recordResolverCall(resolverName: string, args: any) {
    if (!this.resolverExecutions.has(resolverName)) {
      this.resolverExecutions.set(resolverName, []);
    }

    this.resolverExecutions.get(resolverName)!.push({
      timestamp: Date.now(),
      args,
    });
  }

  detectN1Issues(): Array<{
    resolver: string;
    callCount: number;
    suggestion: string;
  }> {
    const issues: Array<{ resolver: string; callCount: number; suggestion: string }> = [];

    for (const [resolver, executions] of this.resolverExecutions.entries()) {
      if (executions.length > this.threshold) {
        issues.push({
          resolver,
          callCount: executions.length,
          suggestion: `Consider using DataLoader for ${resolver}`,
        });
      }
    }

    return issues;
  }

  reset() {
    this.resolverExecutions.clear();
  }
}
