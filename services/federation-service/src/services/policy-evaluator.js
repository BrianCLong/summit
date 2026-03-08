"use strict";
/**
 * Policy Evaluation Engine
 *
 * Determines if objects can be shared under a given SharingAgreement.
 * Implements deny-by-default policy enforcement.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.policyEvaluator = exports.PolicyEvaluator = void 0;
const pino_1 = __importDefault(require("pino"));
const types_js_1 = require("../models/types.js");
const logger = (0, pino_1.default)({ name: 'policy-evaluator' });
/**
 * Classification level ordering (lower index = lower classification)
 */
const CLASSIFICATION_ORDER = [
    types_js_1.ClassificationLevel.UNCLASSIFIED,
    types_js_1.ClassificationLevel.CUI,
    types_js_1.ClassificationLevel.CONFIDENTIAL,
    types_js_1.ClassificationLevel.SECRET,
    types_js_1.ClassificationLevel.TOP_SECRET,
];
/**
 * Policy Evaluator Service
 */
class PolicyEvaluator {
    /**
     * Evaluate if an object can be shared under an agreement
     */
    evaluateShare(obj, agreement) {
        logger.info({
            objectId: obj.id,
            objectType: obj.type,
            agreementId: agreement.id,
        }, 'Evaluating share policy');
        // 1. Check agreement status
        if (agreement.status !== types_js_1.AgreementStatus.ACTIVE) {
            return {
                allowed: false,
                reason: `Agreement is not active (status: ${agreement.status})`,
            };
        }
        // 2. Check effective/expiration dates
        const now = new Date();
        if (agreement.effectiveDate && now < agreement.effectiveDate) {
            return {
                allowed: false,
                reason: 'Agreement is not yet effective',
            };
        }
        if (agreement.expirationDate && now > agreement.expirationDate) {
            return {
                allowed: false,
                reason: 'Agreement has expired',
            };
        }
        // 3. Check object type allowed
        const policy = agreement.policyConstraints;
        if (!policy.allowedObjectTypes.includes(obj.type)) {
            return {
                allowed: false,
                reason: `Object type ${obj.type} not allowed by agreement`,
            };
        }
        // 4. Check classification level
        if (!this.isClassificationAllowed(obj.classification, policy.maxClassificationLevel)) {
            return {
                allowed: false,
                reason: `Object classification ${obj.classification} exceeds max allowed ${policy.maxClassificationLevel}`,
            };
        }
        // 5. Check jurisdiction
        if (!policy.allowedJurisdictions.includes(obj.jurisdiction)) {
            // Check for GLOBAL jurisdiction wildcard
            if (!policy.allowedJurisdictions.includes(types_js_1.Jurisdiction.GLOBAL)) {
                return {
                    allowed: false,
                    reason: `Object jurisdiction ${obj.jurisdiction} not allowed by agreement`,
                };
            }
        }
        // 6. Determine required redactions
        const requiredRedactions = this.computeRedactions(obj, agreement);
        // 7. Check if manual approval required
        const requiresApproval = policy.requiresApproval === true;
        logger.info({
            objectId: obj.id,
            agreementId: agreement.id,
            allowed: true,
            requiredRedactions: requiredRedactions.length,
            requiresApproval,
        }, 'Policy evaluation passed');
        return {
            allowed: true,
            requiredRedactions,
            requiresApproval,
        };
    }
    /**
     * Evaluate if multiple objects can be shared (batch)
     */
    evaluateBatch(objects, agreement) {
        const results = new Map();
        for (const obj of objects) {
            results.set(obj.id, this.evaluateShare(obj, agreement));
        }
        return results;
    }
    /**
     * Check if classification is allowed
     */
    isClassificationAllowed(objectLevel, maxLevel) {
        const objectIndex = CLASSIFICATION_ORDER.indexOf(objectLevel);
        const maxIndex = CLASSIFICATION_ORDER.indexOf(maxLevel);
        if (objectIndex === -1 || maxIndex === -1) {
            logger.warn({ objectLevel, maxLevel }, 'Unknown classification level');
            return false;
        }
        return objectIndex <= maxIndex;
    }
    /**
     * Compute which fields need to be redacted
     */
    computeRedactions(obj, agreement) {
        const redactionRules = agreement.policyConstraints.redactionRules || [];
        const requiredRedactions = [];
        for (const rule of redactionRules) {
            // Check if condition applies (simplified - in production use proper expression evaluator)
            if (rule.condition) {
                // For now, just parse simple conditions
                if (this.evaluateCondition(rule.condition, obj)) {
                    requiredRedactions.push(rule.field);
                }
            }
            else {
                // No condition, always apply
                requiredRedactions.push(rule.field);
            }
        }
        return requiredRedactions;
    }
    /**
     * Evaluate a simple condition (simplified implementation)
     * In production, use a proper expression evaluator
     */
    evaluateCondition(condition, obj) {
        // Simple pattern matching for common conditions
        // Example: "classification > SECRET"
        if (condition.includes('classification >')) {
            const levelStr = condition.split('>')[1].trim();
            const targetLevel = levelStr;
            const objIndex = CLASSIFICATION_ORDER.indexOf(obj.classification);
            const targetIndex = CLASSIFICATION_ORDER.indexOf(targetLevel);
            return objIndex > targetIndex;
        }
        // Default: condition not met
        logger.warn({ condition }, 'Unable to evaluate condition, denying');
        return false;
    }
    /**
     * Validate a sharing agreement for consistency
     */
    validateAgreement(agreement) {
        const errors = [];
        // Check dates
        if (agreement.effectiveDate &&
            agreement.expirationDate &&
            agreement.effectiveDate > agreement.expirationDate) {
            errors.push('Effective date must be before expiration date');
        }
        // Check policy constraints
        if (agreement.policyConstraints.allowedObjectTypes.length === 0) {
            errors.push('At least one object type must be allowed');
        }
        if (agreement.policyConstraints.allowedJurisdictions.length === 0) {
            errors.push('At least one jurisdiction must be allowed');
        }
        // Check retention period
        if (agreement.policyConstraints.retentionPeriodDays !== undefined &&
            agreement.policyConstraints.retentionPeriodDays <= 0) {
            errors.push('Retention period must be positive');
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
}
exports.PolicyEvaluator = PolicyEvaluator;
exports.policyEvaluator = new PolicyEvaluator();
