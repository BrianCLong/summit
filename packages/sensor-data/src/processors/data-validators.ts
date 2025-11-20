/**
 * Data Validators
 * Common validators for sensor data
 */

import { SensorReading, DataValidator, ValidationResult } from '../types.js';

/**
 * Range Validator
 * Validates that numeric values are within acceptable range
 */
export class RangeValidator implements DataValidator {
  constructor(
    private min: number,
    private max: number,
    private allowNull = false
  ) {}

  validate(reading: SensorReading): ValidationResult {
    if (reading.value === null || reading.value === undefined) {
      if (this.allowNull) {
        return { valid: true };
      }
      return {
        valid: false,
        errors: ['Value cannot be null or undefined'],
      };
    }

    if (typeof reading.value !== 'number') {
      return {
        valid: false,
        errors: ['Value must be a number'],
      };
    }

    if (reading.value < this.min || reading.value > this.max) {
      return {
        valid: false,
        errors: [`Value ${reading.value} is outside range [${this.min}, ${this.max}]`],
      };
    }

    return { valid: true };
  }
}

/**
 * Timestamp Validator
 * Validates that timestamp is reasonable
 */
export class TimestampValidator implements DataValidator {
  constructor(
    private maxFutureDrift = 60000, // 1 minute
    private maxPastDrift = 86400000 // 24 hours
  ) {}

  validate(reading: SensorReading): ValidationResult {
    const now = Date.now();
    const timestamp = reading.timestamp.getTime();

    const drift = timestamp - now;

    if (drift > this.maxFutureDrift) {
      return {
        valid: false,
        errors: [`Timestamp is too far in the future: ${new Date(timestamp).toISOString()}`],
      };
    }

    if (drift < -this.maxPastDrift) {
      return {
        valid: false,
        errors: [`Timestamp is too far in the past: ${new Date(timestamp).toISOString()}`],
      };
    }

    return { valid: true };
  }
}

/**
 * Required Fields Validator
 * Validates that required fields are present
 */
export class RequiredFieldsValidator implements DataValidator {
  constructor(private requiredFields: string[]) {}

  validate(reading: SensorReading): ValidationResult {
    const errors: string[] = [];

    for (const field of this.requiredFields) {
      if (!(field in reading) || (reading as any)[field] === null || (reading as any)[field] === undefined) {
        errors.push(`Required field '${field}' is missing or null`);
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true };
  }
}

/**
 * Quality Validator
 * Validates sensor reading quality
 */
export class QualityValidator implements DataValidator {
  constructor(private minQuality = 0.5) {}

  validate(reading: SensorReading): ValidationResult {
    if (reading.quality === undefined) {
      return {
        valid: true,
        warnings: ['Quality metric not provided'],
      };
    }

    if (reading.quality < this.minQuality) {
      return {
        valid: false,
        errors: [`Reading quality ${reading.quality} below minimum ${this.minQuality}`],
      };
    }

    return { valid: true };
  }
}

/**
 * Composite Validator
 * Combines multiple validators
 */
export class CompositeValidator implements DataValidator {
  constructor(private validators: DataValidator[]) {}

  validate(reading: SensorReading): ValidationResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    for (const validator of this.validators) {
      const result = validator.validate(reading);

      if (!result.valid) {
        if (result.errors) {
          allErrors.push(...result.errors);
        }
      }

      if (result.warnings) {
        allWarnings.push(...result.warnings);
      }
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors.length > 0 ? allErrors : undefined,
      warnings: allWarnings.length > 0 ? allWarnings : undefined,
    };
  }
}
