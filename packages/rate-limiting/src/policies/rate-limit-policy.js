"use strict";
/**
 * Rate Limit Policy Manager
 *
 * Manages different rate limit policies for different clients and routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitPolicyManager = void 0;
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('rate-limit-policy');
class RateLimitPolicyManager {
    policies = new Map();
    clientPolicies = new Map();
    routePolicies = new Map();
    definePolicyPurchase(policy) {
        this.policies.set(policy.name, policy);
        logger.info('Policy defined', { name: policy.name });
    }
    assignClientPolicy(clientId, policyName, customLimits) {
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
    assignRoutePolicy(route, policyName) {
        if (!this.policies.has(policyName)) {
            throw new Error(`Policy ${policyName} not found`);
        }
        this.routePolicies.set(route, policyName);
        logger.info('Route policy assigned', { route, policyName });
    }
    getClientConfig(clientId) {
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
    getRouteConfig(route) {
        const policyName = this.routePolicies.get(route);
        if (!policyName) {
            return null;
        }
        return this.policies.get(policyName) || null;
    }
    getPolicyConfig(policyName) {
        return this.policies.get(policyName) || null;
    }
    // Predefined policies for intelligence operations
    initializeDefaultPolicies() {
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
    definePolicy(policy) {
        this.policies.set(policy.name, policy);
    }
}
exports.RateLimitPolicyManager = RateLimitPolicyManager;
