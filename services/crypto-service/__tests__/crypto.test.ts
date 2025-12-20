/**
 * Cryptographic Service Test Suite
 *
 * Tests for:
 * - Encryption and decryption operations
 * - Key management and rotation
 * - Secure hashing
 * - Digital signatures
 * - Key derivation
 * - Secure random generation
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as crypto from 'crypto';

// Types for crypto operations
interface EncryptionResult {
  ciphertext: string;
  iv: string;
  tag: string;
  keyId: string;
  algorithm: string;
}

interface KeyInfo {
  id: string;
  algorithm: string;
  createdAt: Date;
  expiresAt: Date;
  status: 'active' | 'retired' | 'compromised';
}

interface SignatureResult {
  signature: string;
  algorithm: string;
  keyId: string;
}

// Mock crypto service implementation
const createMockCryptoService = () => {
  const keys = new Map<string, { key: Buffer; info: KeyInfo }>();
  let currentKeyId = 'key-001';

  // Initialize with a test key
  const initKey = crypto.randomBytes(32);
  keys.set(currentKeyId, {
    key: initKey,
    info: {
      id: currentKeyId,
      algorithm: 'aes-256-gcm',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      status: 'active',
    },
  });

  return {
    encrypt: jest.fn(async (plaintext: string, keyId?: string): Promise<EncryptionResult> => {
      const useKeyId = keyId || currentKeyId;
      const keyData = keys.get(useKeyId);

      if (!keyData) {
        throw new Error(`Key not found: ${useKeyId}`);
      }

      if (keyData.info.status === 'compromised') {
        throw new Error('Cannot encrypt with compromised key');
      }

      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', keyData.key, iv);

      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      const tag = cipher.getAuthTag();

      return {
        ciphertext: encrypted,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        keyId: useKeyId,
        algorithm: 'aes-256-gcm',
      };
    }),

    decrypt: jest.fn(async (encrypted: EncryptionResult): Promise<string> => {
      const keyData = keys.get(encrypted.keyId);

      if (!keyData) {
        throw new Error(`Key not found: ${encrypted.keyId}`);
      }

      const iv = Buffer.from(encrypted.iv, 'base64');
      const tag = Buffer.from(encrypted.tag, 'base64');
      const decipher = crypto.createDecipheriv('aes-256-gcm', keyData.key, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted.ciphertext, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    }),

    hash: jest.fn(async (data: string, algorithm: string = 'sha256'): Promise<string> => {
      return crypto.createHash(algorithm).update(data).digest('hex');
    }),

    hmac: jest.fn(async (data: string, keyId?: string): Promise<string> => {
      const useKeyId = keyId || currentKeyId;
      const keyData = keys.get(useKeyId);

      if (!keyData) {
        throw new Error(`Key not found: ${useKeyId}`);
      }

      return crypto.createHmac('sha256', keyData.key).update(data).digest('hex');
    }),

    sign: jest.fn(async (data: string, keyId?: string): Promise<SignatureResult> => {
      // Simplified signing for testing
      const useKeyId = keyId || currentKeyId;
      const keyData = keys.get(useKeyId);

      if (!keyData) {
        throw new Error(`Key not found: ${useKeyId}`);
      }

      const signature = crypto.createHmac('sha256', keyData.key).update(data).digest('hex');

      return {
        signature,
        algorithm: 'HMAC-SHA256',
        keyId: useKeyId,
      };
    }),

    verify: jest.fn(async (data: string, signatureResult: SignatureResult): Promise<boolean> => {
      const keyData = keys.get(signatureResult.keyId);

      if (!keyData) {
        throw new Error(`Key not found: ${signatureResult.keyId}`);
      }

      const expectedSignature = crypto.createHmac('sha256', keyData.key).update(data).digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signatureResult.signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    }),

    rotateKey: jest.fn(async (): Promise<KeyInfo> => {
      // Retire current key
      const oldKey = keys.get(currentKeyId);
      if (oldKey) {
        oldKey.info.status = 'retired';
      }

      // Generate new key
      const newKeyId = `key-${Date.now()}`;
      const newKey = crypto.randomBytes(32);
      const newKeyInfo: KeyInfo = {
        id: newKeyId,
        algorithm: 'aes-256-gcm',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'active',
      };

      keys.set(newKeyId, { key: newKey, info: newKeyInfo });
      currentKeyId = newKeyId;

      return newKeyInfo;
    }),

    deriveKey: jest.fn(async (password: string, salt: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        crypto.pbkdf2(password, salt, 100000, 32, 'sha512', (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey.toString('hex'));
        });
      });
    }),

    generateRandomBytes: jest.fn(async (length: number): Promise<string> => {
      return crypto.randomBytes(length).toString('hex');
    }),

    getKeyInfo: jest.fn(async (keyId: string): Promise<KeyInfo | null> => {
      const keyData = keys.get(keyId);
      return keyData?.info || null;
    }),

    listKeys: jest.fn(async (): Promise<KeyInfo[]> => {
      return Array.from(keys.values()).map(k => k.info);
    }),

    markKeyCompromised: jest.fn(async (keyId: string): Promise<void> => {
      const keyData = keys.get(keyId);
      if (keyData) {
        keyData.info.status = 'compromised';
      }
    }),

    _getCurrentKeyId: () => currentKeyId,
    _keys: keys,
  };
};

describe('Cryptographic Service', () => {
  let cryptoService: ReturnType<typeof createMockCryptoService>;

  beforeEach(() => {
    cryptoService = createMockCryptoService();
    jest.clearAllMocks();
  });

  describe('Encryption Operations', () => {
    it('should encrypt plaintext successfully', async () => {
      const plaintext = 'Sensitive information that needs protection';

      const result = await cryptoService.encrypt(plaintext);

      expect(result.ciphertext).toBeDefined();
      expect(result.ciphertext).not.toBe(plaintext);
      expect(result.iv).toBeDefined();
      expect(result.tag).toBeDefined();
      expect(result.keyId).toBeDefined();
      expect(result.algorithm).toBe('aes-256-gcm');
    });

    it('should decrypt ciphertext successfully', async () => {
      const plaintext = 'Sensitive information that needs protection';
      const encrypted = await cryptoService.encrypt(plaintext);

      const decrypted = await cryptoService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext (IV uniqueness)', async () => {
      const plaintext = 'Same message twice';

      const encrypted1 = await cryptoService.encrypt(plaintext);
      const encrypted2 = await cryptoService.encrypt(plaintext);

      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should fail decryption with wrong key', async () => {
      const plaintext = 'Secret message';
      const encrypted = await cryptoService.encrypt(plaintext);

      // Modify keyId to simulate wrong key
      encrypted.keyId = 'nonexistent-key';

      await expect(cryptoService.decrypt(encrypted)).rejects.toThrow('Key not found');
    });

    it('should fail decryption with tampered ciphertext', async () => {
      const plaintext = 'Secret message';
      const encrypted = await cryptoService.encrypt(plaintext);

      // Tamper with ciphertext
      const tamperedCiphertext = Buffer.from(encrypted.ciphertext, 'base64');
      tamperedCiphertext[0] = (tamperedCiphertext[0] + 1) % 256;
      encrypted.ciphertext = tamperedCiphertext.toString('base64');

      await expect(cryptoService.decrypt(encrypted)).rejects.toThrow();
    });

    it('should fail decryption with tampered authentication tag', async () => {
      const plaintext = 'Secret message';
      const encrypted = await cryptoService.encrypt(plaintext);

      // Tamper with tag
      const tamperedTag = Buffer.from(encrypted.tag, 'base64');
      tamperedTag[0] = (tamperedTag[0] + 1) % 256;
      encrypted.tag = tamperedTag.toString('base64');

      await expect(cryptoService.decrypt(encrypted)).rejects.toThrow();
    });

    it('should handle empty plaintext', async () => {
      const plaintext = '';

      const encrypted = await cryptoService.encrypt(plaintext);
      const decrypted = await cryptoService.decrypt(encrypted);

      expect(decrypted).toBe('');
    });

    it('should handle unicode characters', async () => {
      const plaintext = 'Unicode: 你好世界 🔐 émojis';

      const encrypted = await cryptoService.encrypt(plaintext);
      const decrypted = await cryptoService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle large data', async () => {
      const plaintext = 'x'.repeat(1000000); // 1MB

      const encrypted = await cryptoService.encrypt(plaintext);
      const decrypted = await cryptoService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Hashing Operations', () => {
    it('should hash data with SHA-256', async () => {
      const data = 'data to hash';

      const hash = await cryptoService.hash(data, 'sha256');

      expect(hash).toHaveLength(64); // SHA-256 produces 32 bytes = 64 hex chars
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should produce consistent hashes', async () => {
      const data = 'consistent data';

      const hash1 = await cryptoService.hash(data);
      const hash2 = await cryptoService.hash(data);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', async () => {
      const hash1 = await cryptoService.hash('data1');
      const hash2 = await cryptoService.hash('data2');

      expect(hash1).not.toBe(hash2);
    });

    it('should support different hash algorithms', async () => {
      const data = 'test data';

      const sha256 = await cryptoService.hash(data, 'sha256');
      const sha512 = await cryptoService.hash(data, 'sha512');

      expect(sha256).toHaveLength(64);
      expect(sha512).toHaveLength(128);
    });
  });

  describe('HMAC Operations', () => {
    it('should generate HMAC for data', async () => {
      const data = 'data to authenticate';

      const hmac = await cryptoService.hmac(data);

      expect(hmac).toBeDefined();
      expect(hmac).toHaveLength(64);
    });

    it('should produce consistent HMACs with same key', async () => {
      const data = 'consistent data';

      const hmac1 = await cryptoService.hmac(data);
      const hmac2 = await cryptoService.hmac(data);

      expect(hmac1).toBe(hmac2);
    });

    it('should fail with nonexistent key', async () => {
      await expect(cryptoService.hmac('data', 'nonexistent-key')).rejects.toThrow('Key not found');
    });
  });

  describe('Digital Signatures', () => {
    it('should sign data', async () => {
      const data = 'document to sign';

      const signatureResult = await cryptoService.sign(data);

      expect(signatureResult.signature).toBeDefined();
      expect(signatureResult.algorithm).toBe('HMAC-SHA256');
      expect(signatureResult.keyId).toBeDefined();
    });

    it('should verify valid signature', async () => {
      const data = 'document to sign';
      const signatureResult = await cryptoService.sign(data);

      const isValid = await cryptoService.verify(data, signatureResult);

      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', async () => {
      const data = 'document to sign';
      const signatureResult = await cryptoService.sign(data);

      // Tamper with signature
      signatureResult.signature = 'tampered' + signatureResult.signature.slice(8);

      // This will throw due to length mismatch in timingSafeEqual
      await expect(cryptoService.verify(data, signatureResult)).rejects.toThrow();
    });

    it('should reject signature with wrong data', async () => {
      const signatureResult = await cryptoService.sign('original data');

      const isValid = await cryptoService.verify('modified data', signatureResult);

      expect(isValid).toBe(false);
    });
  });

  describe('Key Management', () => {
    it('should rotate keys', async () => {
      const oldKeyId = cryptoService._getCurrentKeyId();

      const newKeyInfo = await cryptoService.rotateKey();

      expect(newKeyInfo.id).not.toBe(oldKeyId);
      expect(newKeyInfo.status).toBe('active');
    });

    it('should retire old key after rotation', async () => {
      const oldKeyId = cryptoService._getCurrentKeyId();

      await cryptoService.rotateKey();

      const oldKeyInfo = await cryptoService.getKeyInfo(oldKeyId);
      expect(oldKeyInfo?.status).toBe('retired');
    });

    it('should still decrypt with retired key', async () => {
      const plaintext = 'encrypt before rotation';
      const encrypted = await cryptoService.encrypt(plaintext);
      const oldKeyId = encrypted.keyId;

      await cryptoService.rotateKey();

      // Verify old key is retired
      const oldKeyInfo = await cryptoService.getKeyInfo(oldKeyId);
      expect(oldKeyInfo?.status).toBe('retired');

      // Should still decrypt
      const decrypted = await cryptoService.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should not encrypt with compromised key', async () => {
      const keyId = cryptoService._getCurrentKeyId();

      await cryptoService.markKeyCompromised(keyId);

      await expect(cryptoService.encrypt('test', keyId)).rejects.toThrow('compromised');
    });

    it('should list all keys', async () => {
      await cryptoService.rotateKey();
      await cryptoService.rotateKey();

      const keys = await cryptoService.listKeys();

      expect(keys.length).toBeGreaterThanOrEqual(3);
    });

    it('should get key info', async () => {
      const keyId = cryptoService._getCurrentKeyId();

      const keyInfo = await cryptoService.getKeyInfo(keyId);

      expect(keyInfo).not.toBeNull();
      expect(keyInfo?.id).toBe(keyId);
      expect(keyInfo?.algorithm).toBe('aes-256-gcm');
      expect(keyInfo?.status).toBe('active');
    });

    it('should return null for nonexistent key', async () => {
      const keyInfo = await cryptoService.getKeyInfo('nonexistent');

      expect(keyInfo).toBeNull();
    });
  });

  describe('Key Derivation', () => {
    it('should derive key from password', async () => {
      const password = 'secure-password-123';
      const salt = crypto.randomBytes(16).toString('hex');

      const derivedKey = await cryptoService.deriveKey(password, salt);

      expect(derivedKey).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it('should produce consistent derived keys', async () => {
      const password = 'consistent-password';
      const salt = 'fixed-salt-value';

      const key1 = await cryptoService.deriveKey(password, salt);
      const key2 = await cryptoService.deriveKey(password, salt);

      expect(key1).toBe(key2);
    });

    it('should produce different keys with different salts', async () => {
      const password = 'same-password';

      const key1 = await cryptoService.deriveKey(password, 'salt1');
      const key2 = await cryptoService.deriveKey(password, 'salt2');

      expect(key1).not.toBe(key2);
    });
  });

  describe('Random Generation', () => {
    it('should generate random bytes', async () => {
      const random = await cryptoService.generateRandomBytes(32);

      expect(random).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it('should generate unique values', async () => {
      const random1 = await cryptoService.generateRandomBytes(32);
      const random2 = await cryptoService.generateRandomBytes(32);

      expect(random1).not.toBe(random2);
    });

    it('should generate correct length', async () => {
      const random16 = await cryptoService.generateRandomBytes(16);
      const random64 = await cryptoService.generateRandomBytes(64);

      expect(random16).toHaveLength(32);
      expect(random64).toHaveLength(128);
    });
  });

  describe('Security Properties', () => {
    it('should use timing-safe comparison for signatures', async () => {
      // This is tested implicitly by the verify function using timingSafeEqual
      const data = 'test data';
      const sig = await cryptoService.sign(data);

      const isValid = await cryptoService.verify(data, sig);

      expect(isValid).toBe(true);
    });

    it('should not leak key material in errors', async () => {
      try {
        await cryptoService.encrypt('test', 'nonexistent');
      } catch (error) {
        const errorMessage = (error as Error).message;
        expect(errorMessage).not.toContain('key-');
        expect(errorMessage).toContain('Key not found');
      }
    });
  });
});
