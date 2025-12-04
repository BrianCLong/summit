/**
 * Signal Validator
 *
 * Validates incoming signals against their schema definitions.
 * Performs structural validation, type checking, and business rule validation.
 *
 * @module signal-validator
 */

import {
  type SignalEnvelope,
  type RawSignalInput,
  SignalEnvelopeSchema,
  RawSignalInputSchema,
  SignalTypeRegistry,
  type SignalTypeIdType,
} from '@intelgraph/signal-contracts';
import type { Logger } from 'pino';

import type { ValidationResult, ValidationError } from '../types.js';

/**
 * Validator configuration
 */
export interface ValidatorConfig {
  /** Maximum payload size in bytes */
  maxPayloadSize: number;
  /** Allow unknown signal types */
  allowUnknownSignalTypes: boolean;
  /** Maximum age of signals in milliseconds */
  maxSignalAgeMs: number;
  /** Maximum future timestamp tolerance in milliseconds */
  maxFutureToleranceMs: number;
  /** Required fields in payload by signal type */
  requiredPayloadFields: Map<string, string[]>;
  /** Custom validators */
  customValidators: SignalValidator[];
}

/**
 * Custom validator interface
 */
export interface SignalValidator {
  name: string;
  validate(signal: SignalEnvelope): ValidationError[];
}

/**
 * Default validator configuration
 */
const defaultConfig: ValidatorConfig = {
  maxPayloadSize: 1048576, // 1MB
  allowUnknownSignalTypes: false,
  maxSignalAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxFutureToleranceMs: 5 * 60 * 1000, // 5 minutes
  requiredPayloadFields: new Map(),
  customValidators: [],
};

/**
 * Signal Validator class
 */
export class SignalValidatorService {
  private config: ValidatorConfig;
  private logger: Logger;
  private validationStats = {
    total: 0,
    valid: 0,
    invalid: 0,
    byErrorCode: new Map<string, number>(),
  };

  constructor(logger: Logger, config?: Partial<ValidatorConfig>) {
    this.logger = logger.child({ component: 'signal-validator' });
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Validate a raw signal input (pre-envelope)
   */
  validateRawInput(input: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    // Structural validation with Zod
    const parseResult = RawSignalInputSchema.safeParse(input);

    if (!parseResult.success) {
      for (const issue of parseResult.error.issues) {
        errors.push({
          field: issue.path.join('.'),
          message: issue.message,
          code: 'SCHEMA_VALIDATION_FAILED',
          value: undefined,
        });
      }
      return { valid: false, errors };
    }

    // Additional business rule validation
    const rawInput = parseResult.data;

    // Validate signal type is known
    if (!this.config.allowUnknownSignalTypes) {
      const signalTypeErrors = this.validateSignalType(rawInput.signalType);
      errors.push(...signalTypeErrors);
    }

    // Validate timestamp
    if (rawInput.timestamp) {
      const timestampErrors = this.validateTimestamp(rawInput.timestamp);
      errors.push(...timestampErrors);
    }

    // Validate payload size
    const payloadSize = JSON.stringify(rawInput.payload).length;
    if (payloadSize > this.config.maxPayloadSize) {
      errors.push({
        field: 'payload',
        message: `Payload size (${payloadSize} bytes) exceeds maximum (${this.config.maxPayloadSize} bytes)`,
        code: 'PAYLOAD_TOO_LARGE',
        value: payloadSize,
      });
    }

    this.updateStats(errors.length === 0, errors);

    return {
      valid: errors.length === 0,
      errors,
      normalizedPayload: errors.length === 0 ? rawInput : undefined,
    };
  }

  /**
   * Validate a signal envelope
   */
  validateEnvelope(envelope: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    // Structural validation with Zod
    const parseResult = SignalEnvelopeSchema.safeParse(envelope);

    if (!parseResult.success) {
      for (const issue of parseResult.error.issues) {
        errors.push({
          field: issue.path.join('.'),
          message: issue.message,
          code: 'SCHEMA_VALIDATION_FAILED',
          value: undefined,
        });
      }
      return { valid: false, errors };
    }

    const validEnvelope = parseResult.data as SignalEnvelope;

    // Validate signal type
    if (!this.config.allowUnknownSignalTypes) {
      const signalTypeErrors = this.validateSignalType(validEnvelope.metadata.signalType);
      errors.push(...signalTypeErrors);
    }

    // Validate timestamps
    const timestampErrors = this.validateTimestamps(
      validEnvelope.metadata.timestamp,
      validEnvelope.metadata.receivedAt,
    );
    errors.push(...timestampErrors);

    // Validate tenant ID
    const tenantErrors = this.validateTenantId(validEnvelope.metadata.tenantId);
    errors.push(...tenantErrors);

    // Validate payload for signal type
    const payloadErrors = this.validatePayloadForType(
      validEnvelope.metadata.signalType,
      validEnvelope.payload,
    );
    errors.push(...payloadErrors);

    // Validate location if present
    if (validEnvelope.location) {
      const locationErrors = this.validateLocation(validEnvelope.location);
      errors.push(...locationErrors);
    }

    // Run custom validators
    for (const validator of this.config.customValidators) {
      try {
        const customErrors = validator.validate(validEnvelope);
        errors.push(...customErrors);
      } catch (error) {
        this.logger.error(
          { error, validator: validator.name },
          'Custom validator threw exception',
        );
        errors.push({
          field: '_custom',
          message: `Custom validator '${validator.name}' failed: ${error}`,
          code: 'CUSTOM_VALIDATOR_ERROR',
        });
      }
    }

    this.updateStats(errors.length === 0, errors);

    return {
      valid: errors.length === 0,
      errors,
      normalizedPayload: errors.length === 0 ? validEnvelope : undefined,
    };
  }

  /**
   * Validate signal type against registry
   */
  private validateSignalType(signalType: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!SignalTypeRegistry[signalType as SignalTypeIdType]) {
      errors.push({
        field: 'metadata.signalType',
        message: `Unknown signal type: ${signalType}`,
        code: 'UNKNOWN_SIGNAL_TYPE',
        value: signalType,
      });
    }

    return errors;
  }

  /**
   * Validate timestamp is within acceptable range
   */
  private validateTimestamp(timestamp: number): ValidationError[] {
    const errors: ValidationError[] = [];
    const now = Date.now();

    // Check for future timestamps
    if (timestamp > now + this.config.maxFutureToleranceMs) {
      errors.push({
        field: 'timestamp',
        message: `Timestamp is too far in the future (${new Date(timestamp).toISOString()})`,
        code: 'TIMESTAMP_IN_FUTURE',
        value: timestamp,
      });
    }

    // Check for very old timestamps
    if (timestamp < now - this.config.maxSignalAgeMs) {
      errors.push({
        field: 'timestamp',
        message: `Timestamp is too old (${new Date(timestamp).toISOString()})`,
        code: 'TIMESTAMP_TOO_OLD',
        value: timestamp,
      });
    }

    return errors;
  }

  /**
   * Validate both timestamp and receivedAt
   */
  private validateTimestamps(timestamp: number, receivedAt: number): ValidationError[] {
    const errors: ValidationError[] = [];

    errors.push(...this.validateTimestamp(timestamp));

    // receivedAt should not be before timestamp (with some tolerance)
    if (receivedAt < timestamp - 60000) {
      // 1 minute tolerance
      errors.push({
        field: 'metadata.receivedAt',
        message: 'receivedAt is before timestamp',
        code: 'INVALID_RECEIVED_AT',
        value: { timestamp, receivedAt },
      });
    }

    return errors;
  }

  /**
   * Validate tenant ID
   */
  private validateTenantId(tenantId: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!tenantId || tenantId.trim().length === 0) {
      errors.push({
        field: 'metadata.tenantId',
        message: 'Tenant ID is required',
        code: 'MISSING_TENANT_ID',
      });
    }

    // Validate tenant ID format (alphanumeric with hyphens/underscores)
    if (tenantId && !/^[a-zA-Z0-9_-]+$/.test(tenantId)) {
      errors.push({
        field: 'metadata.tenantId',
        message: 'Tenant ID contains invalid characters',
        code: 'INVALID_TENANT_ID_FORMAT',
        value: tenantId,
      });
    }

    return errors;
  }

  /**
   * Validate payload fields for specific signal type
   */
  private validatePayloadForType(signalType: string, payload: unknown): ValidationError[] {
    const errors: ValidationError[] = [];
    const requiredFields = this.config.requiredPayloadFields.get(signalType);

    if (!requiredFields || requiredFields.length === 0) {
      return errors;
    }

    if (typeof payload !== 'object' || payload === null) {
      errors.push({
        field: 'payload',
        message: 'Payload must be an object',
        code: 'INVALID_PAYLOAD_TYPE',
      });
      return errors;
    }

    const payloadObj = payload as Record<string, unknown>;

    for (const field of requiredFields) {
      if (!(field in payloadObj) || payloadObj[field] === undefined) {
        errors.push({
          field: `payload.${field}`,
          message: `Required field '${field}' is missing for signal type '${signalType}'`,
          code: 'MISSING_REQUIRED_FIELD',
        });
      }
    }

    return errors;
  }

  /**
   * Validate location data
   */
  private validateLocation(location: { latitude: number; longitude: number }): ValidationError[] {
    const errors: ValidationError[] = [];

    if (location.latitude < -90 || location.latitude > 90) {
      errors.push({
        field: 'location.latitude',
        message: 'Latitude must be between -90 and 90',
        code: 'INVALID_LATITUDE',
        value: location.latitude,
      });
    }

    if (location.longitude < -180 || location.longitude > 180) {
      errors.push({
        field: 'location.longitude',
        message: 'Longitude must be between -180 and 180',
        code: 'INVALID_LONGITUDE',
        value: location.longitude,
      });
    }

    return errors;
  }

  /**
   * Update validation statistics
   */
  private updateStats(valid: boolean, errors: ValidationError[]): void {
    this.validationStats.total++;
    if (valid) {
      this.validationStats.valid++;
    } else {
      this.validationStats.invalid++;
      for (const error of errors) {
        const count = this.validationStats.byErrorCode.get(error.code) ?? 0;
        this.validationStats.byErrorCode.set(error.code, count + 1);
      }
    }
  }

  /**
   * Get validation statistics
   */
  getStats(): {
    total: number;
    valid: number;
    invalid: number;
    validRate: number;
    byErrorCode: Record<string, number>;
  } {
    return {
      total: this.validationStats.total,
      valid: this.validationStats.valid,
      invalid: this.validationStats.invalid,
      validRate:
        this.validationStats.total > 0
          ? this.validationStats.valid / this.validationStats.total
          : 1,
      byErrorCode: Object.fromEntries(this.validationStats.byErrorCode),
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.validationStats = {
      total: 0,
      valid: 0,
      invalid: 0,
      byErrorCode: new Map(),
    };
  }

  /**
   * Add a custom validator
   */
  addCustomValidator(validator: SignalValidator): void {
    this.config.customValidators.push(validator);
    this.logger.info({ validator: validator.name }, 'Added custom validator');
  }

  /**
   * Set required payload fields for a signal type
   */
  setRequiredPayloadFields(signalType: string, fields: string[]): void {
    this.config.requiredPayloadFields.set(signalType, fields);
    this.logger.info({ signalType, fields }, 'Set required payload fields');
  }
}

/**
 * Create a signal validator instance
 */
export function createSignalValidator(
  logger: Logger,
  config?: Partial<ValidatorConfig>,
): SignalValidatorService {
  return new SignalValidatorService(logger, config);
}
