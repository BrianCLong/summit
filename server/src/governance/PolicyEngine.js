"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyEngine = void 0;
class PolicyEngine {
    policies = [];
    evaluatorId = 'native-policy-engine-v1';
    constructor(policies) {
        if (policies) {
            this.policies = policies;
        }
    }
    loadPolicies(newPolicies) {
        this.policies = newPolicies;
    }
    check(context) {
        const start = process.hrtime();
        const violations = [];
        const violatedPolicyIds = [];
        let decision = 'ALLOW';
        for (const policy of this.policies) {
            if (!this.isScopeMatch(policy, context)) {
                continue;
            }
            const matches = this.evaluateRules(policy.rules, context.payload);
            if (matches) {
                if (policy.action === 'DENY') {
                    decision = 'DENY';
                    violations.push(`Policy ${policy.id} violation: ${policy.description || 'Rules matched'}`);
                    violatedPolicyIds.push(policy.id);
                }
                else if (policy.action === 'ESCALATE' && decision !== 'DENY') {
                    decision = 'ESCALATE';
                    violations.push(`Policy ${policy.id} escalation: ${policy.description || 'Rules matched'}`);
                    violatedPolicyIds.push(policy.id);
                }
                else if (policy.action === 'WARN' && decision === 'ALLOW') {
                    // Only set to WARN if we haven't already DENIED or ESCALATED
                    decision = 'WARN';
                    violations.push(`Policy ${policy.id} warning: ${policy.description || 'Rules matched'}`);
                    violatedPolicyIds.push(policy.id);
                }
            }
        }
        const end = process.hrtime(start);
        const latencyMs = (end[0] * 1000) + (end[1] / 1e6);
        return {
            action: decision,
            reasons: violations,
            policyIds: violatedPolicyIds,
            metadata: {
                timestamp: new Date().toISOString(),
                evaluator: this.evaluatorId,
                latencyMs,
                simulation: context.simulation || false
            },
            provenance: {
                origin: 'system-policy-check',
                confidence: 1.0 // Deterministic logic
            }
        };
    }
    isScopeMatch(policy, context) {
        const stageMatch = policy.scope.stages.includes(context.stage);
        const tenantMatch = policy.scope.tenants.includes('*') || policy.scope.tenants.includes(context.tenantId);
        return stageMatch && tenantMatch;
    }
    evaluateRules(rules, payload) {
        return rules.every(rule => {
            const value = this.getNestedValue(payload, rule.field);
            return this.compare(value, rule.operator, rule.value);
        });
    }
    getNestedValue(obj, path) {
        return path.split('.').reduce((o, key) => (o ? o[key] : undefined), obj);
    }
    compare(actual, operator, expected) {
        switch (operator) {
            case 'eq': return actual === expected;
            case 'neq': return actual !== expected;
            case 'lt': return actual < expected;
            case 'gt': return actual > expected;
            case 'in': return Array.isArray(expected) && expected.includes(actual);
            case 'not_in': return Array.isArray(expected) && !expected.includes(actual);
            case 'contains': return Array.isArray(actual) && actual.includes(expected);
            default: return false;
        }
    }
}
exports.PolicyEngine = PolicyEngine;
