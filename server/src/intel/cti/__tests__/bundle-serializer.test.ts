/**
 * STIX Bundle Serializer Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  createBundle,
  calculateBundleChecksum,
  signBundle,
  verifyBundleSignature,
  serializeBundleToJson,
  parseBundleFromJson,
  validateBundle,
  mergeBundles,
  splitBundle,
  filterBundleByType,
} from '../bundle-serializer.js';
import { mapEntityToStix, createProducerIdentity, getTlpMarking } from '../entity-mapper.js';
import type { StixBundle, StixObject, Identity, Indicator } from '../types.js';

describe('STIX Bundle Serializer', () => {
  describe('createBundle', () => {
    it('should create a valid STIX 2.1 bundle', () => {
      const identity = createProducerIdentity('Test Producer');
      const objects: StixObject[] = [identity];

      const bundle = createBundle(objects);

      expect(bundle.type).toBe('bundle');
      expect(bundle.id).toMatch(/^bundle--[0-9a-f-]{36}$/);
      expect(bundle.objects).toHaveLength(1);
      expect(bundle.objects[0]).toBe(identity);
    });

    it('should create bundle with multiple objects', () => {
      const identity = createProducerIdentity('Test Producer');
      const tlpMarking = getTlpMarking('green');
      const objects: StixObject[] = [identity, tlpMarking];

      const bundle = createBundle(objects);

      expect(bundle.objects).toHaveLength(2);
    });
  });

  describe('calculateBundleChecksum', () => {
    it('should calculate SHA-256 checksum', () => {
      const bundle = createBundle([createProducerIdentity('Test')]);
      const checksum = calculateBundleChecksum(bundle);

      expect(checksum).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should produce consistent checksum for same bundle', () => {
      const identity = createProducerIdentity('Test');
      // Create bundles with same content but different IDs won't work
      // So we use the same bundle
      const bundle = createBundle([identity]);

      const checksum1 = calculateBundleChecksum(bundle);
      const checksum2 = calculateBundleChecksum(bundle);

      expect(checksum1).toBe(checksum2);
    });
  });

  describe('signBundle / verifyBundleSignature', () => {
    const signingKey = 'test-signing-key-for-bundle-tests';

    it('should sign and verify a bundle', () => {
      const bundle = createBundle([createProducerIdentity('Test')]);

      const { signature, algorithm } = signBundle(bundle, signingKey);

      expect(signature).toBeTruthy();
      expect(algorithm).toBe('HMAC-SHA256');

      const isValid = verifyBundleSignature(bundle, signature, signingKey);
      expect(isValid).toBe(true);
    });

    it('should fail verification with wrong key', () => {
      const bundle = createBundle([createProducerIdentity('Test')]);
      const { signature } = signBundle(bundle, signingKey);

      const isValid = verifyBundleSignature(bundle, signature, 'wrong-key');
      expect(isValid).toBe(false);
    });

    it('should fail verification with modified bundle', () => {
      const bundle = createBundle([createProducerIdentity('Test')]);
      const { signature } = signBundle(bundle, signingKey);

      // Modify bundle
      bundle.objects.push(createProducerIdentity('Modified'));

      const isValid = verifyBundleSignature(bundle, signature, signingKey);
      expect(isValid).toBe(false);
    });
  });

  describe('serializeBundleToJson / parseBundleFromJson', () => {
    it('should serialize and parse bundle', () => {
      const original = createBundle([createProducerIdentity('Test')]);
      const json = serializeBundleToJson(original);
      const parsed = parseBundleFromJson(json);

      expect(parsed.type).toBe(original.type);
      expect(parsed.id).toBe(original.id);
      expect(parsed.objects).toHaveLength(original.objects.length);
    });

    it('should throw on invalid bundle JSON', () => {
      expect(() => parseBundleFromJson('{"type": "invalid"}')).toThrow('Invalid STIX bundle');
      expect(() => parseBundleFromJson('{"type": "bundle", "id": "invalid"}')).toThrow('Invalid STIX bundle');
    });
  });

  describe('validateBundle', () => {
    it('should validate a correct bundle', () => {
      const bundle = createBundle([
        createProducerIdentity('Test'),
        getTlpMarking('green'),
      ]);

      const result = validateBundle(bundle);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.statistics.totalObjects).toBe(2);
      expect(result.statistics.hasProducerIdentity).toBe(true);
      expect(result.statistics.hasTlpMarking).toBe(true);
    });

    it('should detect missing producer identity', () => {
      const bundle = createBundle([getTlpMarking('green')]);

      const result = validateBundle(bundle);

      expect(result.warnings).toContain('Bundle does not contain a producer identity');
    });

    it('should detect duplicate object IDs', () => {
      const identity = createProducerIdentity('Test');
      const bundle = createBundle([identity, identity]);

      const result = validateBundle(bundle);

      expect(result.warnings.some(w => w.includes('Duplicate object ID'))).toBe(true);
    });
  });

  describe('mergeBundles', () => {
    it('should merge multiple bundles', () => {
      const bundle1 = createBundle([createProducerIdentity('Producer 1')]);
      const bundle2 = createBundle([createProducerIdentity('Producer 2')]);

      const merged = mergeBundles([bundle1, bundle2]);

      expect(merged.objects).toHaveLength(2);
    });

    it('should deduplicate objects by ID', () => {
      const identity = createProducerIdentity('Test');
      const bundle1 = createBundle([identity]);
      const bundle2 = createBundle([identity]);

      const merged = mergeBundles([bundle1, bundle2]);

      expect(merged.objects).toHaveLength(1);
    });
  });

  describe('splitBundle', () => {
    it('should split large bundle into chunks', () => {
      const objects = Array.from({ length: 25 }, (_, i) =>
        createProducerIdentity(`Producer ${i}`),
      );
      const bundle = createBundle(objects);

      const chunks = splitBundle(bundle, 10);

      expect(chunks).toHaveLength(3);
      expect(chunks[0].objects).toHaveLength(10);
      expect(chunks[1].objects).toHaveLength(10);
      expect(chunks[2].objects).toHaveLength(5);
    });
  });

  describe('filterBundleByType', () => {
    it('should filter objects by type', () => {
      const identity = createProducerIdentity('Test');
      const tlpMarking = getTlpMarking('green');
      const bundle = createBundle([identity, tlpMarking]);

      const filtered = filterBundleByType(bundle, ['identity']);

      expect(filtered.objects).toHaveLength(1);
      expect(filtered.objects[0].type).toBe('identity');
    });
  });
});

describe('Entity Mapper', () => {
  describe('mapEntityToStix', () => {
    it('should map person entity to identity', () => {
      const entity = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: 'tenant-1',
        kind: 'person',
        labels: ['analyst'],
        props: { name: 'John Doe', email: 'john@example.com' },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-1',
      };

      const result = mapEntityToStix(entity);

      expect(result.stixType).toBe('identity');
      expect((result.stixObject as Identity).name).toBe('John Doe');
      expect((result.stixObject as Identity).identity_class).toBe('individual');
    });

    it('should map organization entity to identity', () => {
      const entity = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        tenantId: 'tenant-1',
        kind: 'organization',
        labels: ['vendor'],
        props: { name: 'Acme Corp', sectors: ['technology'] },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-1',
      };

      const result = mapEntityToStix(entity);

      expect(result.stixType).toBe('identity');
      expect((result.stixObject as Identity).identity_class).toBe('organization');
    });

    it('should map indicator entity with IOC pattern', () => {
      const entity = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        tenantId: 'tenant-1',
        kind: 'indicator',
        labels: ['malicious-ip'],
        props: {
          name: 'Malicious IP',
          ioc_type: 'ipv4',
          ioc_value: '192.168.1.100',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-1',
      };

      const result = mapEntityToStix(entity);

      expect(result.stixType).toBe('indicator');
      expect((result.stixObject as Indicator).pattern).toBe("[ipv4-addr:value = '192.168.1.100']");
    });

    it('should include IntelGraph extension when enabled', () => {
      const entity = {
        id: '123e4567-e89b-12d3-a456-426614174003',
        tenantId: 'tenant-1',
        kind: 'person',
        labels: [],
        props: { name: 'Test' },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-1',
      };

      const result = mapEntityToStix(entity, { includeExtensions: true });

      expect(result.stixObject.extensions).toBeDefined();
    });
  });
});
