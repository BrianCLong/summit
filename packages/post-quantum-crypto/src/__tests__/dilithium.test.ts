/**
 * Dilithium Signature Tests
 * Tests for CRYSTALS-Dilithium digital signature scheme
 */

import { DilithiumSignature, createDilithiumSignature } from '../algorithms/dilithium';
import { PQCAlgorithm, SecurityLevel } from '../types';

describe('DilithiumSignature', () => {
  describe('Dilithium2 (Level 2)', () => {
    let signer: DilithiumSignature;

    beforeEach(() => {
      signer = new DilithiumSignature('dilithium2');
    });

    it('should report correct algorithm', () => {
      expect(signer.getAlgorithm()).toBe(PQCAlgorithm.DILITHIUM_2);
    });

    it('should report correct security level', () => {
      expect(signer.getSecurityLevel()).toBe(SecurityLevel.LEVEL_2);
    });

    it('should generate valid key pair', async () => {
      const keyPair = await signer.generateKeyPair();

      expect(keyPair).toHaveProperty('publicKey');
      expect(keyPair).toHaveProperty('privateKey');
      expect(keyPair.algorithm).toBe(PQCAlgorithm.DILITHIUM_2);
      expect(keyPair.securityLevel).toBe(SecurityLevel.LEVEL_2);
      expect(keyPair.publicKey.length).toBe(1312);
      expect(keyPair.privateKey.length).toBe(2528);
    });

    it('should sign message', async () => {
      const keyPair = await signer.generateKeyPair();
      const message = new TextEncoder().encode('Test message for signing');

      const signature = await signer.sign(message, keyPair.privateKey);

      expect(signature).toHaveProperty('signature');
      expect(signature).toHaveProperty('algorithm');
      expect(signature).toHaveProperty('timestamp');
      expect(signature.algorithm).toBe(PQCAlgorithm.DILITHIUM_2);
      expect(signature.signature.length).toBe(2420);
    });

    it('should verify valid signature', async () => {
      const keyPair = await signer.generateKeyPair();
      const message = new TextEncoder().encode('Test message for signing');

      const { signature } = await signer.sign(message, keyPair.privateKey);
      const isValid = await signer.verify(message, signature, keyPair.publicKey);

      expect(isValid).toBe(true);
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

    it('should throw error for invalid signature length', async () => {
      const keyPair = await signer.generateKeyPair();
      const message = new TextEncoder().encode('Test');
      const invalidSignature = new Uint8Array(100);

      await expect(signer.verify(message, invalidSignature, keyPair.publicKey)).rejects.toThrow(
        /Invalid signature length/
      );
    });
  });

  describe('Dilithium3 (Level 3)', () => {
    let signer: DilithiumSignature;

    beforeEach(() => {
      signer = new DilithiumSignature('dilithium3');
    });

    it('should have correct parameters', async () => {
      expect(signer.getAlgorithm()).toBe(PQCAlgorithm.DILITHIUM_3);
      expect(signer.getSecurityLevel()).toBe(SecurityLevel.LEVEL_3);

      const keyPair = await signer.generateKeyPair();
      expect(keyPair.publicKey.length).toBe(1952);
      expect(keyPair.privateKey.length).toBe(4000);

      const message = new TextEncoder().encode('Test');
      const { signature } = await signer.sign(message, keyPair.privateKey);
      expect(signature.length).toBe(3293);
    });
  });

  describe('Dilithium5 (Level 5)', () => {
    let signer: DilithiumSignature;

    beforeEach(() => {
      signer = new DilithiumSignature('dilithium5');
    });

    it('should have correct parameters', async () => {
      expect(signer.getAlgorithm()).toBe(PQCAlgorithm.DILITHIUM_5);
      expect(signer.getSecurityLevel()).toBe(SecurityLevel.LEVEL_5);

      const keyPair = await signer.generateKeyPair();
      expect(keyPair.publicKey.length).toBe(2592);
      expect(keyPair.privateKey.length).toBe(4864);

      const message = new TextEncoder().encode('Test');
      const { signature } = await signer.sign(message, keyPair.privateKey);
      expect(signature.length).toBe(4595);
    });
  });

  describe('createDilithiumSignature factory', () => {
    it('should create Dilithium2 for Level 2', () => {
      const signer = createDilithiumSignature(SecurityLevel.LEVEL_2);
      expect(signer.getAlgorithm()).toBe(PQCAlgorithm.DILITHIUM_2);
    });

    it('should create Dilithium3 for Level 3', () => {
      const signer = createDilithiumSignature(SecurityLevel.LEVEL_3);
      expect(signer.getAlgorithm()).toBe(PQCAlgorithm.DILITHIUM_3);
    });

    it('should create Dilithium5 for Level 5', () => {
      const signer = createDilithiumSignature(SecurityLevel.LEVEL_5);
      expect(signer.getAlgorithm()).toBe(PQCAlgorithm.DILITHIUM_5);
    });

    it('should default to Dilithium3', () => {
      const signer = createDilithiumSignature();
      expect(signer.getAlgorithm()).toBe(PQCAlgorithm.DILITHIUM_3);
    });
  });

  describe('Signature Metadata', () => {
    it('should include metadata in signature', async () => {
      const signer = new DilithiumSignature('dilithium3');
      const keyPair = await signer.generateKeyPair();
      const message = new TextEncoder().encode('Test message');

      const signature = await signer.sign(message, keyPair.privateKey);

      expect(signature.metadata).toBeDefined();
      expect(signature.metadata?.messageLength).toBe(message.length);
      expect(signature.metadata?.signatureLength).toBe(3293);
      expect(signature.timestamp).toBeInstanceOf(Date);
    });

    it('should include metadata in key pair', async () => {
      const signer = new DilithiumSignature('dilithium3');
      const keyPair = await signer.generateKeyPair();

      expect(keyPair.metadata).toBeDefined();
      expect(keyPair.metadata?.variant).toBe('dilithium3');
      expect(keyPair.metadata?.publicKeySize).toBe(1952);
      expect(keyPair.metadata?.privateKeySize).toBe(4000);
    });
  });

  describe('Message Handling', () => {
    it('should sign empty message', async () => {
      const signer = new DilithiumSignature('dilithium3');
      const keyPair = await signer.generateKeyPair();
      const emptyMessage = new Uint8Array(0);

      const { signature } = await signer.sign(emptyMessage, keyPair.privateKey);
      expect(signature.length).toBe(3293);
    });

    it('should sign large message', async () => {
      const signer = new DilithiumSignature('dilithium3');
      const keyPair = await signer.generateKeyPair();
      const largeMessage = new Uint8Array(1024 * 1024); // 1MB

      const { signature } = await signer.sign(largeMessage, keyPair.privateKey);
      expect(signature.length).toBe(3293);
    });

    it('should produce different signatures for different messages', async () => {
      const signer = new DilithiumSignature('dilithium3');
      const keyPair = await signer.generateKeyPair();

      const message1 = new TextEncoder().encode('Message 1');
      const message2 = new TextEncoder().encode('Message 2');

      const sig1 = await signer.sign(message1, keyPair.privateKey);
      const sig2 = await signer.sign(message2, keyPair.privateKey);

      const sig1Hex = Array.from(sig1.signature)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const sig2Hex = Array.from(sig2.signature)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      expect(sig1Hex).not.toBe(sig2Hex);
    });
  });
});
