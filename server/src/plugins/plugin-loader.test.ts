import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { PluginLoader } from './plugin-loader';
import type { PluginContext } from './sdk';

describe('PluginLoader', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'summit-plugin-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    delete process.env.TEST_PLUGIN_ENV;
  });

  it('loads manifests and executes plugins within the sandbox', async () => {
    process.env.TEST_PLUGIN_ENV = 'sandboxed';
    const pluginRoot = path.join(tmpDir, 'example');
    await fs.mkdir(pluginRoot, { recursive: true });

    const manifest = {
      name: 'test-plugin',
      version: '1.2.3',
      entry: './index.js',
      allowedEnv: ['TEST_PLUGIN_ENV'],
      allowedVaultPaths: ['secret/data/'],
      cacheKeyPrefix: 'test-plugin',
    };

    await fs.writeFile(path.join(pluginRoot, 'plugin.json'), JSON.stringify(manifest, null, 2));

    const moduleSource = `
      module.exports = {
        metadata: { name: 'test-plugin', version: '1.2.3' },
        async execute({ inputs, context, config }) {
          context.logger.info('executing', inputs.message);
          const secret = await context.vault.read('secret/data/example');
          const cached = context.cache ? await context.cache.get('message') : null;
          if (context.cache) {
            await context.cache.set('message', inputs.message, config.ttl);
          }
          return {
            received: inputs.message,
            env: context.env.TEST_PLUGIN_ENV,
            secret,
            cached,
            manifestName: context.manifest.name,
          };
        }
      };
    `;

    await fs.writeFile(path.join(pluginRoot, 'index.js'), moduleSource);

    const loader = new PluginLoader({ rootDir: tmpDir });
    const loaded = await loader.loadAll();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].manifest.name).toBe('test-plugin');

    const cacheGet = jest.fn(async () => null);
    const cacheSet = jest.fn(async () => undefined);
    const vaultRead = jest.fn(async (key: string) => ({ key }));
    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const pluginContext: PluginContext = {
      cache: { get: cacheGet, set: cacheSet },
      vault: { read: vaultRead },
      logger,
    };

    const result = (await loader.execute(
      'test-plugin',
      { message: 'hello' },
      pluginContext,
      { config: { ttl: 60 } },
    )) as Record<string, unknown>;

    expect(result).toEqual({
      received: 'hello',
      env: 'sandboxed',
      secret: { key: 'secret/data/example' },
      cached: null,
      manifestName: 'test-plugin',
    });

    expect(cacheGet).toHaveBeenCalledWith('test-plugin:message');
    expect(cacheSet).toHaveBeenCalledWith('test-plugin:message', 'hello', 60);
    expect(vaultRead).toHaveBeenCalledWith('secret/data/example');
    expect(logger.info).toHaveBeenCalled();
  });
});
