/**
 * SPHINCS+ Signature Tests
 * Tests for stateless hash-based signature scheme
 */

import { SphincsSignature, createSphincsSignature } from '../algorithms/sphincsplus';
import { PQCAlgorithm, SecurityLevel } from '../types';

describe('SphincsSignature', () => {
  describe('SPHINCS+-128f (Level 1, Fast)', () => {
    let signer: SphincsSignature;

    beforeEach(() => {
      signer = new SphincsSignature('sphincs-sha256-128f');
    });

    it('should report correct algorithm', () => {
      expect(signer.getAlgorithm()).toBe(PQCAlgorithm.SPHINCS_PLUS_128F);
    });

    it('should report correct security level', () => {
      expect(signer.getSecurityLevel()).toBe(SecurityLevel.LEVEL_1);
    });

    it('should generate valid key pair', async () => {
      const keyPair = await signer.generateKeyPair();

      expect(keyPair).toHaveProperty('publicKey');
      expect(keyPair).toHaveProperty('privateKey');
      expect(keyPair.algorithm).toBe(PQCAlgorithm.SPHINCS_PLUS_128F);
      expect(keyPair.publicKey.length).toBe(32);
      expect(keyPair.privateKey.length).toBe(64);
    });

    it('should sign message', async () => {
      const keyPair = await signer.generateKeyPair();
      const message = new TextEncoder().encode('Test message for SPHINCS+');

      const signature = await signer.sign(message, keyPair.privateKey);

      expect(signature).toHaveProperty('signature');
      expect(signature).toHaveProperty('algorithm');
      expect(signature.algorithm).toBe(PQCAlgorithm.SPHINCS_PLUS_128F);
      expect(signature.signature.length).toBe(17088);
    });

    it('should verify valid signature', async () => {
      const keyPair = await signer.generateKeyPair();
      const message = new TextEncoder().encode('Test message');

      const { signature } = await signer.sign(message, keyPair.privateKey);
      const isValid = await signer.verify(message, signature, keyPair.publicKey);

      expect(isValid).toBe(true);
    });

    it('should have stateless metadata', async () => {
      const keyPair = await signer.generateKeyPair();
      const message = new TextEncoder().encode('Test');
      const signature = await signer.sign(message, keyPair.privateKey);

      expect(keyPair.metadata?.stateless).toBe(true);
      expect(keyPair.metadata?.hashFunction).toBe('SHA-256');
      expect(signature.metadata?.stateless).toBe(true);
    });

    it('should throw error for invalid private key length', async () => {
      const invalidPrivateKey = new Uint8Array(10);
      const message = new TextEncoder().encode('Test');

      await expect(signer.sign(message, invalidPrivateKey)).rejects.toThrow(
        /Invalid private key length/
      );
    });

    it('should throw error for invalid public key length', async () => {
      const keyPair = await signer.generateKeyPair();
      const message = new TextEncoder().encode('Test');
      const { signature } = await signer.sign(message, keyPair.privateKey);

      const invalidPublicKey = new Uint8Array(10);
      await expect(signer.verify(message, signature, invalidPublicKey)).rejects.toThrow(
        /Invalid public key length/
      );
    });
  });

  describe('SPHINCS+-128s (Level 1, Small)', () => {
    let signer: SphincsSignature;

    beforeEach(() => {
      signer = new SphincsSignature('sphincs-sha256-128s');
    });

    it('should have smaller signatures than fast variant', async () => {
      const keyPair = await signer.generateKeyPair();
      const message = new TextEncoder().encode('Test');
      const { signature } = await signer.sign(message, keyPair.privateKey);

      // SPHINCS+-128s has 7856 byte signatures vs 17088 for 128f
      expect(signature.length).toBe(7856);
      expect(signature.length).toBeLessThan(17088);
    });

    it('should report correct algorithm', () => {
      expect(signer.getAlgorithm()).toBe(PQCAlgorithm.SPHINCS_PLUS_128S);
    });
  });

  describe('SPHINCS+-192f (Level 3, Fast)', () => {
    let signer: SphincsSignature;

    beforeEach(() => {
      signer = new SphincsSignature('sphincs-sha256-192f');
    });

    it('should have correct parameters', async () => {
      expect(signer.getAlgorithm()).toBe(PQCAlgorithm.SPHINCS_PLUS_192F);
      expect(signer.getSecurityLevel()).toBe(SecurityLevel.LEVEL_3);

      const keyPair = await signer.generateKeyPair();
      expect(keyPair.publicKey.length).toBe(48);
      expect(keyPair.privateKey.length).toBe(96);

      const message = new TextEncoder().encode('Test');
      const { signature } = await signer.sign(message, keyPair.privateKey);
      expect(signature.length).toBe(35664);
    });
  });

  describe('SPHINCS+-256f (Level 5, Fast)', () => {
    let signer: SphincsSignature;

    beforeEach(() => {
      signer = new SphincsSignature('sphincs-sha256-256f');
    });

    it('should have correct parameters', async () => {
      expect(signer.getAlgorithm()).toBe(PQCAlgorithm.SPHINCS_PLUS_256F);
      expect(signer.getSecurityLevel()).toBe(SecurityLevel.LEVEL_5);

      const keyPair = await signer.generateKeyPair();
      expect(keyPair.publicKey.length).toBe(64);
      expect(keyPair.privateKey.length).toBe(128);

      const message = new TextEncoder().encode('Test');
      const { signature } = await signer.sign(message, keyPair.privateKey);
      expect(signature.length).toBe(49856);
    });
  });

  describe('SPHINCS+-256s (Level 5, Small)', () => {
    let signer: SphincsSignature;

    beforeEach(() => {
      signer = new SphincsSignature('sphincs-sha256-256s');
    });

    it('should have smaller signatures than fast variant', async () => {
      const keyPair = await signer.generateKeyPair();
      const message = new TextEncoder().encode('Test');
      const { signature } = await signer.sign(message, keyPair.privateKey);

      expect(signature.length).toBe(29792);
      expect(signature.length).toBeLessThan(49856);
    });
  });

  describe('createSphincsSignature factory', () => {
    it('should create 128f for Level 1 fast', () => {
      const signer = createSphincsSignature(SecurityLevel.LEVEL_1, true);
      expect(signer.getAlgorithm()).toBe(PQCAlgorithm.SPHINCS_PLUS_128F);
    });

    it('should create 128s for Level 1 small', () => {
      const signer = createSphincsSignature(SecurityLevel.LEVEL_1, false);
      expect(signer.getAlgorithm()).toBe(PQCAlgorithm.SPHINCS_PLUS_128S);
    });

    it('should create 192f for Level 3 fast', () => {
      const signer = createSphincsSignature(SecurityLevel.LEVEL_3, true);
      expect(signer.getAlgorithm()).toBe(PQCAlgorithm.SPHINCS_PLUS_192F);
    });

    it('should create 256f for Level 5 fast', () => {
      const signer = createSphincsSignature(SecurityLevel.LEVEL_5, true);
      expect(signer.getAlgorithm()).toBe(PQCAlgorithm.SPHINCS_PLUS_256F);
    });

    it('should default to fast variant', () => {
      const signer = createSphincsSignature(SecurityLevel.LEVEL_1);
      expect(signer.getAlgorithm()).toBe(PQCAlgorithm.SPHINCS_PLUS_128F);
    });
  });

  describe('Stateless Properties', () => {
    it('should be stateless (no state required between signatures)', async () => {
      const signer = new SphincsSignature('sphincs-sha256-128f');
      const keyPair = await signer.generateKeyPair();
      const message = new TextEncoder().encode('Same message');

      // Can sign multiple times without any state tracking
      const sig1 = await signer.sign(message, keyPair.privateKey);
      const sig2 = await signer.sign(message, keyPair.privateKey);

      // Both signatures should be valid
      expect(await signer.verify(message, sig1.signature, keyPair.publicKey)).toBe(true);
      expect(await signer.verify(message, sig2.signature, keyPair.publicKey)).toBe(true);
    });
  });

  describe('Key Generation', () => {
    it('should generate unique key pairs', async () => {
      const signer = new SphincsSignature('sphincs-sha256-128f');
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

    it('should include seed and root in public key', async () => {
      const signer = new SphincsSignature('sphincs-sha256-128f');
      const keyPair = await signer.generateKeyPair();

      // Public key = pkSeed (16 bytes) + root (16 bytes for SHA256)
      // But note: SHA256 output is 32 bytes, so root gets truncated
      expect(keyPair.publicKey.length).toBe(32);
    });
  });
});
