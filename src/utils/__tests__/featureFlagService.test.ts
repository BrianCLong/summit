import fs from 'fs';
import os from 'os';
import path from 'path';

describe('FeatureFlagService', () => {
  const fixturePath = path.resolve(__dirname, '__fixtures__', 'quality-gates.yaml');
  const originalEnv = process.env.NODE_ENV;
  let originalCwd: string;
  let tempDir: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quality-flags-'));
    fs.mkdirSync(path.join(tempDir, 'feature-flags'));
    fs.copyFileSync(fixturePath, path.join(tempDir, 'feature-flags', 'flags.yaml'));
    process.chdir(tempDir);
    process.env.NODE_ENV = 'staging';
  });

  afterEach(() => {
    process.chdir(originalCwd);

    if (originalEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalEnv;
    }

    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    jest.resetModules();
  });

  async function createService() {
    jest.resetModules();
    const module = await import('../featureFlags');
    const FeatureFlagServiceClass = module.FeatureFlagService as unknown as { getInstance: () => any; instance?: any };
    (FeatureFlagServiceClass as any).instance = undefined;
    return FeatureFlagServiceClass.getInstance();
  }

  it('enforces guardrail dependencies before enabling rollout flags', async () => {
    const service = await createService();

    const dependent = service.getFlag('dependent-flag');
    expect(dependent.enabled).toBe(false);
    expect(dependent.reason).toContain('Guardrails not satisfied');
    expect(service.isEnabled('base-flag')).toBe(false);
  });

  it('retains immutable flags when the kill switch is activated', async () => {
    const service = await createService();

    service.emergencyKillSwitch();

    const base = service.getFlag('base-flag');
    expect(base.enabled).toBe(false);
    expect(base.reason).toContain('Globally disabled');

    const immutable = service.getFlag('immutable-flag');
    expect(immutable.enabled).toBe(true);
    expect(immutable.reason).toContain('Full rollout');
  });

  it('returns descriptive metadata when a flag is missing', async () => {
    const service = await createService();
    const missing = service.getFlag('not-a-real-flag');
    expect(missing.enabled).toBe(false);
    expect(missing.reason).toBe('Flag not found');
  });
});
