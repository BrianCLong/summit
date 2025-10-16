// GraphQL Security Plugin
// Integrates persisted queries, introspection blocking, and security monitoring

import { ApolloServerPlugin } from '@apollo/server';
import {
  checkPersistedQuery,
  checkIntrospectionAllowed,
  getAllowlistStats,
} from './persisted';
import { prometheusConductorMetrics } from '../conductor/observability/prometheus';

export interface SecurityPluginConfig {
  enablePersistedQueries: boolean;
  blockIntrospection: boolean;
  logBlockedQueries: boolean;
  maxQueryDepth: number;
  maxQueryComplexity: number;
}

const defaultConfig: SecurityPluginConfig = {
  enablePersistedQueries: process.env.NODE_ENV === 'production',
  blockIntrospection: process.env.NODE_ENV === 'production',
  logBlockedQueries: true,
  maxQueryDepth: 10,
  maxQueryComplexity: 1000,
};

export function createGraphQLSecurityPlugin(
  config: Partial<SecurityPluginConfig> = {},
): ApolloServerPlugin {
  const finalConfig = { ...defaultConfig, ...config };

  return {
    async serverWillStart() {
      const stats = getAllowlistStats();
      console.log('GraphQL Security Plugin initialized:', {
        persistedQueries: finalConfig.enablePersistedQueries,
        introspectionBlocked: finalConfig.blockIntrospection,
        allowlistSize: stats.size,
        productionMode: stats.productionMode,
      });

      return {
        async serverWillStop() {
          console.log('GraphQL Security Plugin shutting down');
        },
      };
    },

    async requestDidStart() {
      return {
        async didResolveOperation(requestContext) {
          const query = requestContext.request.query;

          if (!query) {
            return;
          }

          try {
            // Check persisted queries
            if (finalConfig.enablePersistedQueries) {
              checkPersistedQuery(query);
            }

            // Check introspection
            if (finalConfig.blockIntrospection) {
              checkIntrospectionAllowed(query);
            }

            // Validate query complexity
            validateQueryComplexity(query, finalConfig);

            // Record successful security check
            prometheusConductorMetrics.recordSecurityEvent(
              'query_validation',
              true,
            );
          } catch (error) {
            // Record security event
            prometheusConductorMetrics.recordSecurityEvent(
              'query_blocked',
              false,
            );

            if (finalConfig.logBlockedQueries) {
              console.warn('GraphQL security violation:', {
                error: error.message,
                query: query.substring(0, 200) + '...',
                userAgent:
                  requestContext.request.http?.headers.get('user-agent'),
                ip:
                  requestContext.request.http?.headers.get('x-forwarded-for') ||
                  requestContext.request.http?.headers.get('x-real-ip') ||
                  'unknown',
                timestamp: new Date().toISOString(),
              });
            }

            throw error;
          }
        },

        async willSendResponse(requestContext) {
          // Remove schema information in production
          if (
            process.env.NODE_ENV === 'production' &&
            requestContext.response.body.kind === 'single'
          ) {
            const body = requestContext.response.body.singleResult;
            if (body.extensions && body.extensions.schema) {
              delete body.extensions.schema;
            }
          }
        },
      };
    },
  };
}

/**
 * Validate query complexity to prevent DoS attacks
 */
function validateQueryComplexity(
  query: string,
  config: SecurityPluginConfig,
): void {
  const depth = calculateQueryDepth(query);
  const complexity = estimateQueryComplexity(query);

  if (depth > config.maxQueryDepth) {
    throw new Error(
      `Query depth (${depth}) exceeds maximum allowed (${config.maxQueryDepth})`,
    );
  }

  if (complexity > config.maxQueryComplexity) {
    throw new Error(
      `Query complexity (${complexity}) exceeds maximum allowed (${config.maxQueryComplexity})`,
    );
  }
}

/**
 * Calculate the depth of a GraphQL query
 */
function calculateQueryDepth(query: string): number {
  let depth = 0;
  let maxDepth = 0;
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < query.length; i++) {
    const char = query[i];
    const prevChar = query[i - 1];

    // Handle string literals
    if ((char === '"' || char === "'") && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = '';
      }
      continue;
    }

    if (inString) continue;

    if (char === '{') {
      depth++;
      maxDepth = Math.max(maxDepth, depth);
    } else if (char === '}') {
      depth--;
    }
  }

  return maxDepth;
}

/**
 * Estimate query complexity based on field count and nesting
 */
function estimateQueryComplexity(query: string): number {
  // Simple heuristic: count fields and apply multipliers for nesting
  const fieldMatches = query.match(/\w+(?=\s*[({])/g) || [];
  const baseComplexity = fieldMatches.length;
  const nestingMultiplier = calculateQueryDepth(query);

  return baseComplexity * (1 + nestingMultiplier * 0.5);
}

/**
 * Rate limiting based on query complexity
 */
export class QueryComplexityLimiter {
  private requestCounts = new Map<
    string,
    { count: number; resetTime: number }
  >();
  private readonly windowMs = 60000; // 1 minute window
  private readonly maxRequestsPerWindow = 100;

  public checkRateLimit(clientId: string, complexity: number): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get current count for client
    let clientData = this.requestCounts.get(clientId);

    if (!clientData || clientData.resetTime < windowStart) {
      clientData = { count: 0, resetTime: now + this.windowMs };
      this.requestCounts.set(clientId, clientData);
    }

    // Apply complexity weighting
    const weightedRequest = Math.ceil(complexity / 10);
    clientData.count += weightedRequest;

    if (clientData.count > this.maxRequestsPerWindow) {
      throw new Error(
        `Rate limit exceeded: ${clientData.count}/${this.maxRequestsPerWindow} complexity-weighted requests per minute`,
      );
    }
  }

  public cleanup(): void {
    const now = Date.now();
    for (const [clientId, data] of this.requestCounts.entries()) {
      if (data.resetTime < now) {
        this.requestCounts.delete(clientId);
      }
    }
  }
}

// Global instance for rate limiting
export const queryComplexityLimiter = new QueryComplexityLimiter();

// Cleanup expired rate limit entries every 5 minutes
setInterval(
  () => {
    queryComplexityLimiter.cleanup();
  },
  5 * 60 * 1000,
);
