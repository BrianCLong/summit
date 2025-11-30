/**
 * Redaction and Transformation Engine
 *
 * Applies redaction rules to data before sharing across federation boundaries.
 * Supports: redaction, pseudonymization, hashing, field removal.
 */

import crypto from 'crypto';
import pino from 'pino';
import { RedactionRule } from '../models/types.js';

const logger = pino({ name: 'redaction-engine' });

/**
 * Result of redaction operation
 */
export interface RedactionResult {
  data: Record<string, unknown>;
  redactedFields: string[];
  transformationApplied: boolean;
}

/**
 * Redaction Engine Service
 */
export class RedactionEngine {
  private pseudonymCache: Map<string, string> = new Map();

  /**
   * Apply redaction rules to an object
   */
  applyRedactions(
    data: Record<string, unknown>,
    rules: RedactionRule[]
  ): RedactionResult {
    logger.info({ ruleCount: rules.length }, 'Applying redaction rules');

    const redactedData = this.deepClone(data);
    const redactedFields: string[] = [];
    let transformationApplied = false;

    for (const rule of rules) {
      const applied = this.applyRule(redactedData, rule);
      if (applied) {
        redactedFields.push(rule.field);
        transformationApplied = true;
      }
    }

    logger.info(
      {
        redactedFieldCount: redactedFields.length,
        transformationApplied,
      },
      'Redaction complete'
    );

    return {
      data: redactedData,
      redactedFields,
      transformationApplied,
    };
  }

  /**
   * Apply a single redaction rule
   */
  private applyRule(data: Record<string, unknown>, rule: RedactionRule): boolean {
    const fieldPath = rule.field.split('.');
    let applied = false;

    // Navigate to the field
    let current: any = data;
    for (let i = 0; i < fieldPath.length - 1; i++) {
      if (!current[fieldPath[i]]) {
        // Field doesn't exist, skip
        return false;
      }
      current = current[fieldPath[i]];
    }

    const fieldName = fieldPath[fieldPath.length - 1];
    if (!(fieldName in current)) {
      // Field doesn't exist, skip
      return false;
    }

    const originalValue = current[fieldName];

    switch (rule.action) {
      case 'redact':
        current[fieldName] = rule.replacement || '[REDACTED]';
        applied = true;
        logger.debug({ field: rule.field }, 'Field redacted');
        break;

      case 'pseudonymize':
        current[fieldName] = this.pseudonymize(
          String(originalValue),
          rule.replacement
        );
        applied = true;
        logger.debug({ field: rule.field }, 'Field pseudonymized');
        break;

      case 'hash':
        current[fieldName] = this.hashValue(String(originalValue));
        applied = true;
        logger.debug({ field: rule.field }, 'Field hashed');
        break;

      case 'remove':
        delete current[fieldName];
        applied = true;
        logger.debug({ field: rule.field }, 'Field removed');
        break;

      default:
        logger.warn({ action: rule.action }, 'Unknown redaction action');
    }

    return applied;
  }

  /**
   * Pseudonymize a value (consistent mapping)
   */
  private pseudonymize(value: string, template?: string): string {
    // Check cache first
    if (this.pseudonymCache.has(value)) {
      return this.pseudonymCache.get(value)!;
    }

    // Generate pseudonym
    let pseudonym: string;
    if (template) {
      // Use template (e.g., "Person {id}")
      const id = this.generateId(value);
      pseudonym = template.replace('{id}', id);
    } else {
      // Default: hash-based pseudonym
      pseudonym = `PSEUDO_${this.generateId(value)}`;
    }

    // Cache for consistency
    this.pseudonymCache.set(value, pseudonym);

    return pseudonym;
  }

  /**
   * Generate a consistent ID from a value
   */
  private generateId(value: string): string {
    const hash = crypto.createHash('sha256').update(value).digest('hex');
    // Return first 8 chars for readability
    return hash.substring(0, 8).toUpperCase();
  }

  /**
   * Hash a value (one-way)
   */
  private hashValue(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  /**
   * Deep clone an object
   */
  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Clear pseudonym cache (for testing or privacy)
   */
  clearCache(): void {
    this.pseudonymCache.clear();
    logger.info('Pseudonym cache cleared');
  }

  /**
   * Apply field-level transformations for specific object types
   */
  applyTypeSpecificTransformations(
    data: Record<string, unknown>,
    objectType: string
  ): Record<string, unknown> {
    const transformed = this.deepClone(data);

    // Type-specific transformations
    switch (objectType) {
      case 'ENTITY':
        // For entities, always redact internal IDs
        if ('internalId' in transformed) {
          delete transformed.internalId;
        }
        break;

      case 'CASE':
        // For cases, redact case officer names if present
        if ('assignedOfficer' in transformed) {
          transformed.assignedOfficer = '[REDACTED]';
        }
        break;

      case 'DOCUMENT':
        // For documents, remove file paths
        if ('filePath' in transformed) {
          delete transformed.filePath;
        }
        if ('localPath' in transformed) {
          delete transformed.localPath;
        }
        break;
    }

    return transformed;
  }

  /**
   * Validate that redaction was successful
   */
  validateRedaction(
    original: Record<string, unknown>,
    redacted: Record<string, unknown>,
    rules: RedactionRule[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const rule of rules) {
      const fieldPath = rule.field.split('.');
      const originalValue = this.getNestedValue(original, fieldPath);
      const redactedValue = this.getNestedValue(redacted, fieldPath);

      if (rule.action === 'remove') {
        if (redactedValue !== undefined) {
          errors.push(`Field ${rule.field} should have been removed`);
        }
      } else {
        if (originalValue === redactedValue && originalValue !== undefined) {
          errors.push(`Field ${rule.field} was not transformed`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string[]): any {
    let current = obj;
    for (const key of path) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }
    return current;
  }
}

export const redactionEngine = new RedactionEngine();
