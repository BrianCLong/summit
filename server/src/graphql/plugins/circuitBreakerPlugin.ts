import type { ApolloServerPlugin } from '@apollo/server';
import { GraphQLError } from 'graphql';
import pino from 'pino';

const logger = pino();

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  maxRequestsPerMinute?: number;
}

interface TenantState {
  failures: number;
  lastFailure: number;
  state: 'OPEN' | 'CLOSED' | 'HALF_OPEN';
  requestCount: number;
  lastRequestWindow: number;
}

const tenantStates = new Map<string, TenantState>();

export function createCircuitBreakerPlugin(options: CircuitBreakerOptions = {}): ApolloServerPlugin {
  const {
    failureThreshold = 10,
    resetTimeout = 30000,
    maxRequestsPerMinute = 1000,
  } = options;

  return {
    async requestDidStart(requestContext) {
      const tenantId = requestContext.request.http?.headers.get('x-tenant-id') || 'default';
      const now = Date.now();

      let state = tenantStates.get(tenantId);
      if (!state) {
        state = {
          failures: 0,
          lastFailure: 0,
          state: 'CLOSED',
          requestCount: 0,
          lastRequestWindow: now,
        };
        tenantStates.set(tenantId, state);
      }

      // Rate Limiting Logic
      if (now - state.lastRequestWindow > 60000) {
        state.requestCount = 0;
        state.lastRequestWindow = now;
      }
      state.requestCount++;
      if (state.requestCount > maxRequestsPerMinute) {
        throw new GraphQLError('Rate limit exceeded', {
           extensions: { code: 'RATE_LIMIT_EXCEEDED' },
        });
      }

      // Circuit Breaker Logic
      if (state.state === 'OPEN') {
        if (now - state.lastFailure > resetTimeout) {
          state.state = 'HALF_OPEN';
          logger.info({ tenantId }, 'Circuit Breaker: Half-Open');
        } else {
           throw new GraphQLError('Service unavailable (Circuit Breaker)', {
             extensions: { code: 'SERVICE_UNAVAILABLE' },
           });
        }
      }

      return {
        async didEncounterErrors(rc) {
           // We only care about system errors (5xx equivalents), not user errors (4xx)
           // But GraphQL errors are mixed. Let's assume network/db errors trigger this.
           const hasSystemError = rc.errors.some(e => e.extensions?.code === 'INTERNAL_SERVER_ERROR' || e.extensions?.code === 'DB_ERROR');

           if (hasSystemError) {
             state.failures++;
             state.lastFailure = Date.now();
             if (state.failures >= failureThreshold) {
               state.state = 'OPEN';
               logger.warn({ tenantId }, 'Circuit Breaker: OPENED');
             }
           }
        },
        async willSendResponse(rc) {
           if (state.state === 'HALF_OPEN' && !rc.errors) {
             state.state = 'CLOSED';
             state.failures = 0;
             logger.info({ tenantId }, 'Circuit Breaker: CLOSED');
           }
        }
      };
    }
  };
}
