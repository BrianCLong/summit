/**
 * Copilot Integration for PII Detection and Redaction
 *
 * Enhances the copilot's GuardedGenerator with comprehensive PII detection
 * and context-aware redaction based on user clearance levels.
 */

import { HybridEntityRecognizer } from './recognizer.js';
import { SensitivityClassifier, SensitivityClass } from './sensitivity.js';
import { RedactionMiddleware, UserContext } from './redactionMiddleware.js';
import { PIIType, ClassifiedEntity } from './types.js';

/**
 * Copilot context including user clearance and purpose
 */
export interface CopilotContext {
  /** User making the request */
  user: UserContext;

  /** Investigation ID */
  investigationId?: string;

  /** Query or prompt text */
  query: string;

  /** Maximum sensitivity level allowed in response */
  maxSensitivity?: SensitivityClass;

  /** Whether to include redaction notices in output */
  includeRedactionNotices?: boolean;
}

/**
 * Guarded generation result
 */
export interface GuardedGenerationResult {
  /** Generated content (redacted) */
  content: string;

  /** Original content (before redaction) */
  originalContent?: string;

  /** PII entities detected */
  detectedEntities: ClassifiedEntity[];

  /** Fields that were redacted */
  redactedFields: string[];

  /** Warnings about sensitivity */
  warnings: string[];

  /** Whether access was restricted */
  restricted: boolean;

  /** Restrictions applied */
  restrictions?: {
    reason: string;
    sensitivity: SensitivityClass;
    requiredClearance: number;
  };
}

/**
 * Enhanced GuardedGenerator with comprehensive PII protection
 */
export class EnhancedGuardedGenerator {
  private recognizer: HybridEntityRecognizer;
  private classifier: SensitivityClassifier;
  private redactionMiddleware: RedactionMiddleware;

  constructor() {
    this.recognizer = new HybridEntityRecognizer();
    this.classifier = new SensitivityClassifier();
    this.redactionMiddleware = new RedactionMiddleware();
  }

  /**
   * Guard and redact copilot output
   */
  async guard(
    content: string,
    context: CopilotContext,
  ): Promise<GuardedGenerationResult> {
    const warnings: string[] = [];
    const redactedFields: string[] = [];

    // Detect PII in the content
    const detection = await this.recognizer.recognize({
      value: content,
      additionalContext: {
        source: 'copilot',
        investigationId: context.investigationId,
      },
    });

    // Classify detected entities
    const classifiedEntities: ClassifiedEntity[] = [];
    for (const entity of detection.entities) {
      // Get severity from recognizer or taxonomy
      const severity = this.getSeverityForPIIType(entity.type);

      const classified: ClassifiedEntity = {
        ...entity,
        severity,
        taxonomy: 'global-default',
        categories: this.getCategoriesForPIIType(entity.type),
        policyTags: this.getPolicyTagsForSeverity(severity),
      };

      classifiedEntities.push(classified);
    }

    // Check if user has clearance for detected PII
    const { allowed, restricted, reason } = this.checkClearance(
      classifiedEntities,
      context.user.clearance,
    );

    if (!allowed) {
      // User doesn't have clearance - return restricted response
      return {
        content: '[CONTENT REDACTED - Insufficient Clearance]',
        originalContent: content,
        detectedEntities: classifiedEntities,
        redactedFields: ['*'],
        warnings: [
          `This content contains ${classifiedEntities.length} PII field(s) that require higher clearance.`,
          `Required clearance: ${restricted?.requiredClearance}, your clearance: ${context.user.clearance}`,
        ],
        restricted: true,
        restrictions: restricted,
      };
    }

    // Redact specific PII fields based on role and severity
    let redactedContent = content;

    for (const entity of classifiedEntities) {
      const shouldRedact = this.shouldRedactEntity(entity, context.user);

      if (shouldRedact) {
        const redacted = this.redactPII(
          entity.value,
          entity.type,
          entity.severity,
          context.user.role,
        );

        redactedContent = redactedContent.replace(entity.value, redacted);
        redactedFields.push(entity.type);

        if (context.includeRedactionNotices) {
          warnings.push(
            `[NOTICE: ${entity.type} redacted due to ${entity.severity} severity]`,
          );
        }
      }
    }

    // Add sensitivity warnings for high-severity data
    const highSeverityEntities = classifiedEntities.filter(
      e => e.severity === 'high' || e.severity === 'critical',
    );

    if (highSeverityEntities.length > 0) {
      warnings.push(
        `This response contains ${highSeverityEntities.length} high-sensitivity field(s). ` +
        `Handle with appropriate care and do not share without authorization.`,
      );
    }

    return {
      content: redactedContent,
      originalContent: content,
      detectedEntities: classifiedEntities,
      redactedFields,
      warnings,
      restricted: false,
    };
  }

  /**
   * Guard copilot input (prompts) to prevent PII leakage
   */
  async guardInput(
    prompt: string,
    context: CopilotContext,
  ): Promise<{
    sanitized: string;
    detectedPII: ClassifiedEntity[];
    warnings: string[];
  }> {
    const warnings: string[] = [];

    // Detect PII in the prompt
    const detection = await this.recognizer.recognize({
      value: prompt,
      additionalContext: {
        source: 'copilot-input',
        investigationId: context.investigationId,
      },
    });

    const classifiedEntities: ClassifiedEntity[] = [];
    for (const entity of detection.entities) {
      const severity = this.getSeverityForPIIType(entity.type);
      classifiedEntities.push({
        ...entity,
        severity,
        taxonomy: 'global-default',
        categories: this.getCategoriesForPIIType(entity.type),
        policyTags: this.getPolicyTagsForSeverity(severity),
      });
    }

    // Sanitize critical PII from prompts to prevent leakage to LLM
    let sanitized = prompt;
    const criticalPII = classifiedEntities.filter(e => e.severity === 'critical');

    for (const entity of criticalPII) {
      // Replace with placeholder
      sanitized = sanitized.replace(
        entity.value,
        `[${entity.type.toUpperCase()}_REDACTED]`,
      );

      warnings.push(
        `Critical PII (${entity.type}) was removed from your prompt to prevent leakage.`,
      );
    }

    return {
      sanitized,
      detectedPII: classifiedEntities,
      warnings,
    };
  }

  /**
   * Check if user has clearance for detected PII
   */
  private checkClearance(
    entities: ClassifiedEntity[],
    userClearance: number,
  ): {
    allowed: boolean;
    restricted?: {
      reason: string;
      sensitivity: SensitivityClass;
      requiredClearance: number;
    };
  } {
    if (entities.length === 0) {
      return { allowed: true };
    }

    // Get highest severity
    const severities = ['low', 'medium', 'high', 'critical'];
    const maxSeverity = entities.reduce((max, entity) => {
      const maxIdx = severities.indexOf(max);
      const currentIdx = severities.indexOf(entity.severity);
      return currentIdx > maxIdx ? entity.severity : max;
    }, 'low' as 'low' | 'medium' | 'high' | 'critical');

    // Determine required clearance
    const requiredClearance = this.getRequiredClearance(maxSeverity);

    if (userClearance < requiredClearance) {
      const sensitivity = this.severityToSensitivityClass(maxSeverity);
      return {
        allowed: false,
        restricted: {
          reason: `Content contains ${maxSeverity}-severity PII`,
          sensitivity,
          requiredClearance,
        },
      };
    }

    return { allowed: true };
  }

  /**
   * Check if entity should be redacted based on user role and severity
   */
  private shouldRedactEntity(
    entity: ClassifiedEntity,
    user: UserContext,
  ): boolean {
    // ADMIN: never redact
    if (user.role === 'ADMIN') {
      return false;
    }

    // ANALYST: redact critical PII
    if (user.role === 'ANALYST') {
      return entity.severity === 'critical';
    }

    // VIEWER: redact high and critical PII
    if (user.role === 'VIEWER') {
      return entity.severity === 'high' || entity.severity === 'critical';
    }

    // Default: redact
    return true;
  }

  /**
   * Redact PII value based on type and severity
   */
  private redactPII(
    value: string,
    piiType: PIIType,
    severity: 'low' | 'medium' | 'high' | 'critical',
    role: string,
  ): string {
    // Critical and high severity: full redaction
    if (severity === 'critical') {
      return '[REDACTED]';
    }

    if (severity === 'high') {
      // Partial masking for ANALYST
      if (role === 'ANALYST') {
        return this.partialMask(value, 4);
      }
      return '[REDACTED]';
    }

    // Medium severity: partial masking
    if (severity === 'medium') {
      return this.partialMask(value, 6);
    }

    // Low severity: minimal masking or no redaction
    return value;
  }

  /**
   * Apply partial masking to value
   */
  private partialMask(value: string, showLast: number): string {
    if (value.length <= showLast) {
      return '***';
    }
    return '***' + value.slice(-showLast);
  }

  /**
   * Get severity for PII type
   */
  private getSeverityForPIIType(
    piiType: PIIType,
  ): 'low' | 'medium' | 'high' | 'critical' {
    const criticalTypes: PIIType[] = [
      'socialSecurityNumber',
      'creditCardNumber',
      'passportNumber',
      'healthRecordNumber',
      'biometricFingerprint',
      'biometricFace',
      'biometricDNA',
      'password',
      'accountToken',
      'cardSecurityCode',
    ];

    const highTypes: PIIType[] = [
      'email',
      'phoneNumber',
      'driverLicenseNumber',
      'bankAccountNumber',
      'debitCardNumber',
      'taxId',
      'patientId',
    ];

    const mediumTypes: PIIType[] = [
      'fullName',
      'dateOfBirth',
      'homeAddress',
      'ipAddress',
      'employeeId',
    ];

    if (criticalTypes.includes(piiType)) return 'critical';
    if (highTypes.includes(piiType)) return 'high';
    if (mediumTypes.includes(piiType)) return 'medium';
    return 'low';
  }

  /**
   * Get categories for PII type
   */
  private getCategoriesForPIIType(piiType: PIIType): string[] {
    // Simplified - in production, use taxonomy
    if (piiType.includes('biometric')) return ['biometric'];
    if (piiType.includes('health') || piiType.includes('medical')) return ['health'];
    if (piiType.includes('credit') || piiType.includes('bank')) return ['financial'];
    if (piiType.includes('passport') || piiType.includes('license')) return ['government', 'identity'];
    return ['identity'];
  }

  /**
   * Get policy tags for severity
   */
  private getPolicyTagsForSeverity(severity: string): string[] {
    switch (severity) {
      case 'critical':
        return ['restricted', 'audit', 'high-risk'];
      case 'high':
        return ['confidential', 'audit'];
      case 'medium':
        return ['internal'];
      case 'low':
        return [];
      default:
        return [];
    }
  }

  /**
   * Get required clearance for severity
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
   * Map severity to sensitivity class
   */
  private severityToSensitivityClass(
    severity: 'low' | 'medium' | 'high' | 'critical',
  ): SensitivityClass {
    switch (severity) {
      case 'critical': return SensitivityClass.TOP_SECRET;
      case 'high': return SensitivityClass.HIGHLY_SENSITIVE;
      case 'medium': return SensitivityClass.CONFIDENTIAL;
      case 'low': return SensitivityClass.INTERNAL;
      default: return SensitivityClass.PUBLIC;
    }
  }
}

/**
 * Factory to create enhanced guarded generator
 */
export function createEnhancedGuardedGenerator(): EnhancedGuardedGenerator {
  return new EnhancedGuardedGenerator();
}

/**
 * Middleware for copilot requests
 */
export async function applyCopilotPIIGuard(
  input: string,
  output: string,
  context: CopilotContext,
): Promise<{
  guardedInput: string;
  guardedOutput: string;
  warnings: string[];
  audit: {
    piiDetectedInInput: number;
    piiDetectedInOutput: number;
    redactedFields: string[];
  };
}> {
  const generator = createEnhancedGuardedGenerator();

  // Guard input
  const inputGuard = await generator.guardInput(input, context);

  // Guard output
  const outputGuard = await generator.guard(output, context);

  return {
    guardedInput: inputGuard.sanitized,
    guardedOutput: outputGuard.content,
    warnings: [...inputGuard.warnings, ...outputGuard.warnings],
    audit: {
      piiDetectedInInput: inputGuard.detectedPII.length,
      piiDetectedInOutput: outputGuard.detectedEntities.length,
      redactedFields: outputGuard.redactedFields,
    },
  };
}
