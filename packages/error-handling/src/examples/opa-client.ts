/**
 * Example: OPA Policy Engine Client with Resilience Patterns
 *
 * This demonstrates how to integrate circuit breaker, retry, and timeout
 * patterns for external service calls (OPA policy engine)
 */

import pino from 'pino';
import {
  executeWithResilience,
  RetryPolicies,
  withGracefulDegradation,
} from '../resilience.js';
import {
  ExternalServiceError,
  AuthorizationError,
} from '../errors.js';

const logger = pino({ name: 'OPAClient' });

interface OPADecision {
  allow: boolean;
  fields?: string[];
  reason?: string;
}

interface OPAInput {
  user: {
    id: string;
    roles: string[];
  };
  resource: {
    type: string;
    id?: string;
  };
  action: string;
}

/**
 * OPA Client with resilience patterns
 */
export class OPAClient {
  constructor(
    private baseUrl: string,
    private policy: string = 'authz/allow',
  ) {}

  /**
   * Make policy decision with full resilience patterns
   */
  async decide(input: OPAInput): Promise<OPADecision> {
    return executeWithResilience({
      serviceName: 'opa',
      operation: 'decide',
      fn: () => this.makeRequest(input),
      retryPolicy: RetryPolicies.externalService,
      timeoutMs: 5000, // 5 second timeout for policy decisions
      circuitBreakerConfig: {
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 15000, // 15 seconds before retry
        monitoringPeriod: 30000,
      },
    });
  }

  /**
   * Make policy decision with graceful degradation
   * Falls back to denying access if OPA is unavailable
   */
  async decideWithFallback(input: OPAInput): Promise<OPADecision> {
    const fallbackDecision: OPADecision = {
      allow: false,
      reason: 'Policy engine unavailable - failing closed',
    };

    return withGracefulDegradation(
      () => this.decide(input),
      fallbackDecision,
      {
        serviceName: 'opa',
        operation: 'decideWithFallback',
      },
    );
  }

  /**
   * Internal request method
   */
  private async makeRequest(input: OPAInput): Promise<OPADecision> {
    const url = `${this.baseUrl}/v1/data/${this.policy}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');

        throw new ExternalServiceError(
          'OPA_ERROR',
          'opa',
          `OPA request failed: ${response.status} ${response.statusText}`,
          {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
          },
        );
      }

      const data = await response.json();

      // Handle OPA response format
      if (!data.result) {
        return {
          allow: false,
          reason: 'No decision from policy engine',
        };
      }

      return {
        allow: data.result.allow || false,
        fields: data.result.fields,
        reason: data.result.reason,
      };
    } catch (error: any) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }

      // Network or parsing errors
      throw new ExternalServiceError(
        'OPA_ERROR',
        'opa',
        `OPA request failed: ${error.message}`,
        undefined,
        error,
      );
    }
  }

  /**
   * Authorize user action (throws on deny)
   */
  async authorize(input: OPAInput): Promise<void> {
    const decision = await this.decide(input);

    if (!decision.allow) {
      throw new AuthorizationError(
        'POLICY_VIOLATION',
        decision.reason || 'Access denied by policy',
        {
          user: input.user.id,
          resource: input.resource,
          action: input.action,
        },
      );
    }

    logger.debug(
      {
        user: input.user.id,
        resource: input.resource,
        action: input.action,
      },
      'Authorization granted',
    );
  }
}

/**
 * Create OPA client instance
 */
export function createOPAClient(
  baseUrl: string = process.env.OPA_URL || 'http://localhost:8181',
  policy?: string,
): OPAClient {
  return new OPAClient(baseUrl, policy);
}

/**
 * Example usage in GraphQL resolver:
 *
 * import { createOPAClient } from '@intelgraph/error-handling/examples/opa-client';
 *
 * const opaClient = createOPAClient();
 *
 * const resolvers = {
 *   Query: {
 *     entity: async (parent, { id }, context) => {
 *       // Authorize with resilience patterns
 *       await opaClient.authorize({
 *         user: {
 *           id: context.user.id,
 *           roles: context.user.roles,
 *         },
 *         resource: {
 *           type: 'entity',
 *           id,
 *         },
 *         action: 'read',
 *       });
 *
 *       return entityService.findById(id);
 *     },
 *   },
 * };
 */
