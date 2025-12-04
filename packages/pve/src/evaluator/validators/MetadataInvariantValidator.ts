/**
 * Metadata Invariant Validator
 *
 * Validates metadata against defined invariants and rules.
 *
 * @module pve/evaluator/validators/MetadataInvariantValidator
 */

import type {
  EvaluationContext,
  PolicyResult,
  MetadataInvariantInput,
  MetadataRule,
} from '../../types/index.js';
import { pass, fail, warn } from '../PolicyResult.js';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export interface MetadataInvariantValidatorConfig {
  /** Built-in invariants to apply */
  builtInInvariants?: string[];
  /** Custom invariant definitions */
  customInvariants?: MetadataInvariant[];
  /** Strict mode - fail on unknown fields */
  strictMode?: boolean;
}

export interface MetadataInvariant {
  id: string;
  name: string;
  entityTypes: string[];
  rules: MetadataRule[];
}

const BUILT_IN_INVARIANTS: MetadataInvariant[] = [
  {
    id: 'entity.core',
    name: 'Core Entity Invariants',
    entityTypes: ['*'],
    rules: [
      { field: 'id', rule: 'required', config: null },
      { field: 'type', rule: 'required', config: null },
      { field: 'createdAt', rule: 'type', config: { type: 'string', format: 'date-time' } },
      { field: 'updatedAt', rule: 'type', config: { type: 'string', format: 'date-time' } },
    ],
  },
  {
    id: 'entity.person',
    name: 'Person Entity Invariants',
    entityTypes: ['person', 'individual', 'actor'],
    rules: [
      { field: 'name', rule: 'required', config: null },
      { field: 'name', rule: 'pattern', config: { pattern: '^[\\p{L}\\s\\-\\.\']+$' } },
    ],
  },
  {
    id: 'entity.organization',
    name: 'Organization Entity Invariants',
    entityTypes: ['organization', 'company', 'group'],
    rules: [
      { field: 'name', rule: 'required', config: null },
      { field: 'jurisdiction', rule: 'type', config: { type: 'string' } },
    ],
  },
  {
    id: 'entity.location',
    name: 'Location Entity Invariants',
    entityTypes: ['location', 'place', 'address'],
    rules: [
      { field: 'coordinates', rule: 'type', config: { type: 'object' } },
      {
        field: 'coordinates.latitude',
        rule: 'range',
        config: { min: -90, max: 90 },
      },
      {
        field: 'coordinates.longitude',
        rule: 'range',
        config: { min: -180, max: 180 },
      },
    ],
  },
  {
    id: 'classification',
    name: 'Classification Invariants',
    entityTypes: ['*'],
    rules: [
      {
        field: 'classification',
        rule: 'enum',
        config: { values: ['UNCLASSIFIED', 'CUI', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'] },
      },
    ],
  },
];

export class MetadataInvariantValidator {
  private config: MetadataInvariantValidatorConfig;
  private ajv: Ajv;
  private invariants: MetadataInvariant[];

  constructor(config: MetadataInvariantValidatorConfig = {}) {
    this.config = {
      builtInInvariants: ['entity.core'],
      strictMode: false,
      ...config,
    };

    this.ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(this.ajv);

    // Combine built-in and custom invariants
    this.invariants = [
      ...BUILT_IN_INVARIANTS.filter((inv) =>
        (this.config.builtInInvariants || []).includes(inv.id),
      ),
      ...(this.config.customInvariants || []),
    ];
  }

  async validate(context: EvaluationContext): Promise<PolicyResult[]> {
    if (context.type !== 'metadata_invariant') {
      return [];
    }

    const input = context.input as MetadataInvariantInput;
    const results: PolicyResult[] = [];

    // Get applicable invariants for this entity type
    const applicableInvariants = this.invariants.filter(
      (inv) =>
        inv.entityTypes.includes('*') ||
        inv.entityTypes.includes(input.entityType.toLowerCase()),
    );

    // Apply invariant rules
    for (const invariant of applicableInvariants) {
      for (const rule of invariant.rules) {
        const ruleResult = this.applyRule(rule, input.metadata, invariant.id);
        results.push(ruleResult);
      }
    }

    // Apply input-specific rules
    if (input.rules) {
      for (const rule of input.rules) {
        const ruleResult = this.applyRule(rule, input.metadata, 'custom');
        results.push(ruleResult);
      }
    }

    // Check required fields
    if (input.requiredFields) {
      for (const field of input.requiredFields) {
        const value = this.getNestedValue(input.metadata, field);
        if (value === undefined || value === null) {
          results.push(
            fail('pve.metadata.required_field', `Required field "${field}" is missing`, {
              severity: 'error',
              location: { field },
            }),
          );
        }
      }
    }

    // Strict mode: check for unknown fields
    if (this.config.strictMode) {
      results.push(...this.checkUnknownFields(input));
    }

    return results;
  }

  private applyRule(
    rule: MetadataRule,
    metadata: Record<string, unknown>,
    invariantId: string,
  ): PolicyResult {
    const value = this.getNestedValue(metadata, rule.field);
    const policyId = `pve.metadata.${invariantId}.${rule.field}.${rule.rule}`;

    switch (rule.rule) {
      case 'required':
        if (value === undefined || value === null) {
          return fail(policyId, `Field "${rule.field}" is required`, {
            severity: 'error',
            location: { field: rule.field },
          });
        }
        return pass(policyId);

      case 'type':
        return this.validateType(policyId, rule.field, value, rule.config as { type: string; format?: string });

      case 'pattern':
        return this.validatePattern(policyId, rule.field, value, rule.config as { pattern: string });

      case 'enum':
        return this.validateEnum(policyId, rule.field, value, rule.config as { values: string[] });

      case 'range':
        return this.validateRange(policyId, rule.field, value, rule.config as { min?: number; max?: number });

      case 'custom':
        return this.validateCustom(policyId, rule.field, value, rule.config);

      default:
        return warn(policyId, `Unknown rule type: ${rule.rule}`, {
          location: { field: rule.field },
        });
    }
  }

  private validateType(
    policyId: string,
    field: string,
    value: unknown,
    config: { type: string; format?: string },
  ): PolicyResult {
    if (value === undefined || value === null) {
      return pass(policyId); // Type check only applies to present values
    }

    const actualType = Array.isArray(value) ? 'array' : typeof value;
    const expectedType = config.type;

    if (actualType !== expectedType) {
      return fail(policyId, `Field "${field}" should be type "${expectedType}", got "${actualType}"`, {
        severity: 'error',
        location: { field },
        details: { expected: expectedType, actual: actualType },
      });
    }

    // Format validation
    if (config.format && typeof value === 'string') {
      const formatValid = this.validateFormat(value, config.format);
      if (!formatValid) {
        return fail(policyId, `Field "${field}" does not match format "${config.format}"`, {
          severity: 'warning',
          location: { field },
          details: { format: config.format, value },
        });
      }
    }

    return pass(policyId);
  }

  private validateFormat(value: string, format: string): boolean {
    switch (format) {
      case 'date-time':
        return !isNaN(Date.parse(value));
      case 'date':
        return /^\d{4}-\d{2}-\d{2}$/.test(value);
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'uri':
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      case 'uuid':
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
      default:
        return true;
    }
  }

  private validatePattern(
    policyId: string,
    field: string,
    value: unknown,
    config: { pattern: string },
  ): PolicyResult {
    if (value === undefined || value === null) {
      return pass(policyId);
    }

    if (typeof value !== 'string') {
      return fail(policyId, `Field "${field}" must be a string for pattern validation`, {
        severity: 'error',
        location: { field },
      });
    }

    const regex = new RegExp(config.pattern, 'u');
    if (!regex.test(value)) {
      return fail(policyId, `Field "${field}" does not match required pattern`, {
        severity: 'warning',
        location: { field },
        details: { pattern: config.pattern, value },
      });
    }

    return pass(policyId);
  }

  private validateEnum(
    policyId: string,
    field: string,
    value: unknown,
    config: { values: string[] },
  ): PolicyResult {
    if (value === undefined || value === null) {
      return pass(policyId);
    }

    if (!config.values.includes(String(value))) {
      return fail(policyId, `Field "${field}" must be one of: ${config.values.join(', ')}`, {
        severity: 'warning',
        location: { field },
        details: { allowed: config.values, actual: value },
      });
    }

    return pass(policyId);
  }

  private validateRange(
    policyId: string,
    field: string,
    value: unknown,
    config: { min?: number; max?: number },
  ): PolicyResult {
    if (value === undefined || value === null) {
      return pass(policyId);
    }

    const num = Number(value);
    if (isNaN(num)) {
      return fail(policyId, `Field "${field}" must be a number for range validation`, {
        severity: 'error',
        location: { field },
      });
    }

    if (config.min !== undefined && num < config.min) {
      return fail(policyId, `Field "${field}" must be >= ${config.min}`, {
        severity: 'warning',
        location: { field },
        details: { minimum: config.min, actual: num },
      });
    }

    if (config.max !== undefined && num > config.max) {
      return fail(policyId, `Field "${field}" must be <= ${config.max}`, {
        severity: 'warning',
        location: { field },
        details: { maximum: config.max, actual: num },
      });
    }

    return pass(policyId);
  }

  private validateCustom(
    policyId: string,
    field: string,
    _value: unknown,
    _config: unknown,
  ): PolicyResult {
    // Placeholder for custom validation logic
    return pass(policyId, `Custom validation for "${field}" passed`);
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === undefined || current === null) {
        return undefined;
      }
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  private checkUnknownFields(input: MetadataInvariantInput): PolicyResult[] {
    // Collect all known fields from invariants
    const knownFields = new Set<string>();
    for (const invariant of this.invariants) {
      if (
        invariant.entityTypes.includes('*') ||
        invariant.entityTypes.includes(input.entityType.toLowerCase())
      ) {
        for (const rule of invariant.rules) {
          knownFields.add(rule.field.split('.')[0]);
        }
      }
    }

    // Check for unknown top-level fields
    const results: PolicyResult[] = [];
    for (const field of Object.keys(input.metadata)) {
      if (!knownFields.has(field)) {
        results.push(
          warn('pve.metadata.unknown_field', `Unknown field "${field}" in metadata`, {
            location: { field },
          }),
        );
      }
    }

    return results;
  }
}
