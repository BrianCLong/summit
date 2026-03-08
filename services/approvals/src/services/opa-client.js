"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.opaClient = exports.OPAClient = void 0;
const config_js_1 = require("../config.js");
const logger_js_1 = require("../utils/logger.js");
const log = logger_js_1.logger.child({ component: 'opa-client' });
// Cache for OPA decisions (short TTL)
const decisionCache = new Map();
const CACHE_TTL_MS = 5000; // 5 seconds
class OPAClient {
    baseUrl;
    timeout;
    failClosed;
    constructor() {
        this.baseUrl = config_js_1.config.opa.url;
        this.timeout = config_js_1.config.opa.timeout;
        this.failClosed = config_js_1.config.opa.failClosed;
    }
    /**
     * Evaluate whether an approval request should be created and what policy requirements apply
     */
    async evaluateApprovalRequest(input) {
        const cacheKey = this.getCacheKey('approval', input);
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            log.debug({ cacheKey }, 'OPA decision cache hit');
            return cached;
        }
        const opaInput = {
            input: {
                tenant_id: input.tenant_id,
                actor: input.actor,
                resource: input.resource,
                action: input.action,
                attributes: input.attributes,
                context: input.context,
                existing_decisions: input.existing_decisions || [],
                timestamp: new Date().toISOString(),
            },
        };
        try {
            const response = await this.query('/v1/data/intelgraph/approvals/evaluate_request', opaInput);
            const decision = response.result || this.getDefaultApprovalDecision();
            this.setCache(cacheKey, decision);
            log.info({
                tenant_id: input.tenant_id,
                action: input.action,
                resource_type: input.resource.type,
                decision: decision.allow ? 'allow' : decision.require_approval ? 'require_approval' : 'deny',
            }, 'OPA approval evaluation completed');
            return decision;
        }
        catch (error) {
            log.error({ error }, 'OPA evaluation failed');
            if (this.failClosed) {
                return {
                    allow: false,
                    require_approval: false,
                    required_approvals: 0,
                    allowed_approver_roles: [],
                    conditions: [],
                    violations: ['OPA service unavailable - fail closed'],
                    policy_version: 'unavailable',
                };
            }
            // Fail open - return default requiring approval
            return this.getDefaultApprovalDecision();
        }
    }
    /**
     * Evaluate whether an actor can submit a decision on an approval request
     */
    async evaluateDecision(input) {
        const opaInput = {
            input: {
                tenant_id: input.tenant_id,
                actor: input.actor,
                resource: input.resource,
                action: input.action,
                decision_type: input.decision_type,
                existing_decisions: input.existing_decisions,
                required_approvals: input.required_approvals,
                allowed_approver_roles: input.allowed_approver_roles,
                timestamp: new Date().toISOString(),
            },
        };
        try {
            const response = await this.query('/v1/data/intelgraph/approvals/evaluate_decision', opaInput);
            const result = response.result || {
                allow: false,
                violations: ['No policy result'],
                is_final: false,
                policy_version: 'unknown',
            };
            log.info({
                tenant_id: input.tenant_id,
                actor_id: input.actor.id,
                decision_type: input.decision_type,
                allowed: result.allow,
                is_final: result.is_final,
            }, 'OPA decision evaluation completed');
            return result;
        }
        catch (error) {
            log.error({ error }, 'OPA decision evaluation failed');
            if (this.failClosed) {
                return {
                    allow: false,
                    violations: ['OPA service unavailable - fail closed'],
                    is_final: false,
                    policy_version: 'unavailable',
                };
            }
            throw error;
        }
    }
    /**
     * Check if OPA service is healthy
     */
    async isHealthy() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            const response = await fetch(`${this.baseUrl}/health`, {
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            return response.ok;
        }
        catch {
            return false;
        }
    }
    /**
     * Get the current policy version
     */
    async getPolicyVersion() {
        try {
            const response = await this.query('/v1/data/intelgraph/approvals/policy_version', {});
            return response.result?.version || 'unknown';
        }
        catch {
            return 'unknown';
        }
    }
    async query(path, body) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        try {
            const response = await fetch(`${this.baseUrl}${path}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`OPA query failed: ${response.status} - ${text}`);
            }
            return response.json();
        }
        catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    getCacheKey(type, input) {
        const normalized = JSON.stringify(input, Object.keys(input).sort());
        return `${type}:${Buffer.from(normalized).toString('base64').substring(0, 64)}`;
    }
    getFromCache(key) {
        const entry = decisionCache.get(key);
        if (!entry)
            return null;
        if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
            decisionCache.delete(key);
            return null;
        }
        return entry.decision;
    }
    setCache(key, decision) {
        decisionCache.set(key, { decision, timestamp: Date.now() });
        // Cleanup old entries
        if (decisionCache.size > 1000) {
            const cutoff = Date.now() - CACHE_TTL_MS;
            for (const [k, v] of decisionCache) {
                if (v.timestamp < cutoff) {
                    decisionCache.delete(k);
                }
            }
        }
    }
    getDefaultApprovalDecision() {
        return {
            allow: false,
            require_approval: true,
            required_approvals: 2,
            allowed_approver_roles: ['admin', 'security-admin', 'team-lead'],
            conditions: [],
            violations: [],
            policy_version: 'default',
        };
    }
}
exports.OPAClient = OPAClient;
exports.opaClient = new OPAClient();
