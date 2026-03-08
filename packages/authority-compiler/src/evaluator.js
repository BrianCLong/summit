"use strict";
/**
 * Policy Evaluator
 *
 * Evaluates access requests against compiled policies.
 * Integrates with OPA for complex policy evaluation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyEvaluator = void 0;
const uuid_1 = require("uuid");
/**
 * Evaluates access requests against compiled policies
 */
class PolicyEvaluator {
    policy;
    options;
    constructor(policy, options = {}) {
        this.policy = policy;
        this.options = {
            defaultDeny: true,
            auditEnabled: true,
            ...options,
        };
    }
    /**
     * Evaluate an access request
     */
    async evaluate(context) {
        const auditId = (0, uuid_1.v4)();
        // Get authorities that grant the requested operation
        const candidateAuthorities = this.policy.operationIndex.get(context.operation) || [];
        if (candidateAuthorities.length === 0) {
            return this.deny(auditId, `No authority grants ${context.operation} permission`);
        }
        // Find matching authority
        for (const authority of candidateAuthorities) {
            const match = await this.matchAuthority(authority, context);
            if (match.matches) {
                return this.allow(auditId, authority, match);
            }
        }
        return this.deny(auditId, 'No matching authority found for this request');
    }
    /**
     * Check if an authority matches the evaluation context
     */
    async matchAuthority(authority, context) {
        // Check subject match
        const subjectMatch = this.matchSubjects(authority, context);
        if (!subjectMatch) {
            return { matches: false, reason: 'Subject does not match' };
        }
        // Check resource match
        const resourceMatch = this.matchResources(authority, context);
        if (!resourceMatch.matches) {
            return { matches: false, reason: resourceMatch.reason };
        }
        // Check conditions
        const conditionMatch = await this.checkConditions(authority, context);
        if (!conditionMatch.satisfied) {
            return { matches: false, reason: conditionMatch.reason };
        }
        return {
            matches: true,
            conditions: conditionMatch.pendingConditions,
            redactedFields: resourceMatch.redactedFields,
            requiresTwoPersonControl: conditionMatch.requiresTwoPersonControl,
        };
    }
    /**
     * Check if the user matches the authority's subject constraints
     */
    matchSubjects(authority, context) {
        const { subjects } = authority;
        // Check role match
        if (subjects.roles && subjects.roles.length > 0) {
            const hasRole = subjects.roles.some((role) => context.user.roles.includes(role));
            if (hasRole) {
                return true;
            }
        }
        // Check user match
        if (subjects.users && subjects.users.includes(context.user.id)) {
            return true;
        }
        // Check group match
        if (subjects.groups && context.user.groups) {
            const hasGroup = subjects.groups.some((group) => context.user.groups?.includes(group));
            if (hasGroup) {
                return true;
            }
        }
        // Check tenant match
        if (subjects.tenants && context.user.tenantId) {
            if (subjects.tenants.includes(context.user.tenantId)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Check if the resource matches the authority's resource constraints
     */
    matchResources(authority, context) {
        const { resources } = authority;
        // Check entity type
        if (resources.entityTypes && resources.entityTypes.length > 0) {
            if (context.resource.entityType && !resources.entityTypes.includes(context.resource.entityType)) {
                return { matches: false, reason: `Entity type ${context.resource.entityType} not permitted` };
            }
        }
        // Check classification
        if (resources.classifications && resources.classifications.length > 0) {
            if (context.resource.classification) {
                if (!resources.classifications.includes(context.resource.classification)) {
                    return { matches: false, reason: `Classification ${context.resource.classification} not permitted` };
                }
            }
        }
        // Check compartments
        if (resources.compartments && resources.compartments.length > 0) {
            if (context.resource.compartments) {
                const hasCompartment = context.resource.compartments.some((c) => resources.compartments?.includes(c));
                if (!hasCompartment) {
                    return { matches: false, reason: 'Required compartment access not granted' };
                }
            }
        }
        // Check investigation
        if (resources.investigations && resources.investigations.length > 0) {
            if (context.resource.investigationId) {
                if (!resources.investigations.includes(context.resource.investigationId)) {
                    return { matches: false, reason: 'Not authorized for this investigation' };
                }
            }
        }
        return { matches: true };
    }
    /**
     * Check if the authority's conditions are satisfied
     */
    async checkConditions(authority, context) {
        const conditions = authority.conditions;
        if (!conditions) {
            return { satisfied: true };
        }
        const pendingConditions = [];
        // Check MFA requirement
        if (conditions.requireMFA && !context.request.mfaVerified) {
            return { satisfied: false, reason: 'MFA verification required' };
        }
        // Check justification requirement
        if (conditions.requireJustification && !context.request.justification) {
            pendingConditions.push('Justification required');
        }
        // Check IP allowlist
        if (conditions.ipAllowlist && conditions.ipAllowlist.length > 0) {
            if (context.request.ip && !conditions.ipAllowlist.includes(context.request.ip)) {
                return { satisfied: false, reason: 'IP address not in allowlist' };
            }
        }
        // Check time window
        if (conditions.timeWindow) {
            const now = context.request.timestamp;
            const hour = now.getUTCHours();
            const day = now.getUTCDay();
            if (hour < conditions.timeWindow.startHour || hour >= conditions.timeWindow.endHour) {
                return { satisfied: false, reason: 'Access not permitted at this time' };
            }
            if (conditions.timeWindow.daysOfWeek && !conditions.timeWindow.daysOfWeek.includes(day)) {
                return { satisfied: false, reason: 'Access not permitted on this day' };
            }
        }
        // Check validity period
        if (conditions.validFrom) {
            const validFrom = new Date(conditions.validFrom);
            if (context.request.timestamp < validFrom) {
                return { satisfied: false, reason: 'Authority not yet effective' };
            }
        }
        if (conditions.validTo) {
            const validTo = new Date(conditions.validTo);
            if (context.request.timestamp > validTo) {
                return { satisfied: false, reason: 'Authority has expired' };
            }
        }
        return {
            satisfied: true,
            pendingConditions: pendingConditions.length > 0 ? pendingConditions : undefined,
            requiresTwoPersonControl: conditions.requireTwoPersonControl,
        };
    }
    /**
     * Create an allow decision
     */
    allow(auditId, authority, match) {
        return {
            allowed: true,
            authorityId: authority.id,
            reason: `Access granted by authority: ${authority.name}`,
            conditions: match.conditions,
            requiresTwoPersonControl: match.requiresTwoPersonControl || false,
            redactedFields: match.redactedFields,
            auditId,
        };
    }
    /**
     * Create a deny decision
     */
    deny(auditId, reason) {
        return {
            allowed: false,
            reason,
            requiresTwoPersonControl: false,
            auditId,
        };
    }
    /**
     * Update the compiled policy (for hot-reloading)
     */
    updatePolicy(policy) {
        this.policy = policy;
    }
}
exports.PolicyEvaluator = PolicyEvaluator;
exports.default = PolicyEvaluator;
