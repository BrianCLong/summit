/**
 * Extension Registry Tests
 */

import { ExtensionRegistry } from '../src/registry.js';
import { ExtensionManifest, ExtensionType, ExtensionCapability } from '../src/types.js';

describe('ExtensionRegistry', () => {
  let registry: ExtensionRegistry;

  const createManifest = (overrides: Partial<ExtensionManifest> = {}): ExtensionManifest => ({
    name: 'test-extension',
    displayName: 'Test Extension',
    version: '1.0.0',
    description: 'A test extension',
    type: ExtensionType.TOOL,
    capabilities: [ExtensionCapability.COPILOT_TOOL],
    permissions: [],
    entrypoints: {
      main: {
        type: 'function',
        path: 'dist/index.js',
      },
    },
    ...overrides,
  });

  beforeEach(() => {
    registry = new ExtensionRegistry();
  });

  describe('register', () => {
    it('should register an extension', () => {
      const manifest = createManifest();
      registry.register(manifest, '/path/to/extension');

      const ext = registry.get('test-extension');
      expect(ext).toBeDefined();
      expect(ext?.manifest.name).toBe('test-extension');
      expect(ext?.path).toBe('/path/to/extension');
      expect(ext?.loaded).toBe(false);
      expect(ext?.enabled).toBe(true);
    });

    it('should replace extension with higher version', () => {
      const manifest1 = createManifest({ version: '1.0.0' });
      const manifest2 = createManifest({ version: '2.0.0' });

      registry.register(manifest1, '/path/v1');
      registry.register(manifest2, '/path/v2');

      const ext = registry.get('test-extension');
      expect(ext?.manifest.version).toBe('2.0.0');
      expect(ext?.path).toBe('/path/v2');
    });

    it('should not replace extension with lower version', () => {
      const manifest1 = createManifest({ version: '2.0.0' });
      const manifest2 = createManifest({ version: '1.0.0' });

      registry.register(manifest1, '/path/v2');
      registry.register(manifest2, '/path/v1');

      const ext = registry.get('test-extension');
      expect(ext?.manifest.version).toBe('2.0.0');
      expect(ext?.path).toBe('/path/v2');
    });
  });

  describe('markLoaded', () => {
    it('should mark extension as loaded', () => {
      const manifest = createManifest();
      registry.register(manifest, '/path');

      const mockModule = { activate: jest.fn() };
      registry.markLoaded('test-extension', mockModule, { key: 'value' });

      const ext = registry.get('test-extension');
      expect(ext?.loaded).toBe(true);
      expect(ext?.module).toBe(mockModule);
      expect(ext?.config).toEqual({ key: 'value' });
    });

    it('should throw if extension not found', () => {
      expect(() => {
        registry.markLoaded('non-existent', {});
      }).toThrow('Extension non-existent not found');
    });
  });

  describe('markFailed', () => {
    it('should mark extension as failed', () => {
      const manifest = createManifest();
      registry.register(manifest, '/path');

      registry.markFailed('test-extension', 'Load error');

      const ext = registry.get('test-extension');
      expect(ext?.loaded).toBe(false);
      expect(ext?.error).toBe('Load error');
    });
  });

  describe('getByCapability', () => {
    it('should return extensions with matching capability', () => {
      const manifest1 = createManifest({
        name: 'ext1',
        capabilities: [ExtensionCapability.COPILOT_TOOL],
      });
      const manifest2 = createManifest({
        name: 'ext2',
        capabilities: [ExtensionCapability.UI_WIDGET],
      });

      registry.register(manifest1, '/path1');
      registry.register(manifest2, '/path2');
      registry.markLoaded('ext1', {});
      registry.markLoaded('ext2', {});

      const copilotExts = registry.getByCapability(ExtensionCapability.COPILOT_TOOL);
      expect(copilotExts).toHaveLength(1);
      expect(copilotExts[0].manifest.name).toBe('ext1');
    });
  });

  describe('getByType', () => {
    it('should return extensions of matching type', () => {
      const manifest1 = createManifest({ name: 'ext1', type: ExtensionType.TOOL });
      const manifest2 = createManifest({ name: 'ext2', type: ExtensionType.WIDGET });

      registry.register(manifest1, '/path1');
      registry.register(manifest2, '/path2');
      registry.markLoaded('ext1', {});
      registry.markLoaded('ext2', {});

      const tools = registry.getByType(ExtensionType.TOOL);
      expect(tools).toHaveLength(1);
      expect(tools[0].manifest.name).toBe('ext1');
    });
  });

  describe('enable/disable', () => {
    it('should enable and disable extensions', () => {
      const manifest = createManifest();
      registry.register(manifest, '/path');

      expect(registry.get('test-extension')?.enabled).toBe(true);

      registry.disable('test-extension');
      expect(registry.get('test-extension')?.enabled).toBe(false);

      registry.enable('test-extension');
      expect(registry.get('test-extension')?.enabled).toBe(true);
    });
  });

  describe('unregister', () => {
    it('should remove extension from registry', () => {
      const manifest = createManifest();
      registry.register(manifest, '/path');

      expect(registry.get('test-extension')).toBeDefined();

      registry.unregister('test-extension');
      expect(registry.get('test-extension')).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const manifest1 = createManifest({ name: 'ext1', type: ExtensionType.TOOL });
      const manifest2 = createManifest({ name: 'ext2', type: ExtensionType.WIDGET });
      const manifest3 = createManifest({ name: 'ext3', type: ExtensionType.TOOL });

      registry.register(manifest1, '/path1');
      registry.register(manifest2, '/path2');
      registry.register(manifest3, '/path3');

      registry.markLoaded('ext1', {});
      registry.markFailed('ext2', 'Error');
      registry.disable('ext3');

      const stats = registry.getStats();
      expect(stats.total).toBe(3);
      expect(stats.loaded).toBe(1);
      expect(stats.enabled).toBe(2);
      expect(stats.failed).toBe(1);
      expect(stats.byType).toEqual({ tool: 2, widget: 1 });
    });
  });

  describe('clear', () => {
    it('should remove all extensions', () => {
      registry.register(createManifest({ name: 'ext1' }), '/path1');
      registry.register(createManifest({ name: 'ext2' }), '/path2');

      expect(registry.getAll()).toHaveLength(2);

      registry.clear();
      expect(registry.getAll()).toHaveLength(0);
    });
  });
});
