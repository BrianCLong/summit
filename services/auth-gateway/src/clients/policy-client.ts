/**
 * Policy Client
 *
 * Client for communicating with the policy-enforcer service
 * Performs authorization checks using OPA policies
 */

import type { AuthContext } from '../auth/context-enricher.js';

export interface PolicyClientConfig {
  policyEnforcerUrl: string;
  timeout?: number;
}

export interface AuthorizationRequest {
  subject: AuthContext;
  resource: string;
  action: string;
  context: Record<string, any>;
}

export interface AuthorizationDecision {
  allowed: boolean;
  reason?: string;
  obligations?: string[];
  metadata?: Record<string, any>;
}

export class PolicyClient {
  private config: PolicyClientConfig;

  constructor(config: PolicyClientConfig) {
    this.config = {
      timeout: 5000,
      ...config
    };
  }

  /**
   * Check if an action is authorized by policy
   */
  async authorize(request: AuthorizationRequest): Promise<AuthorizationDecision> {
    try {
      const response = await fetch(`${this.config.policyEnforcerUrl}/v1/authorize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: {
            subject: {
              identity: request.subject.identity,
              tenant: request.subject.tenant,
              attributes: request.subject.attributes
            },
            resource: request.resource,
            action: request.action,
            context: request.context
          }
        }),
        signal: AbortSignal.timeout(this.config.timeout!)
      });

      if (!response.ok) {
        throw new Error(`Policy enforcer returned ${response.status}`);
      }

      const result = await response.json();

      return {
        allowed: result.result?.allow || false,
        reason: result.result?.reason,
        obligations: result.result?.obligations,
        metadata: result.result?.metadata
      };
    } catch (error) {
      console.error('Authorization check failed', error);

      // Fail closed - deny by default on error
      return {
        allowed: false,
        reason: 'Authorization service unavailable'
      };
    }
  }

  /**
   * Batch authorization check for multiple resources
   */
  async authorizeMany(
    requests: Omit<AuthorizationRequest, 'subject'>[]
  ): Promise<AuthorizationDecision[]> {
    // For simplicity, call authorize sequentially
    // In production, implement true batch API
    const decisions: AuthorizationDecision[] = [];

    for (const req of requests) {
      const decision = await this.authorize(req as AuthorizationRequest);
      decisions.push(decision);
    }

    return decisions;
  }

  /**
   * Query policy for data filtering
   * Returns a filter expression that can be applied to data queries
   */
  async getDataFilter(
    subject: AuthContext,
    resource: string
  ): Promise<Record<string, any> | null> {
    try {
      const response = await fetch(`${this.config.policyEnforcerUrl}/v1/data-filter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: {
            subject: {
              identity: subject.identity,
              tenant: subject.tenant,
              attributes: subject.attributes
            },
            resource
          }
        }),
        signal: AbortSignal.timeout(this.config.timeout!)
      });

      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      return result.result?.filter || null;
    } catch (error) {
      console.error('Data filter query failed', error);
      return null;
    }
  }
}
