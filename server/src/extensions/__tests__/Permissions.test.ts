import { permissionEnforcer } from '../permissions';
import { extensionRegistry } from '../registry';
import { ExtensionManifest, ExtensionExecutionMode, ExtensionState, ExtensionContext } from '../types';

describe('PermissionEnforcer', () => {
  const tenantId = 'tenant-perm';
  const extId = 'test-ext-perm';

  const manifest: ExtensionManifest = {
    id: extId,
    name: 'Perm Test Ext',
    version: '1.0',
    description: 'Test',
    executionMode: ExtensionExecutionMode.READ_ONLY_QUERY,
    resources: { memoryLimitMb: 10, timeoutMs: 100, networkAccess: false },
    entryPoint: 'noop',
    permissions: ['read:graph'],
    scopes: [
      { resourceType: 'node', action: 'read', filter: { type: 'Person' } },
      { resourceType: 'node', action: 'create' } // Can create any node
    ]
  };

  const context: ExtensionContext = {
    tenantId,
    extensionId: extId,
    installationId: 'inst-1',
    permissions: ['read:graph']
  };

  beforeEach(async () => {
    await (extensionRegistry as any)._resetForTesting();
    await extensionRegistry.register(manifest);
  });

  it('should deny if not installed', async () => {
    const result = await permissionEnforcer.checkPermission(context, 'read:graph');
    expect(result).toBe(false);
  });

  it('should allow if installed and permission granted', async () => {
    await extensionRegistry.install(tenantId, extId);
    const result = await permissionEnforcer.checkPermission(context, 'read:graph');
    expect(result).toBe(true);
  });

  it('should deny if permission not granted in manifest/install', async () => {
    await extensionRegistry.install(tenantId, extId);
    const result = await permissionEnforcer.checkPermission(context, 'write:graph');
    expect(result).toBe(false);
  });

  it('should deny if extension is revoked', async () => {
    await extensionRegistry.install(tenantId, extId);
    await extensionRegistry.revoke(extId, 'Bad extension');
    const result = await permissionEnforcer.checkPermission(context, 'read:graph');
    expect(result).toBe(false);
  });

  it('should check scope access correctly', async () => {
    await extensionRegistry.install(tenantId, extId);

    // Allowed scope
    const allowedRead = await permissionEnforcer.checkScopeAccess(context, 'node', 'read', { type: 'Person' });
    expect(allowedRead).toBe(true);

    // Denied scope (filter mismatch)
    const deniedRead = await permissionEnforcer.checkScopeAccess(context, 'node', 'read', { type: 'Organization' });
    expect(deniedRead).toBe(false);

    // Allowed create (no filter)
    const allowedCreate = await permissionEnforcer.checkScopeAccess(context, 'node', 'create', { type: 'Organization' });
    expect(allowedCreate).toBe(true);

    // Denied action
    const deniedDelete = await permissionEnforcer.checkScopeAccess(context, 'node', 'delete');
    expect(deniedDelete).toBe(false);
  });
});
