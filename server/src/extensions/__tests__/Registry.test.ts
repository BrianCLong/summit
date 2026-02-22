import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { extensionRegistry } from '../registry';
import { NoOpExtensionManifest } from '../examples/NoOpExtension';

describe('ExtensionRegistry', () => {
  beforeEach(async () => {
    // Reset registry (using a hack or public method if available, but currently it's a singleton without reset)
    // The current implementation doesn't have a clear/reset method.
    // I should check if I can add one or if I have to uninstall.
    // I'll try uninstall if it exists.
    const list = await extensionRegistry.list();
    for (const ext of list) {
        await extensionRegistry.uninstall(ext.id);
    }
  });

  it('should register an extension', async () => {
    await extensionRegistry.register(NoOpExtensionManifest);
    const retrieved = await extensionRegistry.get(NoOpExtensionManifest.id);
    expect(retrieved).toEqual(NoOpExtensionManifest);
  });

  it('should list extensions', async () => {
    await extensionRegistry.register(NoOpExtensionManifest);
    const list = await extensionRegistry.list();
    expect(list).toHaveLength(1);
    expect(list[0]).toEqual(NoOpExtensionManifest);
  });

  it('should uninstall an extension', async () => {
    await extensionRegistry.register(NoOpExtensionManifest);
    await extensionRegistry.uninstall(NoOpExtensionManifest.id);
    const retrieved = await extensionRegistry.get(NoOpExtensionManifest.id);
    expect(retrieved).toBeNull();
  });
});
