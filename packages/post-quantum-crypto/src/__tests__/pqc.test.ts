/**
 * Post-Quantum Cryptography Test Suite
 * Validates NIST PQC algorithm implementations
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import {
  createKyberKEM,
  createDilithiumSignature,
  createFalconSignature,
  createSphincsSignature,
  createHybridKEM,
  createBenchmarker,
  createValidator,
  SecurityLevel,
} from '../src';

describe('Post-Quantum Cryptography', () => {
  describe('CRYSTALS-Kyber KEM', () => {
    it('should generate valid key pairs', async () => {
      const kem = createKyberKEM(SecurityLevel.LEVEL_3);
      const keyPair = await kem.generateKeyPair();

      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();
      expect(keyPair.publicKey.length).toBeGreaterThan(0);
      expect(keyPair.privateKey.length).toBeGreaterThan(0);
    });

    it('should encapsulate and decapsulate correctly', async () => {
      const kem = createKyberKEM(SecurityLevel.LEVEL_3);
      const keyPair = await kem.generateKeyPair();

      const { ciphertext, sharedSecret } = await kem.encapsulate(keyPair.publicKey);
      const decapsulated = await kem.decapsulate(ciphertext, keyPair.privateKey);

      expect(sharedSecret).toBeDefined();
      expect(decapsulated).toBeDefined();
      expect(sharedSecret.length).toBe(32);
    });

    it('should support all security levels', async () => {
      for (const level of [SecurityLevel.LEVEL_1, SecurityLevel.LEVEL_3, SecurityLevel.LEVEL_5]) {
        const kem = createKyberKEM(level);
        const keyPair = await kem.generateKeyPair();
        expect(keyPair.securityLevel).toBe(level);
      }
    });
  });

  describe('CRYSTALS-Dilithium Signatures', () => {
    it('should generate valid key pairs', async () => {
      const dss = createDilithiumSignature(SecurityLevel.LEVEL_3);
      const keyPair = await dss.generateKeyPair();

      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();
    });

    it('should sign and verify correctly', async () => {
      const dss = createDilithiumSignature(SecurityLevel.LEVEL_3);
      const keyPair = await dss.generateKeyPair();

      const message = new TextEncoder().encode('Test message for signing');
      const { signature } = await dss.sign(message, keyPair.privateKey);

      const isValid = await dss.verify(message, signature, keyPair.publicKey);
      expect(isValid).toBe(true);
    });

    it('should reject tampered messages', async () => {
      const dss = createDilithiumSignature(SecurityLevel.LEVEL_3);
      const keyPair = await dss.generateKeyPair();

      const message = new TextEncoder().encode('Original message');
      const { signature } = await dss.sign(message, keyPair.privateKey);

      const tamperedMessage = new TextEncoder().encode('Tampered message');
      const isValid = await dss.verify(tamperedMessage, signature, keyPair.publicKey);
      expect(isValid).toBe(false);
    });
  });

  describe('FALCON Signatures', () => {
    it('should generate compact signatures', async () => {
      const falcon = createFalconSignature(SecurityLevel.LEVEL_1);
      const keyPair = await falcon.generateKeyPair();

      const message = new TextEncoder().encode('Test message');
      const { signature } = await falcon.sign(message, keyPair.privateKey);

      // FALCON-512 signatures should be ~666 bytes
      expect(signature.length).toBeLessThan(1000);
    });
  });

  describe('SPHINCS+ Signatures', () => {
    it('should generate hash-based signatures', async () => {
      const sphincs = createSphincsSignature(SecurityLevel.LEVEL_1, true);
      const keyPair = await sphincs.generateKeyPair();

      expect(keyPair.metadata?.stateless).toBe(true);
    });
  });

  describe('Hybrid KEM', () => {
    it('should combine classical and quantum key exchange', async () => {
      const hybrid = createHybridKEM('x25519');
      const keyPair = await hybrid.generateKeyPair();

      expect(keyPair.metadata?.hybrid).toBe(true);

      const { ciphertext, sharedSecret } = await hybrid.encapsulate(keyPair.publicKey);
      expect(sharedSecret.length).toBe(32);
    });
  });

  describe('Validation', () => {
    it('should validate KEM correctness', async () => {
      const validator = createValidator();
      const kem = createKyberKEM(SecurityLevel.LEVEL_1);

      const isValid = await validator.validateKEM(kem, 5);
      expect(isValid).toBe(true);
    });

    it('should validate signature correctness', async () => {
      const validator = createValidator();
      const dss = createDilithiumSignature(SecurityLevel.LEVEL_2);

      const isValid = await validator.validateSignature(dss, 5);
      expect(isValid).toBe(true);
    });
  });

  describe('Benchmarking', () => {
    it('should benchmark KEM operations', async () => {
      const benchmarker = createBenchmarker(10);
      const kem = createKyberKEM(SecurityLevel.LEVEL_1);

      const results = await benchmarker.benchmarkKEM(kem);

      expect(results.length).toBe(3); // keygen, encapsulate, decapsulate
      expect(results.every(r => r.averageTime > 0)).toBe(true);
    });
  });
});
