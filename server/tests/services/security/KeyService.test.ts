import { jest, beforeAll } from '@jest/globals';

let KeyService: typeof import('../../../src/services/security/KeyService.js').KeyService;

beforeAll(async () => {
  process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
  process.env.NEO4J_PASSWORD = 'password';
  process.env.JWT_SECRET = 'x'.repeat(32);
  process.env.JWT_REFRESH_SECRET = 'y'.repeat(32);
  process.env.SESSION_SECRET = 'z'.repeat(32);
  process.env.ENCRYPTION_KEY =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  ({ KeyService } = await import('../../../src/services/security/KeyService.js'));
});

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
