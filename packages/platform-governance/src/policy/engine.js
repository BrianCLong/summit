"use strict";
/**
 * P46: Policy Engine
 * Rule-based policy evaluation for governance and compliance
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.policyEngine = exports.PolicyEngine = exports.PolicySchema = exports.PolicyRuleSchema = exports.ConditionSchema = void 0;
exports.createPolicyEngine = createPolicyEngine;
const zod_1 = require("zod");
/**
 * Condition schema
 */
exports.ConditionSchema = zod_1.z.object({
    field: zod_1.z.string(),
    operator: zod_1.z.enum([
        'equals', 'not_equals', 'contains', 'not_contains',
        'starts_with', 'ends_with', 'matches',
        'greater_than', 'less_than',
        'in', 'not_in', 'exists', 'not_exists'
    ]),
    value: zod_1.z.unknown().optional(),
});
/**
 * Policy rule schema
 */
exports.PolicyRuleSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    type: zod_1.z.enum(['allow', 'deny', 'require', 'enforce', 'audit', 'notify']),
    effect: zod_1.z.enum(['allow', 'deny', 'warn']),
    priority: zod_1.z.number().default(0),
    enabled: zod_1.z.boolean().default(true),
    conditions: zod_1.z.array(exports.ConditionSchema),
    conditionLogic: zod_1.z.enum(['and', 'or']).default('and'),
    actions: zod_1.z.array(zod_1.z.string()).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
/**
 * Policy schema
 */
exports.PolicySchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    version: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    rules: zod_1.z.array(exports.PolicyRuleSchema),
    defaultEffect: zod_1.z.enum(['allow', 'deny']).default('deny'),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
/**
 * Evaluate a condition against context
 */
function evaluateCondition(condition, context) {
    const value = getFieldValue(condition.field, context);
    switch (condition.operator) {
        case 'equals':
            return value === condition.value;
        case 'not_equals':
            return value !== condition.value;
        case 'contains':
            if (typeof value === 'string' && typeof condition.value === 'string') {
                return value.includes(condition.value);
            }
            if (Array.isArray(value)) {
                return value.includes(condition.value);
            }
            return false;
        case 'not_contains':
            if (typeof value === 'string' && typeof condition.value === 'string') {
                return !value.includes(condition.value);
            }
            if (Array.isArray(value)) {
                return !value.includes(condition.value);
            }
            return true;
        case 'starts_with':
            return typeof value === 'string' &&
                typeof condition.value === 'string' &&
                value.startsWith(condition.value);
        case 'ends_with':
            return typeof value === 'string' &&
                typeof condition.value === 'string' &&
                value.endsWith(condition.value);
        case 'matches':
            if (typeof value === 'string' && typeof condition.value === 'string') {
                return new RegExp(condition.value).test(value);
            }
            return false;
        case 'greater_than':
            return typeof value === 'number' &&
                typeof condition.value === 'number' &&
                value > condition.value;
        case 'less_than':
            return typeof value === 'number' &&
                typeof condition.value === 'number' &&
                value < condition.value;
        case 'in':
            return Array.isArray(condition.value) && condition.value.includes(value);
        case 'not_in':
            return Array.isArray(condition.value) && !condition.value.includes(value);
        case 'exists':
            return value !== undefined && value !== null;
        case 'not_exists':
            return value === undefined || value === null;
        default:
            return false;
    }
}
/**
 * Get field value from context using dot notation
 */
function getFieldValue(field, context) {
    const parts = field.split('.');
    let value = context;
    for (const part of parts) {
        if (value === null || value === undefined) {
            return undefined;
        }
        value = value[part];
    }
    return value;
}
/**
 * Policy Engine
 */
class PolicyEngine {
    policies = new Map();
    /**
     * Register a policy
     */
    registerPolicy(policy) {
        const validated = exports.PolicySchema.parse(policy);
        this.policies.set(validated.id, validated);
    }
    /**
     * Remove a policy
     */
    removePolicy(policyId) {
        return this.policies.delete(policyId);
    }
    /**
     * Get all policies
     */
    getPolicies() {
        return Array.from(this.policies.values());
    }
    /**
     * Evaluate a context against all policies
     */
    evaluate(context) {
        const result = {
            allowed: false,
            effect: 'deny',
            matchedRules: [],
            warnings: [],
            auditLog: [],
        };
        // Collect all rules from all policies, sorted by priority
        const allRules = [];
        for (const policy of this.policies.values()) {
            for (const rule of policy.rules) {
                if (rule.enabled) {
                    allRules.push({ rule, policy });
                }
            }
        }
        allRules.sort((a, b) => b.rule.priority - a.rule.priority);
        // Evaluate rules
        let hasExplicitAllow = false;
        let hasExplicitDeny = false;
        for (const { rule, policy } of allRules) {
            const conditionResults = rule.conditions.map(c => evaluateCondition(c, context));
            const matched = rule.conditionLogic === 'and'
                ? conditionResults.every(r => r)
                : conditionResults.some(r => r);
            result.auditLog.push({
                ruleId: rule.id,
                matched,
                reason: matched
                    ? `Rule "${rule.name}" matched`
                    : `Rule "${rule.name}" did not match conditions`,
            });
            if (matched) {
                result.matchedRules.push(rule);
                switch (rule.effect) {
                    case 'allow':
                        hasExplicitAllow = true;
                        break;
                    case 'deny':
                        hasExplicitDeny = true;
                        result.deniedBy = rule;
                        break;
                    case 'warn':
                        result.warnings.push(`Warning from rule "${rule.name}": ${rule.description || 'No description'}`);
                        break;
                }
            }
        }
        // Determine final effect (deny takes precedence)
        if (hasExplicitDeny) {
            result.allowed = false;
            result.effect = 'deny';
        }
        else if (hasExplicitAllow) {
            result.allowed = true;
            result.effect = 'allow';
        }
        else {
            // Use default effect from first policy (or deny)
            const defaultEffect = this.policies.values().next().value?.defaultEffect || 'deny';
            result.allowed = defaultEffect === 'allow';
            result.effect = defaultEffect;
        }
        return result;
    }
    /**
     * Evaluate with detailed explanation
     */
    evaluateWithExplanation(context) {
        const result = this.evaluate(context);
        const explanationLines = [
            `Decision: ${result.allowed ? 'ALLOWED' : 'DENIED'}`,
            `Effect: ${result.effect}`,
            '',
            `Subject: ${context.subject.type}:${context.subject.id}`,
            `Resource: ${context.resource.type}:${context.resource.id}`,
            `Action: ${context.action}`,
            '',
            'Evaluation Log:',
        ];
        for (const log of result.auditLog) {
            explanationLines.push(`  - ${log.reason}`);
        }
        if (result.deniedBy) {
            explanationLines.push('');
            explanationLines.push(`Denied by rule: ${result.deniedBy.name}`);
        }
        if (result.warnings.length > 0) {
            explanationLines.push('');
            explanationLines.push('Warnings:');
            for (const warning of result.warnings) {
                explanationLines.push(`  - ${warning}`);
            }
        }
        return {
            result,
            explanation: explanationLines.join('\n'),
        };
    }
}
exports.PolicyEngine = PolicyEngine;
/**
 * Create a new policy engine
 */
function createPolicyEngine() {
    return new PolicyEngine();
}
/**
 * Default policy engine instance
 */
exports.policyEngine = createPolicyEngine();
