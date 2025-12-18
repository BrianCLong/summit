/**
 * Signal Envelope Tests
 */

import {
  createSignalEnvelope,
  addProvenanceStep,
  validateSignalEnvelope,
  getPartitionKey,
  getRoutingKey,
  SignalEnvelopeSchema,
  type RawSignalInput,
  SignalTypeId,
} from '../index.js';

describe('SignalEnvelope', () => {
  const validInput: RawSignalInput = {
    signalType: SignalTypeId.SENSOR_GEOLOCATION,
    tenantId: 'tenant-123',
    sourceId: 'device-456',
    sourceType: 'device',
    payload: {
      latitude: 37.7749,
      longitude: -122.4194,
    },
    timestamp: Date.now(),
  };

  describe('createSignalEnvelope', () => {
    it('should create a valid signal envelope from raw input', () => {
      const envelope = createSignalEnvelope(validInput);

      expect(envelope.metadata.signalId).toBeDefined();
      expect(envelope.metadata.signalType).toBe(SignalTypeId.SENSOR_GEOLOCATION);
      expect(envelope.metadata.tenantId).toBe('tenant-123');
      expect(envelope.metadata.source.sourceId).toBe('device-456');
      expect(envelope.metadata.source.sourceType).toBe('device');
      expect(envelope.payload).toEqual(validInput.payload);
      expect(envelope.provenance.chain).toHaveLength(1);
      expect(envelope.provenance.chain[0].step).toBe('ingestion');
    });

    it('should use current timestamp if not provided', () => {
      const inputWithoutTimestamp: RawSignalInput = {
        ...validInput,
        timestamp: undefined,
      };

      const before = Date.now();
      const envelope = createSignalEnvelope(inputWithoutTimestamp);
      const after = Date.now();

      expect(envelope.metadata.timestamp).toBeGreaterThanOrEqual(before);
      expect(envelope.metadata.timestamp).toBeLessThanOrEqual(after);
    });

    it('should apply optional parameters', () => {
      const envelope = createSignalEnvelope(validInput, {
        signalId: 'custom-id-123',
        quality: 'high',
        policyLabels: ['label1', 'label2'],
        classification: 'SECRET',
      });

      expect(envelope.metadata.signalId).toBe('custom-id-123');
      expect(envelope.metadata.quality).toBe('high');
      expect(envelope.metadata.policyLabels).toEqual(['label1', 'label2']);
      expect(envelope.metadata.classification).toBe('SECRET');
    });

    it('should include location data when provided', () => {
      const inputWithLocation: RawSignalInput = {
        ...validInput,
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10,
        },
      };

      const envelope = createSignalEnvelope(inputWithLocation);

      expect(envelope.location).toBeDefined();
      expect(envelope.location?.latitude).toBe(37.7749);
      expect(envelope.location?.longitude).toBe(-122.4194);
    });

    it('should include device info when provided', () => {
      const inputWithDevice: RawSignalInput = {
        ...validInput,
        device: {
          deviceId: 'dev-123',
          deviceType: 'mobile',
          manufacturer: 'Apple',
          model: 'iPhone 15',
        },
      };

      const envelope = createSignalEnvelope(inputWithDevice);

      expect(envelope.device).toBeDefined();
      expect(envelope.device?.deviceId).toBe('dev-123');
      expect(envelope.device?.manufacturer).toBe('Apple');
    });
  });

  describe('addProvenanceStep', () => {
    it('should add a provenance step to the chain', () => {
      const envelope = createSignalEnvelope(validInput);
      const updated = addProvenanceStep(envelope, 'enrichment', 'geoip-enricher', '1.0.0');

      expect(updated.provenance.chain).toHaveLength(2);
      expect(updated.provenance.chain[1].step).toBe('enrichment');
      expect(updated.provenance.chain[1].processor).toBe('geoip-enricher');
      expect(updated.provenance.chain[1].version).toBe('1.0.0');
    });

    it('should not mutate the original envelope', () => {
      const envelope = createSignalEnvelope(validInput);
      const originalChainLength = envelope.provenance.chain.length;

      addProvenanceStep(envelope, 'enrichment', 'geoip-enricher');

      expect(envelope.provenance.chain).toHaveLength(originalChainLength);
    });
  });

  describe('validateSignalEnvelope', () => {
    it('should validate a correct envelope', () => {
      const envelope = createSignalEnvelope(validInput);
      const result = validateSignalEnvelope(envelope);

      expect(result.success).toBe(true);
    });

    it('should reject an invalid envelope', () => {
      const invalidEnvelope = {
        metadata: {
          signalId: 'not-a-uuid',
          // Missing required fields
        },
      };

      const result = validateSignalEnvelope(invalidEnvelope);

      expect(result.success).toBe(false);
    });
  });

  describe('getPartitionKey', () => {
    it('should generate correct partition key', () => {
      const envelope = createSignalEnvelope(validInput);
      const key = getPartitionKey(envelope);

      expect(key).toBe(`tenant-123:${SignalTypeId.SENSOR_GEOLOCATION}`);
    });
  });

  describe('getRoutingKey', () => {
    it('should generate correct routing key based on category', () => {
      const envelope = createSignalEnvelope(validInput);
      const key = getRoutingKey(envelope);

      expect(key).toBe('tenant-123:sensor');
    });
  });
});
