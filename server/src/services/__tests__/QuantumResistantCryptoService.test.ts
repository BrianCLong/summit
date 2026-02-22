// @ts-nocheck
/**
 * Quantum-Resistant Crypto Service Tests
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { QuantumResistantCryptoService } from '../QuantumResistantCryptoService';

describe('QuantumResistantCryptoService', () => {
  let service: any;

  beforeEach(() => {
    service = new QuantumResistantCryptoService();
  });

  describe('Key Generation', () => {
    it('should generate a Kyber-768 key pair', async () => {
      const key = await service.generateKeyPair('kyber-768' as any);

      expect(key).toHaveProperty('keyId');
      expect(key).toHaveProperty('publicKey');
      expect(key).toHaveProperty('privateKey');
      expect(key).toHaveProperty('createdAt');
    });

    it('should generate key with custom keyId', async () => {
      const customKeyId = 'my-custom-key-id';
      const key = await service.generateKeyPair('kyber-768' as any, {
        keyId: customKeyId,
      });

      expect(key.keyId).toBe(customKeyId);
    });

    it('should generate key with expiration', async () => {
      const key = await service.generateKeyPair('kyber-768' as any, {
        expiresInDays: 30,
      });

      expect(key.expiresAt).toBeDefined();
      expect(key.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should generate hybrid key pair', async () => {
      const key = await service.generateHybridKeyPair();

      expect(key).toHaveProperty('keyId');
      expect(key.metadata?.hybrid).toBe(true);
    });
  });

  describe('Key Store', () => {
    it('should retrieve a key by ID', async () => {
      const generated = await service.generateKeyPair('kyber-768' as any);
      const retrieved = service.getKey(generated.keyId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.keyId).toBe(generated.keyId);
    });

    it('should return undefined for non-existent key', () => {
      const key = service.getKey('non-existent-key');
      expect(key).toBeUndefined();
    });

    it('should list all keys', async () => {
      await service.generateKeyPair('kyber-768' as any);
      await service.generateKeyPair('kyber-768' as any);

      const keys = service.listKeys();
      expect(keys.length).toBeGreaterThanOrEqual(2);
    });

    it('should delete a key', async () => {
      const key = await service.generateKeyPair('kyber-768' as any);
      const deleted = service.deleteKey(key.keyId);

      expect(deleted).toBe(true);
      expect(service.getKey(key.keyId)).toBeUndefined();
    });

    it('should get public key only', async () => {
      const key = await service.generateKeyPair('kyber-768' as any);
      const publicKey = service.getPublicKey(key.keyId);

      expect(publicKey).toBeDefined();
      expect(publicKey).toBeInstanceOf(Uint8Array);
    });
  });

  describe('KEM Operations', () => {
    it('should encapsulate with valid key', async () => {
      const key = await service.generateKeyPair('kyber-768' as any);
      const result = await service.encapsulate(key.keyId);

      expect(result).toHaveProperty('ciphertext');
      expect(result).toHaveProperty('sharedSecret');
    });

    it('should decapsulate with valid inputs', async () => {
      const key = await service.generateKeyPair('kyber-768' as any);
      const { ciphertext } = await service.encapsulate(key.keyId);
      const sharedSecret = await service.decapsulate(key.keyId, ciphertext);

      expect(sharedSecret).toBeInstanceOf(Uint8Array);
    });

    it('should throw error for non-existent key', async () => {
      await expect(service.encapsulate('non-existent')).rejects.toThrow(
        /Key not found/
      );
    });
  });

  describe('Signature Operations', () => {
    it('should sign message', async () => {
      const key = await service.generateKeyPair('dilithium-3' as any);
      const message = new TextEncoder().encode('Test message');
      const signature = await service.sign(key.keyId, message);

      expect(signature).toHaveProperty('signature');
      expect(signature).toHaveProperty('algorithm');
    });

    it('should verify signature', async () => {
      const key = await service.generateKeyPair('dilithium-3' as any);
      const message = new TextEncoder().encode('Test message');
      const { signature } = await service.sign(key.keyId, message);

      const isValid = await service.verify(key.keyId, message, signature);
      expect(isValid).toBe(true);
    });
  });

  describe('Key Rotation', () => {
    it('should rotate a key', async () => {
      const oldKey = await service.generateKeyPair('kyber-768' as any);
      const newKey = await service.rotateKey(oldKey.keyId);

      expect(newKey.keyId).not.toBe(oldKey.keyId);
      expect(newKey.metadata?.rotatedFrom).toBe(oldKey.keyId);
    });

    it('should throw error when rotating non-existent key', async () => {
      await expect(service.rotateKey('non-existent')).rejects.toThrow(
        /Key not found/
      );
    });
  });

  describe('Validation and Benchmarking', () => {
    it('should validate algorithm', async () => {
      const isValid = await service.validateAlgorithm('kyber-768' as any);
      expect(isValid).toBe(true);
    });

    it('should benchmark algorithm', async () => {
      const results = await service.benchmarkAlgorithm('kyber-768' as any);
      expect(typeof results).toBe('string');
    });
  });

  describe('Risk Assessment', () => {
    it('should generate quantum risk report', async () => {
      const report = await service.getQuantumRiskReport();

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('vulnerableAssets');
      expect(report).toHaveProperty('migratedAssets');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('overallRiskLevel');
    });
  });

  describe('Statistics', () => {
    it('should return service statistics', async () => {
      await service.generateKeyPair('kyber-768' as any);
      const stats = service.getStatistics();

      expect(stats).toHaveProperty('totalKeys');
      expect(stats).toHaveProperty('keysByAlgorithm');
      expect(stats).toHaveProperty('operations');
      expect(stats).toHaveProperty('recentOperations');
    });
  });

  describe('Supported Algorithms', () => {
    it('should return supported algorithms', () => {
      const algorithms = service.getSupportedAlgorithms();

      expect(algorithms).toHaveProperty('kem');
      expect(algorithms).toHaveProperty('signature');
      expect(algorithms.kem.length).toBeGreaterThan(0);
      expect(algorithms.signature.length).toBeGreaterThan(0);
    });
  });

  describe('Event Emission', () => {
    it('should emit keyGenerated event', async () => {
      const listener = jest.fn();
      service.on('keyGenerated', listener);

      await service.generateKeyPair('kyber-768' as any);

      expect(listener).toHaveBeenCalled();
    });

    it('should emit keyDeleted event', async () => {
      const listener = jest.fn();
      service.on('keyDeleted', listener);

      const key = await service.generateKeyPair('kyber-768' as any);
      service.deleteKey(key.keyId);

      expect(listener).toHaveBeenCalled();
    });

    it('should emit keyRotated event', async () => {
      const listener = jest.fn();
      service.on('keyRotated', listener);

      const key = await service.generateKeyPair('kyber-768' as any);
      await service.rotateKey(key.keyId);

      expect(listener).toHaveBeenCalled();
    });
  });
});
