
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mocks
const mockAccess = jest.fn();
const mockExecFile = jest.fn((bin, args, cb) => cb(null));
const mockMkdir = jest.fn();

jest.unstable_mockModule('node:child_process', () => ({
  execFile: mockExecFile,
}));

jest.unstable_mockModule('fs', () => ({
  promises: {
    mkdir: mockMkdir,
    access: mockAccess,
  },
}));

jest.unstable_mockModule('../plugins/verify.js', () => ({
  verifyCosign: jest.fn().mockResolvedValue(true),
}));

describe('Marketplace Security', () => {
  let installStep: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.OFFLINE = 'true';
    jest.resetModules(); // Reset cache to ensure fresh import
    const module = await import('../marketplace.js');
    installStep = module.installStep;
  });

  it('should prevent path traversal in name', async () => {
    const name = '../../../../tmp/evil';
    const version = '1.0.0';

    await expect(installStep(name, version)).rejects.toThrow();

    // Verify access was NOT called
    expect(mockAccess).not.toHaveBeenCalled();
  });

  it('should prevent invalid characters in name', async () => {
    const name = 'valid-name; rm -rf /';
    const version = '1.0.0';

    await expect(installStep(name, version)).rejects.toThrow('Invalid name format');
    expect(mockAccess).not.toHaveBeenCalled();
  });

  it('should prevent invalid characters in version', async () => {
    const name = 'valid-name';
    const version = '1.0.0; rm -rf /';

    await expect(installStep(name, version)).rejects.toThrow('Invalid version format');
    expect(mockAccess).not.toHaveBeenCalled();
  });

  it('should allow valid scoped name and version', async () => {
      const name = '@scope/package-name';
      const version = '1.0.0-beta.1';

      // Should not throw
      try {
        await installStep(name, version);
      } catch (e) {
        // If it throws, test fails
        throw e;
      }

      expect(mockAccess).toHaveBeenCalled();
  });
});
