import fs from 'fs';
import os from 'os';
import path from 'path';

describe('FeatureFlagService integration', () => {
  const baseConfig = `features:\n  base-flag:\n    default: true\n    description: Base capability required for dependent features\n    rollout:\n      staging: 100\n      prod: 100\n  dependent-flag:\n    default: true\n    description: Requires base flag to protect runtime guardrails\n    guardrails:\n      requires:\n        - base-flag\n    rollout:\n      staging: 100\n      prod: 100\n`;

  let originalCwd: string;
  let originalEnv: string | undefined;
  let tempDir: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    originalEnv = process.env.NODE_ENV;
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-integration-'));
    fs.mkdirSync(path.join(tempDir, 'feature-flags'));
    fs.writeFileSync(path.join(tempDir, 'feature-flags', 'flags.yaml'), baseConfig, 'utf-8');
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (originalEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalEnv;
    }

    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    jest.resetModules();
  });

  async function loadService(environment: string) {
    process.env.NODE_ENV = environment;
    jest.resetModules();
    const module = await import('../../../src/utils/featureFlags');
    const FeatureFlagServiceClass = module.FeatureFlagService as unknown as {
      getInstance: () => any;
      instance?: any;
    };
    (FeatureFlagServiceClass as any).instance = undefined;
    const service = FeatureFlagServiceClass.getInstance();
    if (originalEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalEnv;
    }
    return service;
  }

  it('enables dependent flags when guardrails are satisfied in staging', async () => {
    const service = await loadService('staging');
    const dependent = service.getFlag('dependent-flag', 'qa-user');
    expect(dependent.enabled).toBe(true);
    expect(dependent.reason).toContain('Full rollout');
  });

  it('disables dependent flags when production rollout is zero', async () => {
    const configWithProdDisabled = baseConfig.replace('prod: 100', 'prod: 0');
    fs.writeFileSync(path.join(tempDir, 'feature-flags', 'flags.yaml'), configWithProdDisabled, 'utf-8');

    const service = await loadService('production');
    const dependent = service.getFlag('dependent-flag', 'qa-user');
    expect(dependent.enabled).toBe(false);
    expect(dependent.reason).toBe('Rollout disabled for production');
  });
});
