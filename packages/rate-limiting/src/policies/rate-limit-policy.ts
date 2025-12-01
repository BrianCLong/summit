/**
 * Rate Limit Policy Manager
 *
 * Manages different rate limit policies for different clients and routes
 */

import { RateLimiter, RateLimitConfig } from '../rate-limiter.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('rate-limit-policy');

export interface PolicyConfig extends RateLimitConfig {
  name: string;
  description?: string;
}

export interface ClientPolicy {
  clientId: string;
  policyName: string;
  customLimits?: Partial<RateLimitConfig>;
}

export class RateLimitPolicyManager {
  private policies = new Map<string, PolicyConfig>();
  private clientPolicies = new Map<string, ClientPolicy>();
  private routePolicies = new Map<string, string>();

  definePolicyPurchase(policy: PolicyConfig): void {
    this.policies.set(policy.name, policy);
    logger.info('Policy defined', { name: policy.name });
  }

  assignClientPolicy(clientId: string, policyName: string, customLimits?: Partial<RateLimitConfig>): void {
    if (!this.policies.has(policyName)) {
      throw new Error(`Policy ${policyName} not found`);
    }

    this.clientPolicies.set(clientId, {
      clientId,
      policyName,
      customLimits,
    });

    logger.info('Client policy assigned', { clientId, policyName });
  }

  assignRoutePolicy(route: string, policyName: string): void {
    if (!this.policies.has(policyName)) {
      throw new Error(`Policy ${policyName} not found`);
    }

    this.routePolicies.set(route, policyName);
    logger.info('Route policy assigned', { route, policyName });
  }

  getClientConfig(clientId: string): RateLimitConfig | null {
    const clientPolicy = this.clientPolicies.get(clientId);

    if (!clientPolicy) {
      return null;
    }

    const policy = this.policies.get(clientPolicy.policyName);

    if (!policy) {
      return null;
    }

    return {
      ...policy,
      ...clientPolicy.customLimits,
    };
  }

  getRouteConfig(route: string): RateLimitConfig | null {
    const policyName = this.routePolicies.get(route);

    if (!policyName) {
      return null;
    }

    return this.policies.get(policyName) || null;
  }

  getPolicyConfig(policyName: string): PolicyConfig | null {
    return this.policies.get(policyName) || null;
  }

  // Predefined policies for intelligence operations
  initializeDefaultPolicies(): void {
    this.definePolicy({
      name: 'free',
      description: 'Free tier - 100 requests per hour',
      windowMs: 60 * 60 * 1000,
      maxRequests: 100,
    });

    this.definePolicy({
      name: 'basic',
      description: 'Basic tier - 1000 requests per hour',
      windowMs: 60 * 60 * 1000,
      maxRequests: 1000,
    });

    this.definePolicy({
      name: 'professional',
      description: 'Professional tier - 10000 requests per hour',
      windowMs: 60 * 60 * 1000,
      maxRequests: 10000,
    });

    this.definePolicy({
      name: 'enterprise',
      description: 'Enterprise tier - 100000 requests per hour',
      windowMs: 60 * 60 * 1000,
      maxRequests: 100000,
    });

    this.definePolicy({
      name: 'unlimited',
      description: 'Unlimited - for internal services',
      windowMs: 60 * 60 * 1000,
      maxRequests: Number.MAX_SAFE_INTEGER,
    });

    logger.info('Default policies initialized');
  }

  private definePolicy(policy: PolicyConfig): void {
    this.policies.set(policy.name, policy);
  }
}
