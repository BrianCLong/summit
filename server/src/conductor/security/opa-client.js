"use strict";
// OPA (Open Policy Agent) Client for Conductor Security
// Provides RBAC, PII protection, and policy evaluation
Object.defineProperty(exports, "__esModule", { value: true });
exports.opaClient = exports.OPAClient = void 0;
exports.enforcePolicy = enforcePolicy;
const crypto_1 = require("crypto");
class OPAClient {
    baseUrl;
    timeout;
    constructor(baseUrl = 'http://localhost:8181', timeout = 5000) {
        this.baseUrl = baseUrl;
        this.timeout = timeout;
    }
    /**
     * Evaluate conductor security policy
     */
    async evaluatePolicy(input) {
        try {
            const response = await this.queryOPA('/v1/data/conductor/security', {
                input,
            });
            return {
                allow: response.result?.allow ?? false,
                warnings: response.result?.warnings ?? [],
                audit_required: response.result?.audit_required ?? false,
                estimated_cost: response.result?.estimated_cost,
                reason: response.result?.reason,
            };
        }
        catch (error) {
            console.error('OPA policy evaluation failed:', error);
            // Fail secure - deny by default if OPA is unavailable
            return {
                allow: false,
                warnings: ['Security policy service unavailable'],
                audit_required: true,
                reason: 'OPA service error',
            };
        }
    }
    /**
     * Check if user can conduct a task
     */
    async canConduct(context, task, expert, emergencyJustification) {
        const input = {
            user: {
                id: context.userId,
                roles: context.roles,
                permissions: context.permissions,
                clearance_level: context.clearanceLevel,
                budget_remaining: context.budgetRemaining,
                rate_limit: context.rateLimit,
                requests_last_hour: context.requestsLastHour,
                location: context.location,
            },
            action: 'conduct',
            task,
            expert,
            emergency_justification: emergencyJustification,
        };
        return this.evaluatePolicy(input);
    }
    /**
     * Check if user can preview routing
     */
    async canPreviewRouting(context, task) {
        const input = {
            user: {
                id: context.userId,
                roles: context.roles,
                permissions: context.permissions,
                clearance_level: context.clearanceLevel,
                budget_remaining: context.budgetRemaining,
                rate_limit: context.rateLimit,
                requests_last_hour: context.requestsLastHour,
                location: context.location,
            },
            action: 'preview_routing',
            task,
        };
        return this.evaluatePolicy(input);
    }
    /**
     * Detect PII in text using client-side patterns
     */
    detectPII(text) {
        const patterns = [
            // SSN patterns
            {
                name: 'SSN',
                regex: /\b\d{3}-\d{2}-\d{4}\b/g,
                replacement: 'XXX-XX-XXXX',
            },
            { name: 'SSN_NoHyphen', regex: /\b\d{9}\b/g, replacement: 'XXXXXXXXX' },
            // Email patterns
            {
                name: 'Email',
                regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
                replacement: '[EMAIL]',
            },
            // Credit card patterns
            {
                name: 'CreditCard',
                regex: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
                replacement: 'XXXX-XXXX-XXXX-XXXX',
            },
            // Phone number patterns
            {
                name: 'Phone',
                regex: /\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
                replacement: 'XXX-XXX-XXXX',
            },
            // Bank account patterns
            { name: 'BankAccount', regex: /\b\d{8,17}\b/g, replacement: '[ACCOUNT]' },
        ];
        let redacted = text;
        const foundPatterns = [];
        for (const pattern of patterns) {
            if (pattern.regex.test(text)) {
                foundPatterns.push(pattern.name);
                redacted = redacted.replace(pattern.regex, pattern.replacement);
            }
        }
        return {
            hasPII: foundPatterns.length > 0,
            patterns: foundPatterns,
            redacted,
        };
    }
    /**
     * Create security context from user session
     */
    static createSecurityContext(user, requestMetadata = {}) {
        return {
            userId: user.id || 'anonymous',
            roles: user.roles || ['viewer'],
            permissions: user.permissions || [],
            clearanceLevel: user.clearanceLevel || 1,
            budgetRemaining: user.budgetRemaining || 10.0,
            rateLimit: user.rateLimit || 100,
            requestsLastHour: requestMetadata.requestsLastHour || 0,
            location: requestMetadata.location || 'Unknown',
        };
    }
    /**
     * Generate audit hash for policy decisions
     */
    generateAuditHash(input, result, timestamp) {
        const auditData = {
            userId: input.user.id,
            action: input.action,
            taskHash: (0, crypto_1.createHash)('sha256')
                .update(input.task)
                .digest('hex')
                .substring(0, 16),
            expert: input.expert,
            allow: result.allow,
            timestamp,
        };
        return (0, crypto_1.createHash)('sha256').update(JSON.stringify(auditData)).digest('hex');
    }
    /**
     * Query OPA REST API
     */
    async queryOPA(path, data) {
        const url = `${this.baseUrl}${path}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error(`OPA request failed: ${response.status} ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
}
exports.OPAClient = OPAClient;
// Singleton instance
exports.opaClient = new OPAClient(process.env.OPA_URL || 'http://localhost:8181', parseInt(process.env.OPA_TIMEOUT_MS || '5000'));
// Security middleware helper
async function enforcePolicy(context, action, task, expert) {
    const input = {
        user: {
            id: context.userId,
            roles: context.roles,
            permissions: context.permissions,
            clearance_level: context.clearanceLevel,
            budget_remaining: context.budgetRemaining,
            rate_limit: context.rateLimit,
            requests_last_hour: context.requestsLastHour,
            location: context.location,
        },
        action,
        task,
        expert,
    };
    const result = await exports.opaClient.evaluatePolicy(input);
    // Log security decision
    if (result.audit_required) {
        const auditHash = exports.opaClient.generateAuditHash(input, result, Date.now());
        console.log('Security audit:', {
            userId: context.userId,
            action,
            expert,
            allowed: result.allow,
            auditHash,
            warnings: result.warnings,
        });
    }
    return {
        allowed: result.allow,
        warnings: result.warnings,
        auditRequired: result.audit_required,
    };
}
