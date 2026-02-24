import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { SecretDriftDetector } from '../secret-drift.js';
import path from 'path';

describe('SecretDriftDetector', () => {
  const mockEnvPath = '/test/.env';
  let detector: SecretDriftDetector;

  const mockFs = {
    existsSync: jest.fn<any>(),
    readFileSync: jest.fn<any>(),
    readdirSync: jest.fn<any>(),
    statSync: jest.fn<any>(),
    writeFileSync: jest.fn<any>(),
  };

  const mockEnv: NodeJS.ProcessEnv = {};

  beforeEach(() => {
    jest.clearAllMocks();
    mockEnv.SECRET_KEY = 'super_secret_value_123';
    detector = new SecretDriftDetector(mockEnvPath, {
      fs: mockFs as any,
      env: mockEnv
    });
    mockFs.existsSync.mockReturnValue(true);
  });

  describe('detectUnusedSecrets', () => {
    it('should detect keys in .env that are not in EnvSchema', () => {
      mockFs.readFileSync.mockReturnValue(
        'NODE_ENV=test\nUNUSED_KEY=value\n# Comment\nSECRET_KEY=abc'
      );

      const unused = detector.detectUnusedSecrets();
      // EnvSchema is still the real one, but we know it has NODE_ENV
      expect(unused).toContain('UNUSED_KEY');
      expect(unused).not.toContain('NODE_ENV');
    });
  });

  describe('detectLeakedSecrets', () => {
    it('should detect sensitive values in source files', () => {
      const leakedValue = 'super_secret_value_longer_than_8_chars';
      mockEnv.JWT_SECRET = leakedValue;

      // Mock readdirSync and statSync for traversal
      mockFs.readdirSync.mockImplementation((dir: string) => {
        if (dir === path.resolve(process.cwd(), 'src')) return ['leaky.js'];
        return [];
      });
      mockFs.statSync.mockReturnValue({ isDirectory: () => false });
      mockFs.readFileSync.mockReturnValue(`const key = "${leakedValue}";`);

      const leaks = detector.detectLeakedSecrets();
      expect(leaks).toHaveLength(1);
      expect(leaks[0].secret).toBe('JWT_SECRET');
      expect(leaks[0].file).toContain('leaky.js');
    });
  });

  describe('detectExpiredSecrets', () => {
    it('should detect insecure defaults', () => {
      mockEnv.JWT_SECRET = 'changeme_but_longer_to_pass_zod_if_needed';
      mockEnv.JWT_REFRESH_SECRET = 'changeme_but_longer_to_pass_zod_if_needed';

      const expired = detector.detectExpiredSecrets();
      expect(expired.some(e => e.includes('insecure default detected'))).toBe(true);
    });

    it('should detect expired secrets via _EXPIRY var', () => {
      mockEnv.JWT_SECRET = 'valid_secret_value_longer_than_32_chars';
      mockEnv.JWT_SECRET_EXPIRY = '2000-01-01T00:00:00Z'; // Past date

      const expired = detector.detectExpiredSecrets();
      expect(expired.some(e => e.includes('expired on'))).toBe(true);
    });
  });

  describe('enforceRemoval', () => {
    it('should remove specified keys from .env file', () => {
      mockFs.readFileSync.mockReturnValue(
        'KEEP=val\nREMOVE=val\n'
      );

      detector.enforceRemoval(['REMOVE']);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        mockEnvPath,
        'KEEP=val\n'
      );
    });
  });
});