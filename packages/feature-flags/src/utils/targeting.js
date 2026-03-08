"use strict";
/**
 * Targeting Utilities
 *
 * Utilities for user targeting and segmentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateTargetingRules = evaluateTargetingRules;
exports.evaluateRule = evaluateRule;
exports.evaluateCondition = evaluateCondition;
exports.targetUserId = targetUserId;
exports.targetUserEmail = targetUserEmail;
exports.targetRole = targetRole;
exports.targetTenant = targetTenant;
exports.targetEnvironment = targetEnvironment;
exports.targetCountry = targetCountry;
exports.targetAttribute = targetAttribute;
/**
 * Evaluate targeting rules
 */
function evaluateTargetingRules(rules, context) {
    // Evaluate rules in order
    for (const rule of rules) {
        if (evaluateRule(rule, context)) {
            return rule.variation;
        }
    }
    return null;
}
/**
 * Evaluate a single targeting rule
 */
function evaluateRule(rule, context) {
    // All conditions must be true (AND logic)
    return rule.conditions.every((condition) => evaluateCondition(condition, context));
}
/**
 * Evaluate a single condition
 */
function evaluateCondition(condition, context) {
    const attributeValue = getAttributeValue(context, condition.attribute);
    const result = evaluateOperator(attributeValue, condition.operator, condition.value);
    // Apply negation if specified
    return condition.negate ? !result : result;
}
/**
 * Get attribute value from context
 */
function getAttributeValue(context, attribute) {
    // Check standard context fields
    switch (attribute) {
        case 'userId':
            return context.userId;
        case 'userEmail':
            return context.userEmail;
        case 'userRole':
            return context.userRole;
        case 'tenantId':
            return context.tenantId;
        case 'environment':
            return context.environment;
        case 'sessionId':
            return context.sessionId;
        case 'ipAddress':
            return context.ipAddress;
        case 'userAgent':
            return context.userAgent;
        case 'location.country':
            return context.location?.country;
        case 'location.region':
            return context.location?.region;
        case 'location.city':
            return context.location?.city;
        default:
            // Check custom attributes
            return context.attributes?.[attribute];
    }
}
/**
 * Evaluate operator
 */
function evaluateOperator(attributeValue, operator, targetValue) {
    // Handle null/undefined attribute value
    if (attributeValue === null || attributeValue === undefined) {
        return false;
    }
    switch (operator) {
        case 'equals':
            return attributeValue === targetValue;
        case 'not_equals':
            return attributeValue !== targetValue;
        case 'in':
            if (!Array.isArray(targetValue)) {
                return false;
            }
            return targetValue.includes(attributeValue);
        case 'not_in':
            if (!Array.isArray(targetValue)) {
                return true;
            }
            return !targetValue.includes(attributeValue);
        case 'contains':
            if (typeof attributeValue !== 'string') {
                return false;
            }
            return attributeValue.includes(String(targetValue));
        case 'not_contains':
            if (typeof attributeValue !== 'string') {
                return true;
            }
            return !attributeValue.includes(String(targetValue));
        case 'starts_with':
            if (typeof attributeValue !== 'string') {
                return false;
            }
            return attributeValue.startsWith(String(targetValue));
        case 'ends_with':
            if (typeof attributeValue !== 'string') {
                return false;
            }
            return attributeValue.endsWith(String(targetValue));
        case 'greater_than':
            return Number(attributeValue) > Number(targetValue);
        case 'greater_than_or_equal':
            return Number(attributeValue) >= Number(targetValue);
        case 'less_than':
            return Number(attributeValue) < Number(targetValue);
        case 'less_than_or_equal':
            return Number(attributeValue) <= Number(targetValue);
        case 'matches_regex':
            if (typeof attributeValue !== 'string') {
                return false;
            }
            try {
                const regex = new RegExp(String(targetValue));
                return regex.test(attributeValue);
            }
            catch {
                return false;
            }
        case 'semver_equal':
            return compareSemver(attributeValue, targetValue) === 0;
        case 'semver_greater_than':
            return compareSemver(attributeValue, targetValue) > 0;
        case 'semver_less_than':
            return compareSemver(attributeValue, targetValue) < 0;
        default:
            return false;
    }
}
/**
 * Compare semantic versions
 */
function compareSemver(v1, v2) {
    const parts1 = String(v1).split('.').map(Number);
    const parts2 = String(v2).split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const part1 = parts1[i] || 0;
        const part2 = parts2[i] || 0;
        if (part1 > part2) {
            return 1;
        }
        if (part1 < part2) {
            return -1;
        }
    }
    return 0;
}
/**
 * Create a user ID targeting condition
 */
function targetUserId(userIds, negate = false) {
    return {
        attribute: 'userId',
        operator: 'in',
        value: userIds,
        negate,
    };
}
/**
 * Create a user email targeting condition
 */
function targetUserEmail(emails, negate = false) {
    return {
        attribute: 'userEmail',
        operator: 'in',
        value: emails,
        negate,
    };
}
/**
 * Create a role targeting condition
 */
function targetRole(roles, negate = false) {
    return {
        attribute: 'userRole',
        operator: 'in',
        value: roles,
        negate,
    };
}
/**
 * Create a tenant targeting condition
 */
function targetTenant(tenantIds, negate = false) {
    return {
        attribute: 'tenantId',
        operator: 'in',
        value: tenantIds,
        negate,
    };
}
/**
 * Create an environment targeting condition
 */
function targetEnvironment(environments, negate = false) {
    return {
        attribute: 'environment',
        operator: 'in',
        value: environments,
        negate,
    };
}
/**
 * Create a country targeting condition
 */
function targetCountry(countries, negate = false) {
    return {
        attribute: 'location.country',
        operator: 'in',
        value: countries,
        negate,
    };
}
/**
 * Create a custom attribute targeting condition
 */
function targetAttribute(attribute, operator, value, negate = false) {
    return {
        attribute,
        operator,
        value,
        negate,
    };
}
