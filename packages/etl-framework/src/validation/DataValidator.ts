/**
 * Data quality and validation engine
 */

import { Logger } from 'winston';
import { TransformationConfig, ValidationRule, PipelineError } from '@intelgraph/data-integration/src/types';

export interface ValidationResult {
  isValid: boolean;
  failedRecords: number[];
  errors: PipelineError[];
  warnings: PipelineError[];
}

export class DataValidator {
  private config: TransformationConfig | undefined;
  private logger: Logger;

  constructor(config: TransformationConfig | undefined, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Validate data according to configured rules
   */
  async validate(data: any[]): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      failedRecords: [],
      errors: [],
      warnings: []
    };

    if (!this.config || !this.config.validations || this.config.validations.length === 0) {
      return result;
    }

    for (let i = 0; i < data.length; i++) {
      const record = data[i];

      for (const rule of this.config.validations) {
        const violation = await this.validateRule(record, rule, i);

        if (violation) {
          if (rule.severity === 'error') {
            result.errors.push(violation);
            result.failedRecords.push(i);
            result.isValid = false;
          } else if (rule.severity === 'warning') {
            result.warnings.push(violation);
          }
        }
      }
    }

    this.logger.info(`Validation completed: ${result.errors.length} errors, ${result.warnings.length} warnings`);

    return result;
  }

  private async validateRule(
    record: any,
    rule: ValidationRule,
    recordIndex: number
  ): Promise<PipelineError | null> {
    try {
      switch (rule.type) {
        case 'schema':
          return this.validateSchema(record, rule, recordIndex);
        case 'type':
          return this.validateType(record, rule, recordIndex);
        case 'null':
          return this.validateNull(record, rule, recordIndex);
        case 'duplicate':
          return this.validateDuplicate(record, rule, recordIndex);
        case 'range':
          return this.validateRange(record, rule, recordIndex);
        case 'format':
          return this.validateFormat(record, rule, recordIndex);
        case 'referential':
          return this.validateReferential(record, rule, recordIndex);
        case 'custom':
          return this.validateCustom(record, rule, recordIndex);
        default:
          return null;
      }
    } catch (error) {
      this.logger.error(`Error validating rule ${rule.name}`, { error });
      return null;
    }
  }

  private validateSchema(record: any, rule: ValidationRule, recordIndex: number): PipelineError | null {
    const requiredFields = rule.config.requiredFields || [];

    for (const field of requiredFields) {
      if (!(field in record)) {
        return {
          timestamp: new Date(),
          stage: 'validation',
          message: `Missing required field: ${field}`,
          recordId: String(recordIndex)
        };
      }
    }

    return null;
  }

  private validateType(record: any, rule: ValidationRule, recordIndex: number): PipelineError | null {
    const field = rule.config.field;
    const expectedType = rule.config.expectedType;

    if (!(field in record)) {
      return null; // Field doesn't exist, let schema validation handle it
    }

    const actualType = typeof record[field];

    if (actualType !== expectedType) {
      return {
        timestamp: new Date(),
        stage: 'validation',
        message: `Type mismatch for field ${field}: expected ${expectedType}, got ${actualType}`,
        recordId: String(recordIndex)
      };
    }

    return null;
  }

  private validateNull(record: any, rule: ValidationRule, recordIndex: number): PipelineError | null {
    const field = rule.config.field;
    const allowNull = rule.config.allowNull || false;

    if (!allowNull && (record[field] == null || record[field] === '')) {
      return {
        timestamp: new Date(),
        stage: 'validation',
        message: `Null/empty value not allowed for field: ${field}`,
        recordId: String(recordIndex)
      };
    }

    return null;
  }

  private validateDuplicate(record: any, rule: ValidationRule, recordIndex: number): PipelineError | null {
    // Would implement duplicate detection using a hash set or database lookup
    return null;
  }

  private validateRange(record: any, rule: ValidationRule, recordIndex: number): PipelineError | null {
    const field = rule.config.field;
    const min = rule.config.min;
    const max = rule.config.max;
    const value = record[field];

    if (value == null) {
      return null;
    }

    if ((min != null && value < min) || (max != null && value > max)) {
      return {
        timestamp: new Date(),
        stage: 'validation',
        message: `Value ${value} for field ${field} out of range [${min}, ${max}]`,
        recordId: String(recordIndex)
      };
    }

    return null;
  }

  private validateFormat(record: any, rule: ValidationRule, recordIndex: number): PipelineError | null {
    const field = rule.config.field;
    const format = rule.config.format;
    const value = record[field];

    if (value == null || typeof value !== 'string') {
      return null;
    }

    let regex: RegExp;

    switch (format) {
      case 'email':
        regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        break;
      case 'phone':
        regex = /^\+?[\d\s-()]+$/;
        break;
      case 'url':
        regex = /^https?:\/\/.+/;
        break;
      case 'date':
        regex = /^\d{4}-\d{2}-\d{2}$/;
        break;
      case 'uuid':
        regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        break;
      default:
        regex = new RegExp(rule.config.pattern);
    }

    if (!regex.test(value)) {
      return {
        timestamp: new Date(),
        stage: 'validation',
        message: `Invalid format for field ${field}: expected ${format}`,
        recordId: String(recordIndex)
      };
    }

    return null;
  }

  private validateReferential(record: any, rule: ValidationRule, recordIndex: number): PipelineError | null {
    // Would implement referential integrity checks against a reference table/database
    return null;
  }

  private validateCustom(record: any, rule: ValidationRule, recordIndex: number): PipelineError | null {
    const validationFn = rule.config.validationFunction;

    if (typeof validationFn === 'function') {
      const isValid = validationFn(record);

      if (!isValid) {
        return {
          timestamp: new Date(),
          stage: 'validation',
          message: rule.config.errorMessage || 'Custom validation failed',
          recordId: String(recordIndex)
        };
      }
    }

    return null;
  }
}
