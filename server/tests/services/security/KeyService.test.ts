import { jest } from '@jest/globals';

// Mock config BEFORE importing KeyService
jest.mock('../../../src/config/secrets.js', () => ({
  default: {
    ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' // 64 hex chars
  }
}));

import { KeyService } from '../../../src/services/security/KeyService.js';

describe('KeyService', () => {
  describe('generateApiKey', () => {
    it('should generate a key with correct prefix and hash', async () => {
      const { key, hash } = await KeyService.generateApiKey('test_sk');
      expect(key).toMatch(/^test_sk_/);
      expect(hash).toContain(':');
    });
  });

  describe('verifyKey', () => {
    it('should verify a valid key', async () => {
      const { key, hash } = await KeyService.generateApiKey();
      const isValid = await KeyService.verifyKey(key, hash);
      expect(isValid).toBe(true);
    });

    it('should reject an invalid key', async () => {
      const { hash } = await KeyService.generateApiKey();
      const isValid = await KeyService.verifyKey('wrong_key', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt a string', () => {
        const original = 'super-secret-api-key';
        const encrypted = KeyService.encrypt(original);
        expect(encrypted).not.toBe(original);
        expect(encrypted).toContain(':'); // IV:AuthTag:Ciphertext

        const decrypted = KeyService.decrypt(encrypted);
        expect(decrypted).toBe(original);
    });
  });
});
