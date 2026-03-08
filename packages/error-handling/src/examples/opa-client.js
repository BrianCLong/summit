"use strict";
/**
 * Example: OPA Policy Engine Client with Resilience Patterns
 *
 * This demonstrates how to integrate circuit breaker, retry, and timeout
 * patterns for external service calls (OPA policy engine)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPAClient = void 0;
exports.createOPAClient = createOPAClient;
const pino_1 = __importDefault(require("pino"));
const resilience_js_1 = require("../resilience.js");
const errors_js_1 = require("../errors.js");
const logger = (0, pino_1.default)({ name: 'OPAClient' });
/**
 * OPA Client with resilience patterns
 */
class OPAClient {
    baseUrl;
    policy;
    constructor(baseUrl, policy = 'authz/allow') {
        this.baseUrl = baseUrl;
        this.policy = policy;
    }
    /**
     * Make policy decision with full resilience patterns
     */
    async decide(input) {
        return (0, resilience_js_1.executeWithResilience)({
            serviceName: 'opa',
            operation: 'decide',
            fn: () => this.makeRequest(input),
            retryPolicy: resilience_js_1.RetryPolicies.externalService,
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
    async decideWithFallback(input) {
        const fallbackDecision = {
            allow: false,
            reason: 'Policy engine unavailable - failing closed',
        };
        return (0, resilience_js_1.withGracefulDegradation)(() => this.decide(input), fallbackDecision, {
            serviceName: 'opa',
            operation: 'decideWithFallback',
        });
    }
    /**
     * Internal request method
     */
    async makeRequest(input) {
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
                throw new errors_js_1.ExternalServiceError('OPA_ERROR', 'opa', `OPA request failed: ${response.status} ${response.statusText}`, {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText,
                });
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
        }
        catch (error) {
            if (error instanceof errors_js_1.ExternalServiceError) {
                throw error;
            }
            // Network or parsing errors
            throw new errors_js_1.ExternalServiceError('OPA_ERROR', 'opa', `OPA request failed: ${error.message}`, undefined, error);
        }
    }
    /**
     * Authorize user action (throws on deny)
     */
    async authorize(input) {
        const decision = await this.decide(input);
        if (!decision.allow) {
            throw new errors_js_1.AuthorizationError('POLICY_VIOLATION', decision.reason || 'Access denied by policy', {
                user: input.user.id,
                resource: input.resource,
                action: input.action,
            });
        }
        logger.debug({
            user: input.user.id,
            resource: input.resource,
            action: input.action,
        }, 'Authorization granted');
    }
}
exports.OPAClient = OPAClient;
/**
 * Create OPA client instance
 */
function createOPAClient(baseUrl = process.env.OPA_URL || 'http://localhost:8181', policy) {
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
