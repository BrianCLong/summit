"use strict";
/**
 * OPA (Open Policy Agent) Integration
 *
 * Integrates the authority compiler with OPA for complex policy evaluation.
 * Supports both embedded and remote OPA evaluation modes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPAClient = void 0;
exports.buildOPAInput = buildOPAInput;
exports.opaOutputToDecision = opaOutputToDecision;
exports.generateRegoPolicy = generateRegoPolicy;
// -----------------------------------------------------------------------------
// OPA Client
// -----------------------------------------------------------------------------
/**
 * Client for OPA policy evaluation
 */
class OPAClient {
    config;
    cache = new Map();
    constructor(config) {
        this.config = {
            timeoutMs: 5000,
            enableCache: true,
            cacheTTL: 60,
            retry: { maxRetries: 3, backoffMs: 100 },
            ...config,
        };
    }
    /**
     * Evaluate a policy decision
     */
    async evaluate(input) {
        // Check cache
        if (this.config.enableCache) {
            const cached = this.getCached(input);
            if (cached) {
                return cached;
            }
        }
        // Evaluate policy
        const result = this.config.mode === 'remote'
            ? await this.evaluateRemote(input)
            : await this.evaluateEmbedded(input);
        // Cache result
        if (this.config.enableCache) {
            this.setCached(input, result);
        }
        return result;
    }
    /**
     * Evaluate policy against remote OPA server
     */
    async evaluateRemote(input) {
        if (!this.config.endpoint) {
            throw new Error('OPA endpoint not configured for remote mode');
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
        try {
            const response = await this.fetchWithRetry(`${this.config.endpoint}/v1/data/summit/authz/allow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ input }),
                signal: controller.signal,
            });
            const data = await response.json();
            return this.parseOPAResponse(data);
        }
        finally {
            clearTimeout(timeout);
        }
    }
    /**
     * Evaluate policy using embedded OPA (WASM)
     */
    async evaluateEmbedded(input) {
        // In production, this would use @open-policy-agent/opa-wasm
        // For now, return a stub that delegates to the local evaluator
        throw new Error('Embedded OPA not yet implemented - use remote mode');
    }
    /**
     * Fetch with retry logic
     */
    async fetchWithRetry(url, options, attempt = 0) {
        try {
            const response = await fetch(url, options);
            if (!response.ok && response.status >= 500 && attempt < this.config.retry.maxRetries) {
                await this.sleep(this.config.retry.backoffMs * Math.pow(2, attempt));
                return this.fetchWithRetry(url, options, attempt + 1);
            }
            return response;
        }
        catch (error) {
            if (attempt < this.config.retry.maxRetries) {
                await this.sleep(this.config.retry.backoffMs * Math.pow(2, attempt));
                return this.fetchWithRetry(url, options, attempt + 1);
            }
            throw error;
        }
    }
    /**
     * Parse OPA response into standard format
     */
    parseOPAResponse(data) {
        const result = data.result;
        if (typeof result === 'boolean') {
            return { allow: result };
        }
        return {
            allow: result?.allow ?? false,
            reason: result?.reason,
            conditions: result?.conditions,
            requiresTwoPersonControl: result?.requires_two_person_control,
            twoPersonControlId: result?.two_person_control_id,
            redactedFields: result?.redacted_fields,
            maxResults: result?.max_results,
            authorityId: result?.authority_id,
            audit: result?.audit,
        };
    }
    /**
     * Get cached decision
     */
    getCached(input) {
        const key = this.cacheKey(input);
        const cached = this.cache.get(key);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.decision;
        }
        if (cached) {
            this.cache.delete(key);
        }
        return null;
    }
    /**
     * Cache a decision
     */
    setCached(input, decision) {
        const key = this.cacheKey(input);
        this.cache.set(key, {
            decision,
            expiresAt: Date.now() + (this.config.cacheTTL * 1000),
        });
    }
    /**
     * Generate cache key from input
     */
    cacheKey(input) {
        return JSON.stringify({
            subject: input.subject.id,
            roles: input.subject.roles.sort(),
            action: input.action.operation,
            resource: input.resource.type,
            resourceId: input.resource.id,
        });
    }
    /**
     * Sleep helper
     */
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Clear the cache
     */
    clearCache() {
        this.cache.clear();
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            hitRate: 0, // Would need to track hits/misses
        };
    }
}
exports.OPAClient = OPAClient;
// -----------------------------------------------------------------------------
// OPA Policy Builder
// -----------------------------------------------------------------------------
/**
 * Build OPA input from evaluation context
 */
function buildOPAInput(context) {
    return {
        subject: {
            id: context.user.id,
            roles: context.user.roles,
            groups: context.user.groups,
            tenantId: context.user.tenantId,
            clearance: context.user.clearance,
            compartments: context.user.compartments,
        },
        action: {
            operation: context.operation,
        },
        resource: {
            type: context.resource.entityType,
            id: context.resource.entityId,
            classification: context.resource.classification,
            compartments: context.resource.compartments,
            licenses: context.resource.licenses,
            investigationId: context.resource.investigationId,
        },
        context: {
            timestamp: context.request.timestamp.toISOString(),
            ip: context.request.ip,
            userAgent: context.request.userAgent,
            justification: context.request.justification,
            mfaVerified: context.request.mfaVerified,
        },
    };
}
/**
 * Convert OPA output to policy decision
 */
function opaOutputToDecision(output, auditId) {
    return {
        allowed: output.allow,
        authorityId: output.authorityId,
        reason: output.reason || (output.allow ? 'Access granted' : 'Access denied'),
        conditions: output.conditions,
        requiresTwoPersonControl: output.requiresTwoPersonControl || false,
        twoPersonControlId: output.twoPersonControlId,
        redactedFields: output.redactedFields,
        maxResults: output.maxResults,
        auditId,
    };
}
// -----------------------------------------------------------------------------
// Rego Policy Templates
// -----------------------------------------------------------------------------
/**
 * Generate Rego policy from policy bundle
 */
function generateRegoPolicy(bundle) {
    const lines = [
        '# Auto-generated from Summit Policy Bundle',
        `# Bundle: ${bundle.name} v${bundle.version}`,
        `# Generated: ${new Date().toISOString()}`,
        '',
        'package summit.authz',
        '',
        'import future.keywords.if',
        'import future.keywords.in',
        '',
        'default allow := false',
        '',
    ];
    // Generate rules for each authority
    for (const authority of bundle.authorities) {
        lines.push(`# Authority: ${authority.name}`);
        lines.push(`allow if {`);
        lines.push(`  authority_${authority.id.replace(/-/g, '_')}`);
        lines.push(`}`);
        lines.push('');
        lines.push(`authority_${authority.id.replace(/-/g, '_')} if {`);
        // Subject matching
        if (authority.subjects.roles?.length) {
            lines.push(`  # Role check`);
            lines.push(`  some role in input.subject.roles`);
            lines.push(`  role in ${JSON.stringify(authority.subjects.roles)}`);
        }
        // Permission matching
        lines.push(`  # Permission check`);
        lines.push(`  input.action.operation in ${JSON.stringify(authority.permissions)}`);
        // Resource matching
        if (authority.resources.entityTypes?.length) {
            lines.push(`  # Entity type check`);
            lines.push(`  input.resource.type in ${JSON.stringify(authority.resources.entityTypes)}`);
        }
        if (authority.resources.classifications?.length) {
            lines.push(`  # Classification check`);
            lines.push(`  input.resource.classification in ${JSON.stringify(authority.resources.classifications)}`);
        }
        lines.push(`}`);
        lines.push('');
    }
    // Add helper rules
    lines.push('# Helper: Get matched authority ID');
    lines.push('authority_id := id if {');
    lines.push('  some authority in data.authorities');
    lines.push('  allow');
    lines.push('  id := authority.id');
    lines.push('}');
    lines.push('');
    // Add reason generation
    lines.push('# Helper: Generate denial reason');
    lines.push('reason := msg if {');
    lines.push('  not allow');
    lines.push('  msg := "No matching authority found"');
    lines.push('}');
    return lines.join('\n');
}
exports.default = OPAClient;
