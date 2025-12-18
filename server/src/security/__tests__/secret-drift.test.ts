
import { SecretDriftDetector } from '../secret-drift';
import fs from 'fs';
import path from 'path';

// Mock fs and process.env
jest.mock('fs');
// Mock EnvSchema from config
jest.mock('../../config', () => ({
  EnvSchema: {
    shape: {
      NODE_ENV: {},
      PORT: {},
      DATABASE_URL: {},
      SECRET_KEY: {}, // Sensitive
    }
  },
  cfg: {}
}));

describe('SecretDriftDetector', () => {
  const mockEnvPath = '/test/.env';
  let detector: SecretDriftDetector;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    detector = new SecretDriftDetector(mockEnvPath);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('detectUnusedSecrets', () => {
    it('should detect keys in .env that are not in EnvSchema', () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(
        'NODE_ENV=test\nUNUSED_KEY=value\n# Comment\nSECRET_KEY=abc'
      );

      const unused = detector.detectUnusedSecrets();
      expect(unused).toContain('UNUSED_KEY');
      expect(unused).not.toContain('NODE_ENV');
      expect(unused).not.toContain('SECRET_KEY');
    });
  });

  describe('detectLeakedSecrets', () => {
    it('should detect sensitive values in source files', () => {
      process.env.SECRET_KEY = 'super_secret_value_123';

      // Mock readdirSync and statSync for traversal
      (fs.readdirSync as jest.Mock).mockImplementation((dir) => {
        if (dir === path.resolve(process.cwd(), 'src')) return ['leaky.ts'];
        return [];
      });
      (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => false });
      (fs.readFileSync as jest.Mock).mockReturnValue('const key = "super_secret_value_123";');

      const leaks = detector.detectLeakedSecrets();
      expect(leaks).toHaveLength(1);
      expect(leaks[0].secret).toBe('SECRET_KEY');
      expect(leaks[0].file).toContain('leaky.ts');
    });
  });

  describe('detectExpiredSecrets', () => {
    it('should detect insecure defaults', () => {
      process.env.SECRET_KEY = 'changeme';
      const expired = detector.detectExpiredSecrets();
      expect(expired).toHaveLength(1);
      expect(expired[0]).toContain('insecure default detected');
    });

    it('should detect expired secrets via _EXPIRY var', () => {
      process.env.SECRET_KEY = 'valid';
      process.env.SECRET_KEY_EXPIRY = '2000-01-01T00:00:00Z'; // Past date

      const expired = detector.detectExpiredSecrets();
      expect(expired).toHaveLength(1);
      expect(expired[0]).toContain('expired on');
    });
  });

  describe('enforceRemoval', () => {
    it('should remove specified keys from .env file', () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(
        'KEEP=val\nREMOVE=val\n'
      );

      detector.enforceRemoval(['REMOVE']);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockEnvPath,
        'KEEP=val\n'
      );
    });
  });
});
