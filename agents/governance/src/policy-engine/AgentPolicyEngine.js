/**
 * Agent Policy Engine - OPA-based policy evaluation for AI agent fleets
 *
 * Provides misuse-aware orchestration with real-time policy evaluation,
 * caching, and integration with IC FY28 compliance requirements.
 */
import crypto from 'node:crypto';
const DEFAULT_CONFIG = {
    opaBaseUrl: process.env.OPA_BASE_URL || 'http://localhost:8181',
    cacheEnabled: true,
    cacheTtlMs: 60_000, // 1 minute for allow decisions
    denyTtlMs: 300_000, // 5 minutes for deny decisions
    timeoutMs: 5000,
    retryAttempts: 3,
    retryBackoffMs: 500,
    failSafe: 'deny',
    metricsEnabled: true,
    federalMode: process.env.FEDERAL_MODE === 'true',
};
// ============================================================================
// Policy Paths
// ============================================================================
const POLICY_PATHS = {
    agentAction: 'agents/governance/action',
    agentMisuse: 'agents/governance/misuse',
    agentChain: 'agents/governance/chain',
    agentProvenance: 'agents/governance/provenance',
    tenantIsolation: 'agents/governance/tenant_isolation',
    dataClassification: 'agents/governance/data_classification',
    rateLimit: 'agents/governance/rate_limit',
    icfy28Compliance: 'agents/governance/icfy28',
};
export class AgentPolicyEngine {
    config;
    cache;
    metrics;
    eventListeners;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.cache = new Map();
        this.eventListeners = [];
        this.metrics = {
            evaluationsTotal: 0,
            evaluationsAllowed: 0,
            evaluationsDenied: 0,
            evaluationsFailed: 0,
            cacheHits: 0,
            cacheMisses: 0,
            averageLatencyMs: 0,
            latencyHistogram: [],
        };
        // Start cache cleanup interval
        if (this.config.cacheEnabled) {
            setInterval(() => this.cleanupCache(), 60_000);
        }
    }
    /**
     * Evaluate policy for an agent action
     */
    async evaluateAction(context) {
        return this.evaluatePolicy(POLICY_PATHS.agentAction, context);
    }
    /**
     * Evaluate misuse detection policy
     */
    async evaluateMisuse(context) {
        return this.evaluatePolicy(POLICY_PATHS.agentMisuse, context);
    }
    /**
     * Evaluate prompt chain execution policy
     */
    async evaluateChain(context, chainMetadata) {
        const enrichedContext = {
            ...context,
            resourceAttributes: {
                ...context.resourceAttributes,
                chainId: chainMetadata.chainId,
                stepCount: chainMetadata.stepCount,
                totalCost: chainMetadata.totalCost,
            },
        };
        return this.evaluatePolicy(POLICY_PATHS.agentChain, enrichedContext);
    }
    /**
     * Evaluate provenance requirements
     */
    async evaluateProvenance(context, provenanceInfo) {
        const enrichedContext = {
            ...context,
            resourceAttributes: {
                ...context.resourceAttributes,
                provenance: provenanceInfo,
            },
        };
        return this.evaluatePolicy(POLICY_PATHS.agentProvenance, enrichedContext);
    }
    /**
     * Evaluate IC FY28 compliance
     */
    async evaluateICFY28Compliance(context) {
        return this.evaluatePolicy(POLICY_PATHS.icfy28Compliance, context);
    }
    /**
     * Core policy evaluation with caching, retries, and fail-safe
     */
    async evaluatePolicy(policyPath, context) {
        const startTime = Date.now();
        this.metrics.evaluationsTotal++;
        try {
            // Check cache first
            if (this.config.cacheEnabled) {
                const cached = this.checkCache(policyPath, context);
                if (cached) {
                    this.metrics.cacheHits++;
                    return cached;
                }
                this.metrics.cacheMisses++;
            }
            // Build OPA input
            const opaInput = this.buildOpaInput(context);
            // Call OPA with retries
            const decision = await this.callOpaWithRetry(policyPath, opaInput);
            // Cache the decision
            if (this.config.cacheEnabled) {
                this.cacheDecision(policyPath, context, decision);
            }
            // Update metrics
            this.updateMetrics(decision, startTime);
            // Emit governance event
            this.emitEvent({
                id: crypto.randomUUID(),
                timestamp: new Date(),
                type: decision.allow ? 'policy_evaluation' : 'policy_violation',
                source: 'AgentPolicyEngine',
                agentId: context.agentId,
                fleetId: context.fleetId,
                sessionId: context.sessionId,
                actor: context.userContext.userId,
                action: context.requestedAction,
                resource: context.targetResource,
                outcome: decision.allow ? 'success' : 'failure',
                classification: context.classification,
                details: {
                    policyPath,
                    reason: decision.reason,
                    conditions: decision.conditions,
                },
            });
            return decision;
        }
        catch (error) {
            this.metrics.evaluationsFailed++;
            console.error(`Policy evaluation failed for ${policyPath}:`, error);
            // Return fail-safe decision
            return this.getFailSafeDecision(policyPath, context, error);
        }
    }
    /**
     * Build OPA input from context
     */
    buildOpaInput(context) {
        return {
            input: {
                agent: {
                    id: context.agentId,
                    fleetId: context.fleetId,
                    sessionId: context.sessionId,
                    trustLevel: context.trustLevel,
                    classification: context.classification,
                    capabilities: context.capabilities,
                },
                action: context.requestedAction,
                resource: {
                    type: context.targetResource,
                    attributes: context.resourceAttributes || {},
                },
                user: {
                    id: context.userContext.userId,
                    roles: context.userContext.roles,
                    clearance: context.userContext.clearance,
                    organization: context.userContext.organization,
                },
                environment: {
                    timestamp: context.environmentContext.timestamp,
                    ipAddress: context.environmentContext.ipAddress,
                    airgapped: context.environmentContext.airgapped,
                    federalEnvironment: context.environmentContext.federalEnvironment,
                    slsaLevel: context.environmentContext.slsaLevel,
                },
                policyVersion: process.env.OPA_POLICY_VERSION || '2025.11',
            },
        };
    }
    /**
     * Call OPA with retry logic
     */
    async callOpaWithRetry(policyPath, input) {
        let lastError = null;
        for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
            try {
                return await this.callOpa(policyPath, input);
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (attempt < this.config.retryAttempts - 1) {
                    const backoff = this.config.retryBackoffMs * Math.pow(2, attempt);
                    await this.sleep(backoff);
                }
            }
        }
        throw lastError || new Error('Policy evaluation failed after retries');
    }
    /**
     * Make OPA API call
     */
    async callOpa(policyPath, input) {
        const url = `${this.config.opaBaseUrl}/v1/data/${policyPath}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Request-ID': crypto.randomUUID(),
                },
                body: JSON.stringify(input),
                signal: controller.signal,
            });
            if (!response.ok) {
                throw new Error(`OPA returned status ${response.status}`);
            }
            const data = await response.json();
            return this.parseOpaResponse(data);
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    /**
     * Parse OPA response into PolicyDecision
     */
    parseOpaResponse(opaResponse) {
        const result = opaResponse?.result || {};
        const conditions = [];
        const mitigations = [];
        // Parse conditions
        if (Array.isArray(result.conditions)) {
            for (const cond of result.conditions) {
                conditions.push({
                    type: cond.type || 'capability_restricted',
                    parameters: cond.parameters || {},
                    enforced: cond.enforced ?? true,
                });
            }
        }
        // Parse mitigations
        if (Array.isArray(result.mitigations)) {
            for (const mit of result.mitigations) {
                mitigations.push({
                    action: mit.action || 'block',
                    severity: mit.severity || 'medium',
                    description: mit.description || 'Policy mitigation required',
                    automated: mit.automated ?? false,
                });
            }
        }
        return {
            allow: Boolean(result.allow),
            reason: String(result.reason || 'No reason provided'),
            policyPath: String(result.policy_path || ''),
            conditions: conditions.length > 0 ? conditions : undefined,
            requiredApprovals: Array.isArray(result.required_approvals)
                ? result.required_approvals
                : undefined,
            auditLevel: this.parseAuditLevel(result.audit_level),
            mitigations: mitigations.length > 0 ? mitigations : undefined,
            expiresAt: result.expires_at ? new Date(result.expires_at) : undefined,
        };
    }
    /**
     * Parse audit level from OPA response
     */
    parseAuditLevel(level) {
        const validLevels = ['info', 'warn', 'alert', 'critical'];
        if (typeof level === 'string' && validLevels.includes(level)) {
            return level;
        }
        return 'info';
    }
    /**
     * Get fail-safe decision when OPA is unavailable
     */
    getFailSafeDecision(policyPath, context, error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (this.config.failSafe === 'deny') {
            return {
                allow: false,
                reason: `Policy evaluation failed (fail-safe deny): ${errorMessage}`,
                policyPath,
                auditLevel: 'critical',
                mitigations: [
                    {
                        action: 'block',
                        severity: 'high',
                        description: 'Policy engine unavailable - blocking by default',
                        automated: true,
                    },
                ],
            };
        }
        // Fail-open only for read-only operations with basic trust
        const isReadOnly = ['read', 'analyze', 'query', 'list', 'get'].some((op) => context.requestedAction.toLowerCase().includes(op));
        const isBasicTrust = ['basic', 'untrusted'].includes(context.trustLevel);
        if (isReadOnly && !isBasicTrust) {
            return {
                allow: true,
                reason: `Policy evaluation failed (fail-safe allow for read-only): ${errorMessage}`,
                policyPath,
                auditLevel: 'alert',
                conditions: [
                    {
                        type: 'audit_enhanced',
                        parameters: { reason: 'fail-safe allow', error: errorMessage },
                        enforced: true,
                    },
                ],
            };
        }
        return {
            allow: false,
            reason: `Policy evaluation failed: ${errorMessage}`,
            policyPath,
            auditLevel: 'critical',
        };
    }
    /**
     * Generate cache key for policy decision
     */
    generateCacheKey(policyPath, context) {
        const keyData = {
            policy: policyPath,
            agent: context.agentId,
            fleet: context.fleetId,
            action: context.requestedAction,
            resource: context.targetResource,
            trust: context.trustLevel,
            classification: context.classification,
            user: context.userContext.userId,
        };
        return crypto.createHash('sha256').update(JSON.stringify(keyData)).digest('hex');
    }
    /**
     * Check cache for existing decision
     */
    checkCache(policyPath, context) {
        const cacheKey = this.generateCacheKey(policyPath, context);
        const cached = this.cache.get(cacheKey);
        if (cached && cached.expiry > Date.now()) {
            return cached.decision;
        }
        if (cached) {
            this.cache.delete(cacheKey);
        }
        return null;
    }
    /**
     * Cache policy decision
     */
    cacheDecision(policyPath, context, decision) {
        const cacheKey = this.generateCacheKey(policyPath, context);
        const ttl = decision.allow ? this.config.cacheTtlMs : this.config.denyTtlMs;
        this.cache.set(cacheKey, {
            decision,
            expiry: Date.now() + ttl,
        });
    }
    /**
     * Cleanup expired cache entries
     */
    cleanupCache() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (entry.expiry <= now) {
                this.cache.delete(key);
            }
        }
    }
    /**
     * Update metrics after policy evaluation
     */
    updateMetrics(decision, startTime) {
        const latency = Date.now() - startTime;
        if (decision.allow) {
            this.metrics.evaluationsAllowed++;
        }
        else {
            this.metrics.evaluationsDenied++;
        }
        // Update average latency
        const totalLatency = this.metrics.averageLatencyMs * (this.metrics.evaluationsTotal - 1) + latency;
        this.metrics.averageLatencyMs = totalLatency / this.metrics.evaluationsTotal;
        // Update histogram
        this.metrics.latencyHistogram.push(latency);
        if (this.metrics.latencyHistogram.length > 1000) {
            this.metrics.latencyHistogram.shift();
        }
    }
    /**
     * Add event listener for governance events
     */
    onEvent(listener) {
        this.eventListeners.push(listener);
    }
    /**
     * Emit governance event to all listeners
     */
    emitEvent(event) {
        for (const listener of this.eventListeners) {
            try {
                listener(event);
            }
            catch (error) {
                console.error('Event listener error:', error);
            }
        }
    }
    /**
     * Get current metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }
    /**
     * Check if a trust level meets minimum requirement
     */
    static checkTrustLevel(actual, required) {
        const levels = ['untrusted', 'basic', 'elevated', 'privileged', 'sovereign'];
        return levels.indexOf(actual) >= levels.indexOf(required);
    }
    /**
     * Check if a classification level meets minimum requirement
     */
    static checkClassification(actual, required) {
        const levels = [
            'UNCLASSIFIED',
            'CUI',
            'CONFIDENTIAL',
            'SECRET',
            'TOP_SECRET',
            'SCI',
            'SAP',
        ];
        return levels.indexOf(actual) >= levels.indexOf(required);
    }
    /**
     * Helper to sleep for a duration
     */
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
// ============================================================================
// Singleton Export
// ============================================================================
export const agentPolicyEngine = new AgentPolicyEngine();
//# sourceMappingURL=AgentPolicyEngine.js.map