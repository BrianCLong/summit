/**
 * Policy Evaluation Engine
 *
 * Determines if objects can be shared under a given SharingAgreement.
 * Implements deny-by-default policy enforcement.
 */

import pino from 'pino';
import {
  SharingAgreement,
  ShareableObjectType,
  ClassificationLevel,
  Jurisdiction,
  AgreementStatus,
} from '../models/types.js';

const logger = pino({ name: 'policy-evaluator' });

/**
 * Object to be evaluated for sharing
 */
export interface ShareableObject {
  id: string;
  type: ShareableObjectType;
  classification: ClassificationLevel;
  jurisdiction: Jurisdiction;
  data: Record<string, unknown>;
  createdAt: Date;
  modifiedAt?: Date;
}

/**
 * Result of policy evaluation
 */
export interface PolicyEvaluationResult {
  allowed: boolean;
  reason?: string;
  requiredRedactions?: string[]; // Fields that must be redacted
  requiresApproval?: boolean;
}

/**
 * Classification level ordering (lower index = lower classification)
 */
const CLASSIFICATION_ORDER = [
  ClassificationLevel.UNCLASSIFIED,
  ClassificationLevel.CUI,
  ClassificationLevel.CONFIDENTIAL,
  ClassificationLevel.SECRET,
  ClassificationLevel.TOP_SECRET,
];

/**
 * Policy Evaluator Service
 */
export class PolicyEvaluator {
  /**
   * Evaluate if an object can be shared under an agreement
   */
  evaluateShare(
    obj: ShareableObject,
    agreement: SharingAgreement
  ): PolicyEvaluationResult {
    logger.info(
      {
        objectId: obj.id,
        objectType: obj.type,
        agreementId: agreement.id,
      },
      'Evaluating share policy'
    );

    // 1. Check agreement status
    if (agreement.status !== AgreementStatus.ACTIVE) {
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
    if (
      !this.isClassificationAllowed(obj.classification, policy.maxClassificationLevel)
    ) {
      return {
        allowed: false,
        reason: `Object classification ${obj.classification} exceeds max allowed ${policy.maxClassificationLevel}`,
      };
    }

    // 5. Check jurisdiction
    if (!policy.allowedJurisdictions.includes(obj.jurisdiction)) {
      // Check for GLOBAL jurisdiction wildcard
      if (!policy.allowedJurisdictions.includes(Jurisdiction.GLOBAL)) {
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

    logger.info(
      {
        objectId: obj.id,
        agreementId: agreement.id,
        allowed: true,
        requiredRedactions: requiredRedactions.length,
        requiresApproval,
      },
      'Policy evaluation passed'
    );

    return {
      allowed: true,
      requiredRedactions,
      requiresApproval,
    };
  }

  /**
   * Evaluate if multiple objects can be shared (batch)
   */
  evaluateBatch(
    objects: ShareableObject[],
    agreement: SharingAgreement
  ): Map<string, PolicyEvaluationResult> {
    const results = new Map<string, PolicyEvaluationResult>();

    for (const obj of objects) {
      results.set(obj.id, this.evaluateShare(obj, agreement));
    }

    return results;
  }

  /**
   * Check if classification is allowed
   */
  private isClassificationAllowed(
    objectLevel: ClassificationLevel,
    maxLevel: ClassificationLevel
  ): boolean {
    const objectIndex = CLASSIFICATION_ORDER.indexOf(objectLevel);
    const maxIndex = CLASSIFICATION_ORDER.indexOf(maxLevel);

    if (objectIndex === -1 || maxIndex === -1) {
      logger.warn(
        { objectLevel, maxLevel },
        'Unknown classification level'
      );
      return false;
    }

    return objectIndex <= maxIndex;
  }

  /**
   * Compute which fields need to be redacted
   */
  private computeRedactions(
    obj: ShareableObject,
    agreement: SharingAgreement
  ): string[] {
    const redactionRules = agreement.policyConstraints.redactionRules || [];
    const requiredRedactions: string[] = [];

    for (const rule of redactionRules) {
      // Check if condition applies (simplified - in production use proper expression evaluator)
      if (rule.condition) {
        // For now, just parse simple conditions
        if (this.evaluateCondition(rule.condition, obj)) {
          requiredRedactions.push(rule.field);
        }
      } else {
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
  private evaluateCondition(condition: string, obj: ShareableObject): boolean {
    // Simple pattern matching for common conditions
    // Example: "classification > SECRET"

    if (condition.includes('classification >')) {
      const levelStr = condition.split('>')[1].trim();
      const targetLevel = levelStr as ClassificationLevel;
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
  validateAgreement(agreement: SharingAgreement): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check dates
    if (
      agreement.effectiveDate &&
      agreement.expirationDate &&
      agreement.effectiveDate > agreement.expirationDate
    ) {
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
    if (
      agreement.policyConstraints.retentionPeriodDays !== undefined &&
      agreement.policyConstraints.retentionPeriodDays <= 0
    ) {
      errors.push('Retention period must be positive');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const policyEvaluator = new PolicyEvaluator();
