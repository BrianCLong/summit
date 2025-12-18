import * as fs from 'fs';
import * as path from 'path';
import { SecretManager } from '../lib/secrets/secret-manager';

describe('SecretManager', () => {
  const tmpDir = path.join(__dirname, 'tmp-secrets');

  beforeEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.SECRET_MANAGER_TEST;
    delete process.env.SECRET_MANAGER_DEFAULT_ONLY;
    delete process.env.CONFIG_ENCRYPTION_KEY;
  });

  it('caches env secrets and respects ttl overrides', () => {
    const manager = new SecretManager({ cacheTtlSeconds: 5, rotationIntervalSeconds: 0 });
    process.env.SECRET_MANAGER_TEST = 'initial';

    const first = manager.resolveConfig('env://SECRET_MANAGER_TEST?ttl=5') as string;
    expect(first).toBe('initial');

    const base = Date.now();
    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockImplementation(() => base);

    process.env.SECRET_MANAGER_TEST = 'updated';
    const cached = manager.resolveConfig('env://SECRET_MANAGER_TEST?ttl=5') as string;
    expect(cached).toBe('initial');

    nowSpy.mockImplementation(() => base + 6000);
    const refreshed = manager.resolveConfig('env://SECRET_MANAGER_TEST?ttl=5') as string;
    expect(refreshed).toBe('updated');

    nowSpy.mockRestore();
    manager.close();
  });

  it('supports file:// references with base paths and json fields', () => {
    const fileBasePath = path.join(tmpDir, 'base');
    fs.mkdirSync(fileBasePath, { recursive: true });
    const secretFile = path.join(fileBasePath, 'secret.json');
    fs.writeFileSync(secretFile, JSON.stringify({ token: 'file-secret', nested: { value: 'nested' } }));

    const manager = new SecretManager({ fileBasePath, rotationIntervalSeconds: 0 });

    const resolved = manager.resolveConfig({ secret: 'file://secret.json#token' }) as { secret: string };
    expect(resolved.secret).toBe('file-secret');

    const nested = manager.resolveConfig('file://' + secretFile + '#nested') as string;
    expect(nested).toBe(JSON.stringify({ value: 'nested' }));

    const defaulted = manager.resolveConfig('file://missing.json?default=fallback&optional=true') as string;
    expect(defaulted).toBe('fallback');

    manager.close();
  });

  it('decrypts enc:: secrets using the configured encryption key env', () => {
    process.env.CONFIG_ENCRYPTION_KEY = 'rotate-me';
    const ciphertext = SecretManager.encrypt('cipher-text', 'rotate-me');
    const manager = new SecretManager({ rotationIntervalSeconds: 0 });

    const resolved = manager.resolveConfig({ encrypted: ciphertext }) as { encrypted: string };
    expect(resolved.encrypted).toBe('cipher-text');

    manager.close();
  });
});
