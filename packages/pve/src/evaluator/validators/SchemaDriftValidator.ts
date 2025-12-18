/**
 * Schema Drift Validator
 *
 * Detects breaking changes in schema definitions.
 *
 * @module pve/evaluator/validators/SchemaDriftValidator
 */

import type {
  EvaluationContext,
  PolicyResult,
  SchemaDriftInput,
} from '../../types/index.js';
import { pass, fail, warn } from '../PolicyResult.js';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export interface SchemaDriftValidatorConfig {
  /** Allow adding new required fields */
  allowNewRequired?: boolean;
  /** Allow removing optional fields */
  allowRemoveOptional?: boolean;
  /** Allow type changes */
  allowTypeChanges?: boolean;
  /** Fields that can never change */
  immutableFields?: string[];
}

interface SchemaComparison {
  breaking: BreakingChange[];
  nonBreaking: NonBreakingChange[];
  additions: string[];
  removals: string[];
}

interface BreakingChange {
  path: string;
  type: string;
  message: string;
  previous?: unknown;
  current?: unknown;
}

interface NonBreakingChange {
  path: string;
  type: string;
  message: string;
}

const DEFAULT_CONFIG: SchemaDriftValidatorConfig = {
  allowNewRequired: false,
  allowRemoveOptional: false,
  allowTypeChanges: false,
  immutableFields: ['id', 'type'],
};

export class SchemaDriftValidator {
  private config: SchemaDriftValidatorConfig;
  private ajv: Ajv;

  constructor(config: SchemaDriftValidatorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(this.ajv);
  }

  async validate(context: EvaluationContext): Promise<PolicyResult[]> {
    if (context.type !== 'schema_drift') {
      return [];
    }

    const input = context.input as SchemaDriftInput;
    const results: PolicyResult[] = [];

    try {
      const previous = this.parseSchema(input.previous, input.schemaType);
      const current = this.parseSchema(input.current, input.schemaType);

      // Validate current schema is valid
      const validationResult = this.validateSchema(current, input.schemaType);
      if (!validationResult.valid) {
        results.push(
          fail('pve.schema.invalid', `Current schema is invalid: ${validationResult.errors?.join(', ')}`, {
            severity: 'error',
            location: input.filePath ? { file: input.filePath } : undefined,
          }),
        );
        return results;
      }
      results.push(pass('pve.schema.valid'));

      // Compare schemas
      const comparison = this.compareSchemas(previous, current);

      // Check for breaking changes
      if (comparison.breaking.length > 0) {
        for (const change of comparison.breaking) {
          results.push(
            fail('pve.schema.breaking_change', change.message, {
              severity: 'error',
              location: input.filePath ? { file: input.filePath, field: change.path } : undefined,
              details: {
                path: change.path,
                type: change.type,
                previous: change.previous,
                current: change.current,
              },
              fix: this.getSuggestedFix(change),
            }),
          );
        }
      } else {
        results.push(pass('pve.schema.breaking_change', 'No breaking changes detected'));
      }

      // Check immutable fields
      const immutableViolations = this.checkImmutableFields(comparison);
      if (immutableViolations.length > 0) {
        for (const violation of immutableViolations) {
          results.push(
            fail('pve.schema.immutable_field', `Immutable field changed: ${violation}`, {
              severity: 'error',
              location: input.filePath ? { file: input.filePath, field: violation } : undefined,
            }),
          );
        }
      } else {
        results.push(pass('pve.schema.immutable_field'));
      }

      // Report non-breaking changes as info
      if (comparison.additions.length > 0) {
        results.push(
          pass('pve.schema.additions', `Added ${comparison.additions.length} new field(s): ${comparison.additions.join(', ')}`),
        );
      }

      if (comparison.removals.length > 0 && !this.config.allowRemoveOptional) {
        results.push(
          warn('pve.schema.removals', `Removed ${comparison.removals.length} field(s): ${comparison.removals.join(', ')}`, {
            location: input.filePath ? { file: input.filePath } : undefined,
            fix: 'Mark fields as deprecated before removing them',
          }),
        );
      }
    } catch (error) {
      results.push(
        fail('pve.schema.parse_error', `Failed to parse schema: ${error instanceof Error ? error.message : String(error)}`, {
          severity: 'error',
          location: input.filePath ? { file: input.filePath } : undefined,
        }),
      );
    }

    return results;
  }

  private parseSchema(schema: string | object, schemaType: string): object {
    if (typeof schema === 'string') {
      switch (schemaType) {
        case 'json_schema':
          return JSON.parse(schema);
        case 'typescript':
          return this.parseTypeScript(schema);
        case 'graphql':
          return this.parseGraphQL(schema);
        default:
          return JSON.parse(schema);
      }
    }
    return schema;
  }

  private parseTypeScript(_schema: string): object {
    // Simplified TypeScript parsing - in production, use ts-morph or similar
    return { type: 'object', properties: {} };
  }

  private parseGraphQL(_schema: string): object {
    // Simplified GraphQL parsing - in production, use graphql-js
    return { type: 'object', properties: {} };
  }

  private validateSchema(
    schema: object,
    _schemaType: string,
  ): { valid: boolean; errors?: string[] } {
    try {
      this.ajv.compile(schema);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  private compareSchemas(previous: object, current: object): SchemaComparison {
    const result: SchemaComparison = {
      breaking: [],
      nonBreaking: [],
      additions: [],
      removals: [],
    };

    const prevProps = this.extractProperties(previous);
    const currProps = this.extractProperties(current);
    const prevRequired = this.extractRequired(previous);
    const currRequired = this.extractRequired(current);

    // Check for removed fields
    for (const [key, value] of Object.entries(prevProps)) {
      if (!(key in currProps)) {
        result.removals.push(key);
        if (prevRequired.has(key)) {
          result.breaking.push({
            path: key,
            type: 'field_removed',
            message: `Required field "${key}" was removed`,
            previous: value,
          });
        }
      }
    }

    // Check for added fields and type changes
    for (const [key, value] of Object.entries(currProps)) {
      if (!(key in prevProps)) {
        result.additions.push(key);
        if (currRequired.has(key) && !this.config.allowNewRequired) {
          result.breaking.push({
            path: key,
            type: 'required_field_added',
            message: `New required field "${key}" was added`,
            current: value,
          });
        }
      } else {
        // Check type changes
        const prevType = this.getFieldType(prevProps[key]);
        const currType = this.getFieldType(value);
        if (prevType !== currType && !this.config.allowTypeChanges) {
          result.breaking.push({
            path: key,
            type: 'type_changed',
            message: `Type of field "${key}" changed from "${prevType}" to "${currType}"`,
            previous: prevType,
            current: currType,
          });
        }
      }
    }

    // Check for new required fields
    for (const req of currRequired) {
      if (!prevRequired.has(req) && req in prevProps) {
        result.breaking.push({
          path: req,
          type: 'made_required',
          message: `Field "${req}" was made required`,
        });
      }
    }

    return result;
  }

  private extractProperties(schema: object): Record<string, unknown> {
    const s = schema as { properties?: Record<string, unknown> };
    return s.properties || {};
  }

  private extractRequired(schema: object): Set<string> {
    const s = schema as { required?: string[] };
    return new Set(s.required || []);
  }

  private getFieldType(field: unknown): string {
    if (typeof field !== 'object' || field === null) {
      return String(field);
    }
    const f = field as { type?: string | string[] };
    if (Array.isArray(f.type)) {
      return f.type.join('|');
    }
    return f.type || 'unknown';
  }

  private checkImmutableFields(comparison: SchemaComparison): string[] {
    const violations: string[] = [];
    const changedPaths = new Set([
      ...comparison.breaking.map((b) => b.path),
      ...comparison.removals,
    ]);

    for (const field of this.config.immutableFields || []) {
      if (changedPaths.has(field)) {
        violations.push(field);
      }
    }

    return violations;
  }

  private getSuggestedFix(change: BreakingChange): string {
    switch (change.type) {
      case 'field_removed':
        return `Deprecate the field "${change.path}" first, then remove it in a later version`;
      case 'required_field_added':
        return `Make the field "${change.path}" optional with a default value`;
      case 'type_changed':
        return `Keep the old type and add a new field with the new type, then deprecate the old one`;
      case 'made_required':
        return `Keep the field "${change.path}" optional and handle missing values in code`;
      default:
        return 'Consider making the change backwards-compatible';
    }
  }
}
