/**
 * STIX Signing Service Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  StixSigningService,
  generateSigningKey,
  serializeAirGapPackage,
  parseAirGapPackage,
  calculatePackageIntegrity,
} from '../signing.js';
import { createBundle } from '../bundle-serializer.js';
import { createProducerIdentity } from '../entity-mapper.js';
import type { StixBundle } from '../types.js';

describe('STIX Signing Service', () => {
  let signingService: StixSigningService;
  let testBundle: StixBundle;

  beforeEach(() => {
    signingService = new StixSigningService({
      signingKey: 'test-signing-key-12345',
      keyId: 'test-key-001',
    });

    testBundle = createBundle([createProducerIdentity('Test Producer')]);
  });

  describe('signBundle', () => {
    it('should create a detached signature', () => {
      const signature = signingService.signBundle(testBundle);

      expect(signature.signature).toBeTruthy();
      expect(signature.metadata.algorithm).toBe('HMAC-SHA256');
      expect(signature.metadata.keyId).toBe('test-key-001');
      expect(signature.metadata.bundleId).toBe(testBundle.id);
      expect(signature.metadata.bundleChecksum).toMatch(/^[0-9a-f]{64}$/);
      expect(signature.encodedMetadata).toBeTruthy();
    });

    it('should include producer identity in metadata', () => {
      const signature = signingService.signBundle(testBundle, {
        producerIdentity: 'user-123',
      });

      expect(signature.metadata.producerIdentity).toBe('user-123');
    });

    it('should support signature chaining', () => {
      const sig1 = signingService.signBundle(testBundle);
      const sig2 = signingService.signBundle(testBundle, {
        chainPrevious: sig1.signature,
      });

      expect(sig2.metadata.chainPrevious).toBe(sig1.signature);
    });
  });

  describe('verifySignature', () => {
    it('should verify a valid signature', () => {
      const signature = signingService.signBundle(testBundle);
      const result = signingService.verifySignature(testBundle, signature);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata).toBeDefined();
    });

    it('should reject modified bundle', () => {
      const signature = signingService.signBundle(testBundle);

      // Modify bundle after signing
      testBundle.objects.push(createProducerIdentity('Attacker'));

      const result = signingService.verifySignature(testBundle, signature);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('checksum'))).toBe(true);
    });

    it('should reject wrong key ID', () => {
      const signature = signingService.signBundle(testBundle);

      // Tamper with key ID
      signature.metadata.keyId = 'wrong-key';

      const result = signingService.verifySignature(testBundle, signature);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Key ID mismatch'))).toBe(true);
    });

    it('should reject wrong bundle ID', () => {
      const signature = signingService.signBundle(testBundle);

      // Create new bundle with different ID
      const differentBundle = createBundle([createProducerIdentity('Different')]);

      const result = signingService.verifySignature(differentBundle, signature);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Bundle ID mismatch'))).toBe(true);
    });
  });

  describe('createSignedBundle / verifySignedBundle', () => {
    it('should create and verify signed bundle', () => {
      const signedBundle = signingService.createSignedBundle(testBundle);

      expect(signedBundle.bundle).toBe(testBundle);
      expect(signedBundle.signature).toBeDefined();

      const result = signingService.verifySignedBundle(signedBundle);
      expect(result.valid).toBe(true);
    });
  });

  describe('Air-Gap Package', () => {
    it('should create air-gap package with multiple bundles', () => {
      const bundle1 = createBundle([createProducerIdentity('Producer 1')]);
      const bundle2 = createBundle([createProducerIdentity('Producer 2')]);

      const pkg = signingService.createAirGapPackage([bundle1, bundle2]);

      expect(pkg.version).toBe('1.0');
      expect(pkg.format).toBe('stix-bundle-signed');
      expect(pkg.bundles).toHaveLength(2);
      expect(pkg.manifest.totalBundles).toBe(2);
      expect(pkg.manifest.totalObjects).toBe(2);
      expect(pkg.manifest.checksums).toHaveLength(2);
    });

    it('should chain signatures in air-gap package', () => {
      const bundle1 = createBundle([createProducerIdentity('Producer 1')]);
      const bundle2 = createBundle([createProducerIdentity('Producer 2')]);

      const pkg = signingService.createAirGapPackage([bundle1, bundle2]);

      // First bundle has no chain previous
      expect(pkg.bundles[0].signature.metadata.chainPrevious).toBeUndefined();

      // Second bundle chains to first
      expect(pkg.bundles[1].signature.metadata.chainPrevious).toBe(
        pkg.bundles[0].signature.signature,
      );
    });

    it('should verify valid air-gap package', () => {
      const bundle1 = createBundle([createProducerIdentity('Producer 1')]);
      const bundle2 = createBundle([createProducerIdentity('Producer 2')]);

      const pkg = signingService.createAirGapPackage([bundle1, bundle2]);
      const result = signingService.verifyAirGapPackage(pkg);

      expect(result.valid).toBe(true);
      expect(result.manifestValid).toBe(true);
      expect(result.bundleResults).toHaveLength(2);
      expect(result.bundleResults.every(r => r.valid)).toBe(true);
    });

    it('should detect broken signature chain', () => {
      const bundle1 = createBundle([createProducerIdentity('Producer 1')]);
      const bundle2 = createBundle([createProducerIdentity('Producer 2')]);

      const pkg = signingService.createAirGapPackage([bundle1, bundle2]);

      // Break the chain
      pkg.bundles[1].signature.metadata.chainPrevious = 'broken-signature';

      const result = signingService.verifyAirGapPackage(pkg);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('chain broken'))).toBe(true);
    });

    it('should detect manifest tampering', () => {
      const bundle1 = createBundle([createProducerIdentity('Producer 1')]);

      const pkg = signingService.createAirGapPackage([bundle1]);

      // Tamper with manifest
      pkg.manifest.totalBundles = 5;

      const result = signingService.verifyAirGapPackage(pkg);

      expect(result.valid).toBe(false);
      expect(result.manifestValid).toBe(false);
    });
  });

  describe('serializeAirGapPackage / parseAirGapPackage', () => {
    it('should serialize and parse air-gap package', () => {
      const bundle = createBundle([createProducerIdentity('Test')]);
      const pkg = signingService.createAirGapPackage([bundle]);

      const serialized = serializeAirGapPackage(pkg);
      const parsed = parseAirGapPackage(serialized);

      expect(parsed.version).toBe(pkg.version);
      expect(parsed.format).toBe(pkg.format);
      expect(parsed.bundles).toHaveLength(1);
    });

    it('should throw on invalid package version', () => {
      const invalid = JSON.stringify({ version: '2.0', format: 'stix-bundle-signed' });
      expect(() => parseAirGapPackage(invalid)).toThrow('Unsupported package version');
    });

    it('should throw on invalid package format', () => {
      const invalid = JSON.stringify({ version: '1.0', format: 'invalid' });
      expect(() => parseAirGapPackage(invalid)).toThrow('Unsupported package format');
    });
  });

  describe('generateSigningKey', () => {
    it('should generate secure random key', () => {
      const key1 = generateSigningKey();
      const key2 = generateSigningKey();

      expect(key1).not.toBe(key2);
      expect(key1.length).toBeGreaterThan(20);
    });

    it('should generate key of specified length', () => {
      const key16 = generateSigningKey(16);
      const key64 = generateSigningKey(64);

      // Base64url encoding increases length by ~33%
      expect(key64.length).toBeGreaterThan(key16.length);
    });
  });

  describe('calculatePackageIntegrity', () => {
    it('should calculate package integrity hash', () => {
      const bundle = createBundle([createProducerIdentity('Test')]);
      const pkg = signingService.createAirGapPackage([bundle]);

      const hash = calculatePackageIntegrity(pkg);

      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should detect package modifications', () => {
      const bundle = createBundle([createProducerIdentity('Test')]);
      const pkg = signingService.createAirGapPackage([bundle]);

      const hash1 = calculatePackageIntegrity(pkg);

      // Modify package
      pkg.manifest.totalObjects = 999;

      const hash2 = calculatePackageIntegrity(pkg);

      expect(hash1).not.toBe(hash2);
    });
  });
});

describe('HMAC Algorithm Variants', () => {
  it('should support HMAC-SHA384', () => {
    const service = new StixSigningService({
      signingKey: 'test-key',
      algorithm: 'HMAC-SHA384',
    });

    const bundle = createBundle([createProducerIdentity('Test')]);
    const signature = service.signBundle(bundle);

    expect(signature.metadata.algorithm).toBe('HMAC-SHA384');

    const result = service.verifySignature(bundle, signature);
    expect(result.valid).toBe(true);
  });

  it('should support HMAC-SHA512', () => {
    const service = new StixSigningService({
      signingKey: 'test-key',
      algorithm: 'HMAC-SHA512',
    });

    const bundle = createBundle([createProducerIdentity('Test')]);
    const signature = service.signBundle(bundle);

    expect(signature.metadata.algorithm).toBe('HMAC-SHA512');

    const result = service.verifySignature(bundle, signature);
    expect(result.valid).toBe(true);
  });
});
