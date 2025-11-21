/**
 * Redaction Middleware for GraphQL and REST APIs
 *
 * Provides policy-based redaction of sensitive data based on user clearance,
 * sensitivity classification, and context (purpose, step-up auth, etc.)
 */

import { SensitivityClass, SensitivityClassifier } from './sensitivity.js';
import { MetadataStore } from './metadata.js';
import { PIIType, ClassifiedEntity } from './types.js';
import { HybridEntityRecognizer } from './recognizer.js';

/**
 * User context for access control
 */
export interface UserContext {
  /** User ID */
  userId: string;

  /** User role (ADMIN, ANALYST, VIEWER) */
  role: 'ADMIN' | 'ANALYST' | 'VIEWER' | string;

  /** Clearance level (0-10) */
  clearance: number;

  /** Purpose for data access */
  purpose?: 'investigation' | 'audit' | 'compliance' | 'legal' | 'export' | 'analysis';

  /** Step-up authentication token */
  stepUpToken?: string;

  /** Approval token for restricted access */
  approvalToken?: string;

  /** Manager ID who approved access */
  approvedBy?: string;

  /** Additional context */
  metadata?: Record<string, any>;
}

/**
 * Redaction strategy
 */
export enum RedactionStrategy {
  /** No redaction */
  NONE = 'NONE',

  /** Full redaction: [REDACTED] */
  FULL = 'FULL',

  /** Partial masking: show last N characters */
  PARTIAL = 'PARTIAL',

  /** Hash the value */
  HASH = 'HASH',

  /** Nullify the field */
  NULL = 'NULL',

  /** Remove the field entirely */
  REMOVE = 'REMOVE',
}

/**
 * Redaction options
 */
export interface RedactionOptions {
  /** Strategy to use */
  strategy: RedactionStrategy;

  /** Number of characters to show (for PARTIAL) */
  showLast?: number;

  /** Mask pattern (for PARTIAL) */
  maskPattern?: string;

  /** Preserve field structure (keep field with null value) */
  preserveStructure?: boolean;

  /** Reason for redaction (for audit) */
  reason?: string;
}

/**
 * Redaction result
 */
export interface RedactionResult {
  /** Redacted data */
  data: any;

  /** Fields that were redacted */
  redactedFields: string[];

  /** Number of fields redacted */
  redactedCount: number;

  /** Access was denied entirely */
  accessDenied: boolean;

  /** Reason for denial */
  denialReason?: string;

  /** Audit trail entry */
  auditEntry: {
    userId: string;
    action: string;
    timestamp: Date;
    fieldsRedacted: string[];
    dlpRules: string[];
    purpose?: string;
  };
}

/**
 * Policy decision for field access
 */
interface PolicyDecision {
  /** Allow access to field */
  allow: boolean;

  /** Redaction options if not fully allowed */
  redaction?: RedactionOptions;

  /** Reason for decision */
  reason: string;
}

/**
 * Redaction middleware
 */
export class RedactionMiddleware {
  private sensitivityClassifier: SensitivityClassifier;
  private metadataStore?: MetadataStore;
  private recognizer?: HybridEntityRecognizer;

  constructor(config?: { metadataStore?: MetadataStore }) {
    this.sensitivityClassifier = new SensitivityClassifier();
    this.metadataStore = config?.metadataStore;
    this.recognizer = new HybridEntityRecognizer();
  }

  /**
   * Redact data based on user context and sensitivity
   */
  async redact(
    data: any,
    userContext: UserContext,
    options?: {
      catalogId?: string;
      forceScan?: boolean;
    },
  ): Promise<RedactionResult> {
    const redactedFields: string[] = [];
    const dlpRules: string[] = [];

    // Check if user has required step-up authentication
    const requiresStepUp = this.checkStepUpRequirement(userContext);
    if (requiresStepUp && !userContext.stepUpToken) {
      return {
        data: null,
        redactedFields: [],
        redactedCount: 0,
        accessDenied: true,
        denialReason: 'Step-up authentication required',
        auditEntry: {
          userId: userContext.userId,
          action: 'ACCESS_DENIED',
          timestamp: new Date(),
          fieldsRedacted: [],
          dlpRules: ['require-step-up'],
          purpose: userContext.purpose,
        },
      };
    }

    // Check if purpose is required and provided
    const requiresPurpose = this.checkPurposeRequirement(userContext);
    if (requiresPurpose && !userContext.purpose) {
      return {
        data: null,
        redactedFields: [],
        redactedCount: 0,
        accessDenied: true,
        denialReason: 'Purpose justification required',
        auditEntry: {
          userId: userContext.userId,
          action: 'ACCESS_DENIED',
          timestamp: new Date(),
          fieldsRedacted: [],
          dlpRules: ['require-purpose'],
          purpose: userContext.purpose,
        },
      };
    }

    // Deep clone data
    let redactedData = JSON.parse(JSON.stringify(data));

    // Recursively redact fields
    const processValue = async (
      obj: any,
      path: string[] = [],
    ): Promise<void> => {
      if (obj === null || obj === undefined) {
        return;
      }

      if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
          await processValue(obj[i], [...path, String(i)]);
        }
        return;
      }

      if (typeof obj !== 'object') {
        return;
      }

      for (const key of Object.keys(obj)) {
        const currentPath = [...path, key];
        const value = obj[key];

        // Check if this field contains PII
        if (value && typeof value === 'string') {
          const decision = await this.evaluateFieldAccess(
            value,
            currentPath,
            userContext,
          );

          if (!decision.allow && decision.redaction) {
            const redacted = this.applyRedaction(
              value,
              decision.redaction,
            );
            obj[key] = redacted;
            redactedFields.push(currentPath.join('.'));
            dlpRules.push(decision.reason);
          }
        }

        // Recurse into nested objects/arrays
        if (typeof value === 'object') {
          await processValue(value, currentPath);
        }
      }
    };

    await processValue(redactedData);

    return {
      data: redactedData,
      redactedFields,
      redactedCount: redactedFields.length,
      accessDenied: false,
      auditEntry: {
        userId: userContext.userId,
        action: 'DATA_ACCESS',
        timestamp: new Date(),
        fieldsRedacted: redactedFields,
        dlpRules,
        purpose: userContext.purpose,
      },
    };
  }

  /**
   * Evaluate access to a specific field
   */
  private async evaluateFieldAccess(
    value: string,
    path: string[],
    userContext: UserContext,
  ): Promise<PolicyDecision> {
    if (!this.recognizer) {
      return { allow: true, reason: 'No PII detector configured' };
    }

    // Detect PII in the field value
    const result = await this.recognizer.recognize({
      value,
      schemaField: { fieldName: path[path.length - 1] },
    });

    if (result.entities.length === 0) {
      // No PII detected, allow access
      return { allow: true, reason: 'No PII detected' };
    }

    // Get the highest severity entity
    const severities = ['low', 'medium', 'high', 'critical'];
    const maxEntity = result.entities.reduce((max, entity) => {
      const entitySeverity = this.getPIISeverity(entity.type);
      const maxSeverityIndex = severities.indexOf(this.getPIISeverity(max.type));
      const currentSeverityIndex = severities.indexOf(entitySeverity);
      return currentSeverityIndex > maxSeverityIndex ? entity : max;
    });

    const severity = this.getPIISeverity(maxEntity.type);
    const piiType = maxEntity.type;

    // Apply role-based redaction policy
    const policy = this.getPolicyForRole(userContext.role, piiType, severity);

    // Check clearance level
    const requiredClearance = this.getRequiredClearance(severity);
    if (userContext.clearance < requiredClearance) {
      return {
        allow: false,
        redaction: {
          strategy: RedactionStrategy.FULL,
          reason: `Insufficient clearance (required: ${requiredClearance}, have: ${userContext.clearance})`,
        },
        reason: 'insufficient-clearance',
      };
    }

    // Return the policy decision
    return policy;
  }

  /**
   * Get redaction policy for role + PII type + severity
   */
  private getPolicyForRole(
    role: string,
    piiType: PIIType,
    severity: string,
  ): PolicyDecision {
    // ADMIN: No redaction
    if (role === 'ADMIN') {
      return { allow: true, reason: 'admin-access' };
    }

    // ANALYST: Partial redaction for high-severity
    if (role === 'ANALYST') {
      if (severity === 'critical') {
        return {
          allow: false,
          redaction: {
            strategy: RedactionStrategy.FULL,
            reason: 'Critical PII - ANALYST cannot access',
          },
          reason: 'critical-pii-blocked',
        };
      }
      if (severity === 'high') {
        return {
          allow: false,
          redaction: {
            strategy: RedactionStrategy.PARTIAL,
            showLast: 4,
            maskPattern: '***',
            reason: 'High-severity PII - partial redaction',
          },
          reason: 'high-severity-partial',
        };
      }
      return { allow: true, reason: 'analyst-access' };
    }

    // VIEWER: Heavy redaction
    if (role === 'VIEWER') {
      if (severity === 'critical' || severity === 'high') {
        return {
          allow: false,
          redaction: {
            strategy: RedactionStrategy.FULL,
            reason: 'High-severity PII - VIEWER cannot access',
          },
          reason: 'high-severity-blocked',
        };
      }
      if (severity === 'medium') {
        return {
          allow: false,
          redaction: {
            strategy: RedactionStrategy.PARTIAL,
            showLast: 2,
            maskPattern: '***',
            reason: 'Medium-severity PII - partial redaction',
          },
          reason: 'medium-severity-partial',
        };
      }
      return { allow: true, reason: 'viewer-low-severity' };
    }

    // Default: deny access
    return {
      allow: false,
      redaction: {
        strategy: RedactionStrategy.FULL,
        reason: 'Unknown role - default deny',
      },
      reason: 'unknown-role',
    };
  }

  /**
   * Apply redaction strategy to value
   */
  private applyRedaction(
    value: string,
    options: RedactionOptions,
  ): any {
    switch (options.strategy) {
      case RedactionStrategy.NONE:
        return value;

      case RedactionStrategy.FULL:
        return '[REDACTED]';

      case RedactionStrategy.PARTIAL:
        const showLast = options.showLast || 4;
        const maskPattern = options.maskPattern || '***';
        if (value.length <= showLast) {
          return maskPattern;
        }
        return maskPattern + value.slice(-showLast);

      case RedactionStrategy.HASH:
        // Simple hash (in production, use crypto)
        return `[HASH:${Buffer.from(value).toString('base64').slice(0, 16)}]`;

      case RedactionStrategy.NULL:
        return null;

      case RedactionStrategy.REMOVE:
        return undefined;

      default:
        return '[REDACTED]';
    }
  }

  /**
   * Get PII severity for a type (simplified - should use taxonomy)
   */
  private getPIISeverity(piiType: PIIType): 'low' | 'medium' | 'high' | 'critical' {
    const criticalTypes: PIIType[] = [
      'socialSecurityNumber',
      'creditCardNumber',
      'passportNumber',
      'healthRecordNumber',
      'biometricFingerprint',
      'biometricFace',
      'biometricDNA',
    ];

    const highTypes: PIIType[] = [
      'email',
      'phoneNumber',
      'driverLicenseNumber',
      'bankAccountNumber',
      'password',
    ];

    const mediumTypes: PIIType[] = [
      'fullName',
      'dateOfBirth',
      'homeAddress',
      'ipAddress',
    ];

    if (criticalTypes.includes(piiType)) return 'critical';
    if (highTypes.includes(piiType)) return 'high';
    if (mediumTypes.includes(piiType)) return 'medium';
    return 'low';
  }

  /**
   * Get required clearance for severity level
   */
  private getRequiredClearance(severity: string): number {
    switch (severity) {
      case 'critical': return 5;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  /**
   * Check if step-up authentication is required
   */
  private checkStepUpRequirement(userContext: UserContext): boolean {
    // Step-up required for high clearance data or sensitive purposes
    return userContext.clearance >= 3 ||
           userContext.purpose === 'export' ||
           userContext.purpose === 'legal';
  }

  /**
   * Check if purpose is required
   */
  private checkPurposeRequirement(userContext: UserContext): boolean {
    // Purpose required for non-ADMIN roles
    return userContext.role !== 'ADMIN' && userContext.clearance >= 2;
  }
}

/**
 * GraphQL middleware factory
 *
 * Wraps GraphQL resolvers to apply redaction
 */
export function createGraphQLRedactionMiddleware(
  middleware: RedactionMiddleware,
) {
  return (next: any) => async (
    root: any,
    args: any,
    context: any,
    info: any,
  ) => {
    // Call original resolver
    const result = await next(root, args, context, info);

    // Extract user context from GraphQL context
    const userContext: UserContext = {
      userId: context.user?.id || 'anonymous',
      role: context.user?.role || 'VIEWER',
      clearance: context.user?.clearance || 0,
      purpose: context.purpose,
      stepUpToken: context.stepUpToken,
      approvalToken: context.approvalToken,
    };

    // Apply redaction
    const redacted = await middleware.redact(result, userContext);

    if (redacted.accessDenied) {
      throw new Error(`Access denied: ${redacted.denialReason}`);
    }

    // TODO: Log audit entry to hash chain
    // await auditHashChain.appendEvent(redacted.auditEntry);

    return redacted.data;
  };
}

/**
 * REST API middleware for Express
 */
export function createRESTRedactionMiddleware(
  middleware: RedactionMiddleware,
) {
  return async (req: any, res: any, next: any) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to apply redaction
    res.json = async (data: any) => {
      const userContext: UserContext = {
        userId: req.user?.id || 'anonymous',
        role: req.user?.role || 'VIEWER',
        clearance: req.user?.clearance || 0,
        purpose: req.headers['x-purpose'],
        stepUpToken: req.headers['x-step-up-token'],
        approvalToken: req.headers['x-approval-token'],
      };

      const redacted = await middleware.redact(data, userContext);

      if (redacted.accessDenied) {
        return res.status(403).json({
          error: 'Access denied',
          reason: redacted.denialReason,
        });
      }

      // Add redaction metadata to response headers
      res.setHeader('X-Fields-Redacted', redacted.redactedCount);
      res.setHeader('X-DLP-Rules', redacted.auditEntry.dlpRules.join(','));

      return originalJson(redacted.data);
    };

    next();
  };
}
