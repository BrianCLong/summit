import { jest } from '@jest/globals';
import { PluginManager } from '../core/PluginManager.js';
import {
  type Plugin,
  type PluginLoader,
  type PluginRegistry,
  type PluginMetadata,
  type DependencyResolver,
  type DependencyTree,
  type CompatibilityResult,
  PluginPermission,
  type PluginManifest,
} from '../types/plugin.js';
import * as signatureVerifier from '../security/verifySignature.js';

class StubRegistry implements PluginRegistry {
  private store = new Map<string, PluginMetadata>();

  register(plugin: PluginMetadata): Promise<void> {
    this.store.set(plugin.manifest.id, plugin);
    return Promise.resolve();
  }

  unregister(pluginId: string): Promise<void> {
    this.store.delete(pluginId);
    return Promise.resolve();
  }

  get(pluginId: string): Promise<PluginMetadata | null> {
    return Promise.resolve(this.store.get(pluginId) ?? null);
  }

  list(): Promise<PluginMetadata[]> {
    return Promise.resolve(Array.from(this.store.values()));
  }

  update(pluginId: string, updates: Partial<PluginMetadata>): Promise<void> {
    const existing = this.store.get(pluginId);
    if (!existing) {return Promise.resolve();}

    this.store.set(pluginId, { ...existing, ...updates });
    return Promise.resolve();
  }

  search(_query: string): Promise<PluginMetadata[]> {
    return this.list();
  }
}

class StubLoader implements PluginLoader {
  load(): Promise<Plugin> {
    return Promise.reject(new Error('not implemented for install tests'));
  }

  unload(): Promise<void> {
    return Promise.resolve();
  }

  reload(): Promise<void> {
    return Promise.resolve();
  }

  isLoaded(): boolean {
    return false;
  }

  getLoadedPlugins(): Map<string, Plugin> {
    return new Map();
  }
}

class StubDependencyResolver implements DependencyResolver {
  resolve(_pluginId: string, _version: string): Promise<DependencyTree> {
    return Promise.reject(new Error('not needed for install tests'));
  }

  checkCompatibility(_pluginId: string, _version: string): Promise<CompatibilityResult> {
    return Promise.resolve({ compatible: true, issues: [] });
  }
}

const baseManifest: PluginManifest = {
  id: 'sample-plugin',
  name: 'Sample Plugin',
  version: '1.2.3',
  description: 'A sample plugin manifest used for installation tests',
  author: { name: 'Plugin Author', email: 'author@example.com' },
  homepage: 'https://example.com/plugin',
  repository: 'https://example.com/plugin/repo',
  license: 'MIT',
  category: 'utility',
  main: 'dist/index.js',
  engineVersion: '1.0.0',
  permissions: [PluginPermission.READ_DATA],
  signature: {
    signature: 'signed-payload',
    publicKey: 'public-key',
  },
};

function createManager(): PluginManager {
  return new PluginManager(
    new StubLoader(),
    new StubRegistry(),
    new StubDependencyResolver(),
    '1.0.0'
  );
}

function createManifest(overrides: Partial<PluginManifest> = {}): PluginManifest {
  return {
    ...baseManifest,
    author: { ...baseManifest.author },
    signature: baseManifest.signature ? { ...baseManifest.signature } : undefined,
    ...overrides,
  };
}

describe('PluginManager.install manifest verification', () => {
  beforeEach(() => {
    process.env.PLUGIN_VERIFY_ENABLED = 'true';
    jest.restoreAllMocks();
  });

  afterEach(() => {
    delete process.env.PLUGIN_VERIFY_ENABLED;
  });

  it('rejects invalid manifest with stable error code', async () => {
    const manager = createManager();
    const invalidManifest = createManifest({ id: 'INVALID ID' });

    await expect(
      manager.install(invalidManifest, { type: 'local', location: './plugin' })
    ).rejects.toMatchObject({ code: 'PLUGIN_MANIFEST_INVALID' });
  });

  it('accepts a valid manifest when verification is enabled', async () => {
    const manager = createManager();
    const validManifest = createManifest();

    await expect(
      manager.install(validManifest, { type: 'local', location: './plugin' })
    ).resolves.not.toThrow();
  });

  it('invokes signature verification when the flag is enabled', async () => {
    const manager = createManager();
    const validManifest = createManifest();
    const verifySpy = jest.spyOn(signatureVerifier, 'verifySignature');

    await manager.install(validManifest, { type: 'local', location: './plugin' });

    expect(verifySpy).toHaveBeenCalledWith(
      expect.objectContaining({ manifest: expect.objectContaining({ id: validManifest.id }) })
    );
  });
});
