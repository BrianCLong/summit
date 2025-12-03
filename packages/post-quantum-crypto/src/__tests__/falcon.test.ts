/**
 * FALCON Signature Tests
 * Tests for FALCON digital signature scheme
 */

import { FalconSignature, createFalconSignature } from '../algorithms/falcon';
import { PQCAlgorithm, SecurityLevel } from '../types';

describe('FalconSignature', () => {
  describe('Falcon-512 (Level 1)', () => {
    let signer: FalconSignature;

    beforeEach(() => {
      signer = new FalconSignature('falcon512');
    });

    it('should report correct algorithm', () => {
      expect(signer.getAlgorithm()).toBe(PQCAlgorithm.FALCON_512);
    });

    it('should report correct security level', () => {
      expect(signer.getSecurityLevel()).toBe(SecurityLevel.LEVEL_1);
    });

    it('should generate valid key pair', async () => {
      const keyPair = await signer.generateKeyPair();

      expect(keyPair).toHaveProperty('publicKey');
      expect(keyPair).toHaveProperty('privateKey');
      expect(keyPair.algorithm).toBe(PQCAlgorithm.FALCON_512);
      expect(keyPair.securityLevel).toBe(SecurityLevel.LEVEL_1);
      expect(keyPair.publicKey.length).toBe(897);
      expect(keyPair.privateKey.length).toBe(1281);
    });

    it('should sign message', async () => {
      const keyPair = await signer.generateKeyPair();
      const message = new TextEncoder().encode('Test message for FALCON');

      const signature = await signer.sign(message, keyPair.privateKey);

      expect(signature).toHaveProperty('signature');
      expect(signature).toHaveProperty('algorithm');
      expect(signature.algorithm).toBe(PQCAlgorithm.FALCON_512);
      expect(signature.signature.length).toBe(666);
    });

    it('should verify valid signature', async () => {
      const keyPair = await signer.generateKeyPair();
      const message = new TextEncoder().encode('Test message');

      const { signature } = await signer.sign(message, keyPair.privateKey);
      const isValid = await signer.verify(message, signature, keyPair.publicKey);

      expect(isValid).toBe(true);
    });

    it('should have compact signature metadata', async () => {
      const keyPair = await signer.generateKeyPair();
      const message = new TextEncoder().encode('Test');

      const signature = await signer.sign(message, keyPair.privateKey);

      expect(signature.metadata?.compression).toBe('compact');
      expect(keyPair.metadata?.signatureCompact).toBe(true);
    });

    it('should throw error for invalid private key length', async () => {
      const invalidPrivateKey = new Uint8Array(100);
      const message = new TextEncoder().encode('Test');

      await expect(signer.sign(message, invalidPrivateKey)).rejects.toThrow(
        /Invalid private key length/
      );
    });

    it('should throw error for invalid public key length', async () => {
      const keyPair = await signer.generateKeyPair();
      const message = new TextEncoder().encode('Test');
      const { signature } = await signer.sign(message, keyPair.privateKey);

      const invalidPublicKey = new Uint8Array(100);
      await expect(signer.verify(message, signature, invalidPublicKey)).rejects.toThrow(
        /Invalid public key length/
      );
    });
  });

  describe('Falcon-1024 (Level 5)', () => {
    let signer: FalconSignature;

    beforeEach(() => {
      signer = new FalconSignature('falcon1024');
    });

    it('should have correct parameters', async () => {
      expect(signer.getAlgorithm()).toBe(PQCAlgorithm.FALCON_1024);
      expect(signer.getSecurityLevel()).toBe(SecurityLevel.LEVEL_5);

      const keyPair = await signer.generateKeyPair();
      expect(keyPair.publicKey.length).toBe(1793);
      expect(keyPair.privateKey.length).toBe(2305);

      const message = new TextEncoder().encode('Test');
      const { signature } = await signer.sign(message, keyPair.privateKey);
      expect(signature.length).toBe(1280);
    });
  });

  describe('createFalconSignature factory', () => {
    it('should create Falcon-512 for Level 1', () => {
      const signer = createFalconSignature(SecurityLevel.LEVEL_1);
      expect(signer.getAlgorithm()).toBe(PQCAlgorithm.FALCON_512);
    });

    it('should create Falcon-512 for Level 2', () => {
      const signer = createFalconSignature(SecurityLevel.LEVEL_2);
      expect(signer.getAlgorithm()).toBe(PQCAlgorithm.FALCON_512);
    });

    it('should create Falcon-512 for Level 3', () => {
      const signer = createFalconSignature(SecurityLevel.LEVEL_3);
      expect(signer.getAlgorithm()).toBe(PQCAlgorithm.FALCON_512);
    });

    it('should create Falcon-1024 for Level 5', () => {
      const signer = createFalconSignature(SecurityLevel.LEVEL_5);
      expect(signer.getAlgorithm()).toBe(PQCAlgorithm.FALCON_1024);
    });

    it('should default to Falcon-512', () => {
      const signer = createFalconSignature();
      expect(signer.getAlgorithm()).toBe(PQCAlgorithm.FALCON_512);
    });
  });

  describe('Compact Signatures', () => {
    it('should have smaller signatures than Dilithium', async () => {
      const falcon = new FalconSignature('falcon512');
      const keyPair = await falcon.generateKeyPair();
      const message = new TextEncoder().encode('Test');
      const { signature } = await falcon.sign(message, keyPair.privateKey);

      // FALCON-512 signature is 666 bytes
      // Dilithium2 signature is 2420 bytes
      expect(signature.length).toBe(666);
      expect(signature.length).toBeLessThan(2420);
    });

    it('should have compact keys', async () => {
      const falcon = new FalconSignature('falcon512');
      const keyPair = await falcon.generateKeyPair();

      // FALCON-512 public key is 897 bytes
      // Dilithium2 public key is 1312 bytes
      expect(keyPair.publicKey.length).toBe(897);
      expect(keyPair.publicKey.length).toBeLessThan(1312);
    });
  });

  describe('Key Generation', () => {
    it('should generate unique key pairs', async () => {
      const signer = new FalconSignature('falcon512');
      const keyPairs = await Promise.all(
        Array.from({ length: 5 }, () => signer.generateKeyPair())
      );

      const publicKeyHexes = keyPairs.map((kp) =>
        Array.from(kp.publicKey)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
      );

      const uniqueKeys = new Set(publicKeyHexes);
      expect(uniqueKeys.size).toBe(5);
    });
  });
});
