/**
 * Kyber KEM Tests
 * Tests for CRYSTALS-Kyber key encapsulation mechanism
 */

import { KyberKEM, createKyberKEM } from '../algorithms/kyber';
import { PQCAlgorithm, SecurityLevel } from '../types';

describe('KyberKEM', () => {
  describe('Kyber-512 (Level 1)', () => {
    let kem: KyberKEM;

    beforeEach(() => {
      kem = new KyberKEM('kyber512');
    });

    it('should report correct algorithm', () => {
      expect(kem.getAlgorithm()).toBe(PQCAlgorithm.KYBER_512);
    });

    it('should report correct security level', () => {
      expect(kem.getSecurityLevel()).toBe(SecurityLevel.LEVEL_1);
    });

    it('should generate valid key pair', async () => {
      const keyPair = await kem.generateKeyPair();

      expect(keyPair).toHaveProperty('publicKey');
      expect(keyPair).toHaveProperty('privateKey');
      expect(keyPair.algorithm).toBe(PQCAlgorithm.KYBER_512);
      expect(keyPair.securityLevel).toBe(SecurityLevel.LEVEL_1);
      expect(keyPair.publicKey.length).toBe(800);
      expect(keyPair.privateKey.length).toBe(1632);
    });

    it('should encapsulate with valid public key', async () => {
      const keyPair = await kem.generateKeyPair();
      const result = await kem.encapsulate(keyPair.publicKey);

      expect(result).toHaveProperty('ciphertext');
      expect(result).toHaveProperty('sharedSecret');
      expect(result.ciphertext.length).toBe(768);
      expect(result.sharedSecret.length).toBe(32);
    });

    it('should decapsulate with valid inputs', async () => {
      const keyPair = await kem.generateKeyPair();
      const { ciphertext } = await kem.encapsulate(keyPair.publicKey);
      const sharedSecret = await kem.decapsulate(ciphertext, keyPair.privateKey);

      expect(sharedSecret).toBeInstanceOf(Uint8Array);
      expect(sharedSecret.length).toBe(32);
    });

    it('should throw error for invalid public key length', async () => {
      const invalidKey = new Uint8Array(100);
      await expect(kem.encapsulate(invalidKey)).rejects.toThrow(/Invalid public key length/);
    });

    it('should throw error for invalid private key length', async () => {
      const keyPair = await kem.generateKeyPair();
      const { ciphertext } = await kem.encapsulate(keyPair.publicKey);
      const invalidPrivateKey = new Uint8Array(100);

      await expect(kem.decapsulate(ciphertext, invalidPrivateKey)).rejects.toThrow(
        /Invalid private key length/
      );
    });

    it('should throw error for invalid ciphertext length', async () => {
      const keyPair = await kem.generateKeyPair();
      const invalidCiphertext = new Uint8Array(100);

      await expect(kem.decapsulate(invalidCiphertext, keyPair.privateKey)).rejects.toThrow(
        /Invalid ciphertext length/
      );
    });
  });

  describe('Kyber-768 (Level 3)', () => {
    let kem: KyberKEM;

    beforeEach(() => {
      kem = new KyberKEM('kyber768');
    });

    it('should have correct parameters', async () => {
      expect(kem.getAlgorithm()).toBe(PQCAlgorithm.KYBER_768);
      expect(kem.getSecurityLevel()).toBe(SecurityLevel.LEVEL_3);

      const keyPair = await kem.generateKeyPair();
      expect(keyPair.publicKey.length).toBe(1184);
      expect(keyPair.privateKey.length).toBe(2400);

      const { ciphertext } = await kem.encapsulate(keyPair.publicKey);
      expect(ciphertext.length).toBe(1088);
    });
  });

  describe('Kyber-1024 (Level 5)', () => {
    let kem: KyberKEM;

    beforeEach(() => {
      kem = new KyberKEM('kyber1024');
    });

    it('should have correct parameters', async () => {
      expect(kem.getAlgorithm()).toBe(PQCAlgorithm.KYBER_1024);
      expect(kem.getSecurityLevel()).toBe(SecurityLevel.LEVEL_5);

      const keyPair = await kem.generateKeyPair();
      expect(keyPair.publicKey.length).toBe(1568);
      expect(keyPair.privateKey.length).toBe(3168);

      const { ciphertext } = await kem.encapsulate(keyPair.publicKey);
      expect(ciphertext.length).toBe(1568);
    });
  });

  describe('createKyberKEM factory', () => {
    it('should create Kyber-512 for Level 1', () => {
      const kem = createKyberKEM(SecurityLevel.LEVEL_1);
      expect(kem.getAlgorithm()).toBe(PQCAlgorithm.KYBER_512);
    });

    it('should create Kyber-768 for Level 3', () => {
      const kem = createKyberKEM(SecurityLevel.LEVEL_3);
      expect(kem.getAlgorithm()).toBe(PQCAlgorithm.KYBER_768);
    });

    it('should create Kyber-1024 for Level 5', () => {
      const kem = createKyberKEM(SecurityLevel.LEVEL_5);
      expect(kem.getAlgorithm()).toBe(PQCAlgorithm.KYBER_1024);
    });

    it('should default to Kyber-768', () => {
      const kem = createKyberKEM();
      expect(kem.getAlgorithm()).toBe(PQCAlgorithm.KYBER_768);
    });
  });

  describe('Key Pair Generation', () => {
    it('should generate unique key pairs', async () => {
      const kem = new KyberKEM('kyber768');
      const keyPairs = await Promise.all(
        Array.from({ length: 5 }, () => kem.generateKeyPair())
      );

      const publicKeyHexes = keyPairs.map((kp) =>
        Array.from(kp.publicKey)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
      );

      const uniqueKeys = new Set(publicKeyHexes);
      expect(uniqueKeys.size).toBe(5);
    });

    it('should include metadata in key pair', async () => {
      const kem = new KyberKEM('kyber768');
      const keyPair = await kem.generateKeyPair();

      expect(keyPair.metadata).toBeDefined();
      expect(keyPair.metadata?.variant).toBe('kyber768');
      expect(keyPair.createdAt).toBeInstanceOf(Date);
    });
  });
});
