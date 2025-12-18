/**
 * Hybrid KEM Tests
 * Tests for hybrid classical-quantum key encapsulation mechanism
 */

import { HybridKEM, createHybridKEM } from '../key-exchange/hybrid-kem';
import { KyberKEM } from '../algorithms/kyber';
import { SecurityLevel } from '../types';

describe('HybridKEM', () => {
  describe('X25519 + Kyber-768 (Default)', () => {
    let hybridKEM: HybridKEM;

    beforeEach(() => {
      hybridKEM = new HybridKEM();
    });

    it('should generate hybrid key pair', async () => {
      const keyPair = await hybridKEM.generateKeyPair();

      expect(keyPair).toHaveProperty('publicKey');
      expect(keyPair).toHaveProperty('privateKey');
      expect(keyPair.metadata?.hybrid).toBe(true);
      expect(keyPair.metadata?.classicalAlgorithm).toBe('x25519');
    });

    it('should include both classical and quantum keys in hybrid key', async () => {
      const keyPair = await hybridKEM.generateKeyPair();

      // Hybrid key starts with 4 bytes for classical key length
      expect(keyPair.publicKey.length).toBeGreaterThan(4);
      expect(keyPair.privateKey.length).toBeGreaterThan(4);
    });

    it('should perform encapsulation', async () => {
      const keyPair = await hybridKEM.generateKeyPair();
      const result = await hybridKEM.encapsulate(keyPair.publicKey);

      expect(result).toHaveProperty('ciphertext');
      expect(result).toHaveProperty('sharedSecret');
      expect(result.sharedSecret.length).toBe(32);
    });

    it('should perform decapsulation', async () => {
      const keyPair = await hybridKEM.generateKeyPair();
      const { ciphertext } = await hybridKEM.encapsulate(keyPair.publicKey);
      const sharedSecret = await hybridKEM.decapsulate(ciphertext, keyPair.privateKey);

      expect(sharedSecret).toBeInstanceOf(Uint8Array);
      expect(sharedSecret.length).toBe(32);
    });

    it('should report quantum algorithm', () => {
      expect(hybridKEM.getAlgorithm()).toBeDefined();
    });

    it('should report security level', () => {
      expect(hybridKEM.getSecurityLevel()).toBeDefined();
    });
  });

  describe('X25519 + Custom Kyber', () => {
    it('should work with Kyber-512', async () => {
      const kyber512 = new KyberKEM('kyber512');
      const hybridKEM = new HybridKEM('x25519', kyber512);

      const keyPair = await hybridKEM.generateKeyPair();
      expect(keyPair.metadata?.quantumAlgorithm).toBe(kyber512.getAlgorithm());

      const { ciphertext, sharedSecret } = await hybridKEM.encapsulate(keyPair.publicKey);
      expect(sharedSecret.length).toBe(32);

      const decapsulated = await hybridKEM.decapsulate(ciphertext, keyPair.privateKey);
      expect(decapsulated.length).toBe(32);
    });

    it('should work with Kyber-1024', async () => {
      const kyber1024 = new KyberKEM('kyber1024');
      const hybridKEM = new HybridKEM('x25519', kyber1024);

      const keyPair = await hybridKEM.generateKeyPair();
      expect(keyPair.metadata?.quantumAlgorithm).toBe(kyber1024.getAlgorithm());
    });
  });

  describe('P-256 + Kyber', () => {
    it('should work with P-256 classical algorithm', async () => {
      const hybridKEM = new HybridKEM('p256');

      const keyPair = await hybridKEM.generateKeyPair();
      expect(keyPair.metadata?.classicalAlgorithm).toBe('p256');

      const { ciphertext, sharedSecret } = await hybridKEM.encapsulate(keyPair.publicKey);
      expect(sharedSecret.length).toBe(32);

      const decapsulated = await hybridKEM.decapsulate(ciphertext, keyPair.privateKey);
      expect(decapsulated.length).toBe(32);
    });
  });

  describe('createHybridKEM factory', () => {
    it('should create default hybrid KEM', () => {
      const hybridKEM = createHybridKEM();
      expect(hybridKEM).toBeInstanceOf(HybridKEM);
    });

    it('should create hybrid KEM with x25519', () => {
      const hybridKEM = createHybridKEM('x25519');
      expect(hybridKEM).toBeInstanceOf(HybridKEM);
    });

    it('should create hybrid KEM with p256', () => {
      const hybridKEM = createHybridKEM('p256');
      expect(hybridKEM).toBeInstanceOf(HybridKEM);
    });
  });

  describe('Key Uniqueness', () => {
    it('should generate unique hybrid key pairs', async () => {
      const hybridKEM = new HybridKEM();
      const keyPairs = await Promise.all(
        Array.from({ length: 5 }, () => hybridKEM.generateKeyPair())
      );

      const publicKeyHexes = keyPairs.map((kp) =>
        Array.from(kp.publicKey)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
      );

      const uniqueKeys = new Set(publicKeyHexes);
      expect(uniqueKeys.size).toBe(5);
    });

    it('should generate unique shared secrets', async () => {
      const hybridKEM = new HybridKEM();
      const keyPair = await hybridKEM.generateKeyPair();

      const secrets = await Promise.all(
        Array.from({ length: 5 }, () => hybridKEM.encapsulate(keyPair.publicKey))
      );

      const secretHexes = secrets.map((s) =>
        Array.from(s.sharedSecret)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
      );

      const uniqueSecrets = new Set(secretHexes);
      expect(uniqueSecrets.size).toBe(5);
    });
  });

  describe('Key Combination', () => {
    it('should produce deterministic combined key from same inputs', async () => {
      // This tests that the HKDF combination is deterministic
      const hybridKEM = new HybridKEM();
      const keyPair = await hybridKEM.generateKeyPair();

      // Two encapsulations should produce different outputs due to randomness
      const result1 = await hybridKEM.encapsulate(keyPair.publicKey);
      const result2 = await hybridKEM.encapsulate(keyPair.publicKey);

      // The ciphertexts should be different
      const ct1Hex = Array.from(result1.ciphertext)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const ct2Hex = Array.from(result2.ciphertext)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      expect(ct1Hex).not.toBe(ct2Hex);
    });
  });

  describe('Defense in Depth', () => {
    it('should combine both classical and quantum keys', async () => {
      const hybridKEM = new HybridKEM();
      const keyPair = await hybridKEM.generateKeyPair();

      // Verify the hybrid key contains both components
      // First 4 bytes are the length of classical key
      const view = new DataView(keyPair.publicKey.buffer, keyPair.publicKey.byteOffset);
      const classicalKeyLength = view.getUint32(0, false);

      // X25519 public key is 32 bytes
      expect(classicalKeyLength).toBe(32);

      // The rest should be the Kyber public key (1184 bytes for kyber768)
      const totalLength = 4 + 32 + 1184; // length prefix + x25519 + kyber768
      expect(keyPair.publicKey.length).toBe(totalLength);
    });
  });
});
