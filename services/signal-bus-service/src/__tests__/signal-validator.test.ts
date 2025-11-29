/**
 * Signal Validator Tests
 */

import pino from 'pino';

import { SignalTypeId } from '@intelgraph/signal-contracts';

import { createSignalValidator } from '../pipeline/signal-validator.js';

describe('SignalValidatorService', () => {
  const logger = pino({ level: 'silent' });

  describe('validateRawInput', () => {
    it('should validate correct raw input', () => {
      const validator = createSignalValidator(logger);

      const result = validator.validateRawInput({
        signalType: SignalTypeId.SENSOR_GEOLOCATION,
        tenantId: 'tenant-123',
        sourceId: 'device-456',
        sourceType: 'device',
        payload: { latitude: 37.7749, longitude: -122.4194 },
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing required fields', () => {
      const validator = createSignalValidator(logger);

      const result = validator.validateRawInput({
        signalType: SignalTypeId.SENSOR_GEOLOCATION,
        // Missing tenantId, sourceId, sourceType
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject unknown signal types when configured', () => {
      const validator = createSignalValidator(logger, {
        allowUnknownSignalTypes: false,
      });

      const result = validator.validateRawInput({
        signalType: 'unknown.type' as any,
        tenantId: 'tenant-123',
        sourceId: 'device-456',
        sourceType: 'device',
        payload: {},
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'UNKNOWN_SIGNAL_TYPE')).toBe(true);
    });

    it('should allow unknown signal types when configured', () => {
      const validator = createSignalValidator(logger, {
        allowUnknownSignalTypes: true,
      });

      const result = validator.validateRawInput({
        signalType: 'custom.signal.type' as any,
        tenantId: 'tenant-123',
        sourceId: 'device-456',
        sourceType: 'device',
        payload: {},
      });

      expect(result.valid).toBe(true);
    });

    it('should reject payloads exceeding max size', () => {
      const validator = createSignalValidator(logger, {
        maxPayloadSize: 100,
      });

      const result = validator.validateRawInput({
        signalType: SignalTypeId.SENSOR_GEOLOCATION,
        tenantId: 'tenant-123',
        sourceId: 'device-456',
        sourceType: 'device',
        payload: { data: 'x'.repeat(200) },
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'PAYLOAD_TOO_LARGE')).toBe(true);
    });

    it('should reject timestamps too far in the future', () => {
      const validator = createSignalValidator(logger, {
        maxFutureToleranceMs: 60000, // 1 minute
      });

      const result = validator.validateRawInput({
        signalType: SignalTypeId.SENSOR_GEOLOCATION,
        tenantId: 'tenant-123',
        sourceId: 'device-456',
        sourceType: 'device',
        payload: {},
        timestamp: Date.now() + 120000, // 2 minutes in future
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'TIMESTAMP_IN_FUTURE')).toBe(true);
    });

    it('should reject timestamps too old', () => {
      const validator = createSignalValidator(logger, {
        maxSignalAgeMs: 86400000, // 1 day
      });

      const result = validator.validateRawInput({
        signalType: SignalTypeId.SENSOR_GEOLOCATION,
        tenantId: 'tenant-123',
        sourceId: 'device-456',
        sourceType: 'device',
        payload: {},
        timestamp: Date.now() - 172800000, // 2 days ago
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'TIMESTAMP_TOO_OLD')).toBe(true);
    });
  });

  describe('statistics', () => {
    it('should track validation statistics', () => {
      const validator = createSignalValidator(logger);

      // Valid input
      validator.validateRawInput({
        signalType: SignalTypeId.SENSOR_GEOLOCATION,
        tenantId: 'tenant-123',
        sourceId: 'device-456',
        sourceType: 'device',
        payload: {},
      });

      // Invalid input
      validator.validateRawInput({
        signalType: SignalTypeId.SENSOR_GEOLOCATION,
        // Missing required fields
      });

      const stats = validator.getStats();

      expect(stats.total).toBe(2);
      expect(stats.valid).toBe(1);
      expect(stats.invalid).toBe(1);
      expect(stats.validRate).toBe(0.5);
    });

    it('should reset statistics', () => {
      const validator = createSignalValidator(logger);

      validator.validateRawInput({
        signalType: SignalTypeId.SENSOR_GEOLOCATION,
        tenantId: 'tenant-123',
        sourceId: 'device-456',
        sourceType: 'device',
        payload: {},
      });

      validator.resetStats();
      const stats = validator.getStats();

      expect(stats.total).toBe(0);
      expect(stats.valid).toBe(0);
      expect(stats.invalid).toBe(0);
    });
  });

  describe('custom validators', () => {
    it('should run custom validators', () => {
      const validator = createSignalValidator(logger);

      validator.addCustomValidator({
        name: 'requireLocation',
        validate: (signal) => {
          if (!signal.location) {
            return [
              {
                field: 'location',
                message: 'Location is required',
                code: 'LOCATION_REQUIRED',
              },
            ];
          }
          return [];
        },
      });

      const result = validator.validateEnvelope({
        metadata: {
          signalId: '123e4567-e89b-12d3-a456-426614174000',
          signalType: SignalTypeId.SENSOR_GEOLOCATION,
          timestamp: Date.now(),
          receivedAt: Date.now(),
          tenantId: 'tenant-123',
          source: { sourceId: 'device-456', sourceType: 'device' },
          envelopeVersion: '1.0.0',
          quality: 'unknown',
          policyLabels: [],
          tags: [],
        },
        payload: {},
        provenance: { chain: [] },
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'LOCATION_REQUIRED')).toBe(true);
    });
  });
});
