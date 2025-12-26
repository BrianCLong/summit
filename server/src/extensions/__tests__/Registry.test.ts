import { extensionRegistry } from '../registry';
import { NoOpExtensionManifest } from '../examples/NoOpExtension';
import { ExtensionState } from '../types';

describe('ExtensionRegistry', () => {
  const tenantId = 'tenant-123';

  beforeEach(async () => {
    // Reset registry
    await (extensionRegistry as any)._resetForTesting();
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

  it('should install an extension for a tenant', async () => {
    await extensionRegistry.register(NoOpExtensionManifest);
    const installation = await extensionRegistry.install(tenantId, NoOpExtensionManifest.id);

    expect(installation).toBeDefined();
    expect(installation.tenantId).toBe(tenantId);
    expect(installation.extensionId).toBe(NoOpExtensionManifest.id);
    expect(installation.state).toBe(ExtensionState.ENABLED);

    const retrieved = await extensionRegistry.getInstallation(tenantId, NoOpExtensionManifest.id);
    expect(retrieved).toEqual(installation);
  });

  it('should prevent double installation', async () => {
    await extensionRegistry.register(NoOpExtensionManifest);
    await extensionRegistry.install(tenantId, NoOpExtensionManifest.id);

    await expect(extensionRegistry.install(tenantId, NoOpExtensionManifest.id))
      .rejects.toThrow(/already installed/);
  });

  it('should fail install if extension not found', async () => {
    await expect(extensionRegistry.install(tenantId, 'non-existent'))
      .rejects.toThrow(/not found/);
  });

  it('should uninstall an extension', async () => {
    await extensionRegistry.register(NoOpExtensionManifest);
    await extensionRegistry.install(tenantId, NoOpExtensionManifest.id);

    await extensionRegistry.uninstall(tenantId, NoOpExtensionManifest.id);
    const retrieved = await extensionRegistry.getInstallation(tenantId, NoOpExtensionManifest.id);
    expect(retrieved).toBeNull();
  });

  it('should revoke an extension globally', async () => {
    await extensionRegistry.register(NoOpExtensionManifest);
    const inst1 = await extensionRegistry.install('t1', NoOpExtensionManifest.id);
    const inst2 = await extensionRegistry.install('t2', NoOpExtensionManifest.id);

    await extensionRegistry.revoke(NoOpExtensionManifest.id, 'Security vulnerability');

    const check1 = await extensionRegistry.getInstallation('t1', NoOpExtensionManifest.id);
    const check2 = await extensionRegistry.getInstallation('t2', NoOpExtensionManifest.id);

    expect(check1?.state).toBe(ExtensionState.REVOKED);
    expect(check2?.state).toBe(ExtensionState.REVOKED);

    // Should also remove from catalog so new installs fail
    const catalogEntry = await extensionRegistry.get(NoOpExtensionManifest.id);
    expect(catalogEntry).toBeNull();
  });
});
