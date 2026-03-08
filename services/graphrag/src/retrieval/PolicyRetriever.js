"use strict";
/**
 * Policy-Aware Retriever
 * ABAC-enforced retrieval with redaction support
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyRetriever = void 0;
const uuid_1 = require("uuid");
const api_1 = require("@opentelemetry/api");
const tracer = api_1.trace.getTracer('graphrag-policy-retriever');
class PolicyRetriever {
    driver;
    redactionRules = [];
    opaEndpoint;
    constructor(driver, opaEndpoint) {
        this.driver = driver;
        this.opaEndpoint = opaEndpoint;
        this.initializeDefaultRedactionRules();
    }
    /**
     * Retrieve with policy enforcement
     */
    async retrieveWithPolicy(evidenceChunks, context) {
        return tracer.startActiveSpan('policy_retrieval', async (span) => {
            try {
                span.setAttribute('context.userId', context.userId);
                span.setAttribute('context.tenantId', context.tenantId);
                span.setAttribute('chunks.count', evidenceChunks.length);
                const allowed = [];
                const denied = [];
                const redacted = [];
                for (const chunk of evidenceChunks) {
                    // Check access policy
                    const decision = await this.evaluatePolicy(chunk, context);
                    if (!decision.allowed) {
                        denied.push({
                            chunkId: chunk.id,
                            reason: decision.reason || 'Access denied by policy',
                        });
                        continue;
                    }
                    // Apply redactions if needed
                    if (decision.redactions && decision.redactions.length > 0) {
                        const redactedChunk = this.applyRedactions(chunk, decision.redactions);
                        redacted.push(redactedChunk);
                    }
                    else {
                        allowed.push(chunk);
                    }
                }
                span.setAttribute('results.allowed', allowed.length);
                span.setAttribute('results.denied', denied.length);
                span.setAttribute('results.redacted', redacted.length);
                span.setStatus({ code: api_1.SpanStatusCode.OK });
                return { allowed, denied, redacted };
            }
            catch (error) {
                span.setStatus({
                    code: api_1.SpanStatusCode.ERROR,
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    /**
     * Evaluate policy for a chunk
     */
    async evaluatePolicy(chunk, context) {
        // Check OPA if configured
        if (this.opaEndpoint) {
            return this.evaluateWithOPA(chunk, context);
        }
        // Fall back to local policy evaluation
        return this.evaluateLocalPolicy(chunk, context);
    }
    /**
     * Evaluate policy using OPA
     */
    async evaluateWithOPA(chunk, context) {
        try {
            const input = {
                subject: {
                    userId: context.userId,
                    roles: context.roles,
                    clearanceLevel: context.clearanceLevel,
                    jurisdiction: context.jurisdiction,
                },
                resource: {
                    type: 'evidence_chunk',
                    id: chunk.id,
                    tenantId: chunk.tenantId,
                    policyLabels: chunk.policyLabels,
                    citations: chunk.citations.map((c) => ({
                        sourceType: c.sourceType,
                        documentId: c.documentId,
                    })),
                },
                action: 'read',
                context: {
                    purpose: context.purpose,
                    timestamp: new Date().toISOString(),
                },
            };
            const response = await fetch(`${this.opaEndpoint}/v1/data/graphrag/allow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ input }),
            });
            const result = await response.json();
            return {
                allowed: result.result?.allow ?? false,
                reason: result.result?.reason,
                redactions: result.result?.redactions,
                auditLog: {
                    policyId: 'opa-graphrag',
                    evaluatedAt: new Date().toISOString(),
                    userId: context.userId,
                    tenantId: context.tenantId,
                    action: 'read',
                    resource: `evidence:${chunk.id}`,
                },
            };
        }
        catch (error) {
            console.error('OPA evaluation failed:', error);
            // Fail closed - deny access on error
            return {
                allowed: false,
                reason: 'Policy evaluation failed',
                auditLog: {
                    policyId: 'opa-error',
                    evaluatedAt: new Date().toISOString(),
                    userId: context.userId,
                    tenantId: context.tenantId,
                    action: 'read',
                    resource: `evidence:${chunk.id}`,
                },
            };
        }
    }
    /**
     * Evaluate local policy rules
     */
    async evaluateLocalPolicy(chunk, context) {
        const redactions = [];
        // Tenant isolation
        if (chunk.tenantId !== context.tenantId) {
            return {
                allowed: false,
                reason: 'Cross-tenant access denied',
                auditLog: {
                    policyId: 'tenant-isolation',
                    evaluatedAt: new Date().toISOString(),
                    userId: context.userId,
                    tenantId: context.tenantId,
                    action: 'read',
                    resource: `evidence:${chunk.id}`,
                },
            };
        }
        // Check policy labels
        if (chunk.policyLabels) {
            for (const label of chunk.policyLabels) {
                const labelCheck = this.checkPolicyLabel(label, context);
                if (!labelCheck.allowed) {
                    return {
                        allowed: false,
                        reason: labelCheck.reason,
                        auditLog: {
                            policyId: `label-${label}`,
                            evaluatedAt: new Date().toISOString(),
                            userId: context.userId,
                            tenantId: context.tenantId,
                            action: 'read',
                            resource: `evidence:${chunk.id}`,
                        },
                    };
                }
                if (labelCheck.redactions) {
                    redactions.push(...labelCheck.redactions);
                }
            }
        }
        // Check for PII requiring redaction
        const piiRedactions = this.detectPII(chunk.content);
        if (piiRedactions.length > 0 && !context.roles.includes('pii-viewer')) {
            redactions.push(...piiRedactions);
        }
        return {
            allowed: true,
            redactions: redactions.length > 0 ? redactions : undefined,
            auditLog: {
                policyId: 'local-policy',
                evaluatedAt: new Date().toISOString(),
                userId: context.userId,
                tenantId: context.tenantId,
                action: 'read',
                resource: `evidence:${chunk.id}`,
            },
        };
    }
    /**
     * Check policy label access
     */
    checkPolicyLabel(label, context) {
        const clearanceLevels = ['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'];
        const userClearanceIndex = clearanceLevels.indexOf(context.clearanceLevel || 'UNCLASSIFIED');
        const labelClearanceIndex = clearanceLevels.indexOf(label);
        if (labelClearanceIndex > userClearanceIndex && labelClearanceIndex !== -1) {
            return {
                allowed: false,
                reason: `Insufficient clearance for ${label} material`,
            };
        }
        // Jurisdiction checks
        if (label.startsWith('JURISDICTION:')) {
            const requiredJurisdiction = label.replace('JURISDICTION:', '');
            if (context.jurisdiction !== requiredJurisdiction) {
                return {
                    allowed: false,
                    reason: `Access restricted to ${requiredJurisdiction} jurisdiction`,
                };
            }
        }
        return { allowed: true };
    }
    /**
     * Detect PII in content
     */
    detectPII(content) {
        const redactions = [];
        // SSN pattern
        if (/\b\d{3}-\d{2}-\d{4}\b/.test(content)) {
            redactions.push({ field: 'ssn', reason: 'Social Security Number detected' });
        }
        // Credit card pattern
        if (/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/.test(content)) {
            redactions.push({ field: 'credit_card', reason: 'Credit card number detected' });
        }
        // Email pattern (for sensitive contexts)
        if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(content)) {
            redactions.push({ field: 'email', reason: 'Email address detected' });
        }
        // Phone pattern
        if (/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(content)) {
            redactions.push({ field: 'phone', reason: 'Phone number detected' });
        }
        return redactions;
    }
    /**
     * Apply redactions to a chunk
     */
    applyRedactions(chunk, redactions) {
        let redactedContent = chunk.content;
        for (const rule of this.redactionRules) {
            const shouldApply = redactions.some((r) => rule.appliesTo.includes(r.field));
            if (shouldApply) {
                if (typeof rule.pattern === 'string') {
                    redactedContent = redactedContent.replace(new RegExp(rule.pattern, 'g'), rule.replacement);
                }
                else {
                    redactedContent = redactedContent.replace(rule.pattern, rule.replacement);
                }
            }
        }
        return {
            ...chunk,
            id: (0, uuid_1.v4)(), // New ID for redacted version
            content: redactedContent,
            citations: chunk.citations.map((c) => ({
                ...c,
                content: this.redactCitationContent(c.content, redactions),
            })),
        };
    }
    /**
     * Redact citation content
     */
    redactCitationContent(content, redactions) {
        let redacted = content;
        for (const rule of this.redactionRules) {
            const shouldApply = redactions.some((r) => rule.appliesTo.includes(r.field));
            if (shouldApply) {
                if (typeof rule.pattern === 'string') {
                    redacted = redacted.replace(new RegExp(rule.pattern, 'g'), rule.replacement);
                }
                else {
                    redacted = redacted.replace(rule.pattern, rule.replacement);
                }
            }
        }
        return redacted;
    }
    /**
     * Initialize default redaction rules
     */
    initializeDefaultRedactionRules() {
        this.redactionRules = [
            {
                pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
                replacement: '[SSN REDACTED]',
                reason: 'SSN protection',
                appliesTo: ['ssn'],
            },
            {
                pattern: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
                replacement: '[CARD REDACTED]',
                reason: 'Credit card protection',
                appliesTo: ['credit_card'],
            },
            {
                pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
                replacement: '[EMAIL REDACTED]',
                reason: 'Email protection',
                appliesTo: ['email'],
            },
            {
                pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
                replacement: '[PHONE REDACTED]',
                reason: 'Phone protection',
                appliesTo: ['phone'],
            },
        ];
    }
    /**
     * Add custom redaction rule
     */
    addRedactionRule(rule) {
        this.redactionRules.push(rule);
    }
    /**
     * Log policy decision for audit
     */
    async logPolicyDecision(decision) {
        const session = this.driver.session();
        try {
            await session.run(`
        CREATE (a:AuditLog {
          id: $id,
          policyId: $policyId,
          evaluatedAt: datetime($evaluatedAt),
          userId: $userId,
          tenantId: $tenantId,
          action: $action,
          resource: $resource,
          allowed: $allowed,
          reason: $reason
        })
        `, {
                id: (0, uuid_1.v4)(),
                policyId: decision.auditLog.policyId,
                evaluatedAt: decision.auditLog.evaluatedAt,
                userId: decision.auditLog.userId,
                tenantId: decision.auditLog.tenantId,
                action: decision.auditLog.action,
                resource: decision.auditLog.resource,
                allowed: decision.allowed,
                reason: decision.reason || null,
            });
        }
        finally {
            await session.close();
        }
    }
}
exports.PolicyRetriever = PolicyRetriever;
