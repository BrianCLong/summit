
import { ExtensionSandbox } from '../sandbox';
import { extensionRegistry } from '../registry';
import { extensionAuditService } from '../audit';
import { ExtensionManifest, ExtensionExecutionMode, ExtensionContext } from '../types';

describe('ExtensionSandbox', () => {
  const tenantId = 'sandbox-tenant';
  const extId = 'sandbox-ext';

  const manifest: ExtensionManifest = {
    id: extId,
    name: 'Sandbox Test',
    version: '1.0',
    description: 'Sandbox',
    executionMode: ExtensionExecutionMode.WORKFLOW_STEP,
    resources: { memoryLimitMb: 50, timeoutMs: 100, networkAccess: false },
    entryPoint: 'noop',
    permissions: ['read:graph'],
    scopes: [
      { resourceType: 'node', action: 'read', filter: { type: 'AllowedType' } }
    ]
  };

  const context: ExtensionContext = {
    tenantId,
    extensionId: extId,
    installationId: 'inst-sandbox',
    permissions: ['read:graph']
  };

  beforeEach(async () => {
    await (extensionRegistry as any)._resetForTesting();
    (extensionAuditService as any)._clear();
    await extensionRegistry.register(manifest);
    await extensionRegistry.install(tenantId, extId);
  });

  it('should execute valid code', async () => {
    const sandbox = new ExtensionSandbox(context);
    const result = await sandbox.executeSafe('1 + 1');
    expect(result).toBe(2);

    const logs = await extensionAuditService.getLogs(tenantId);
    expect(logs).toHaveLength(2); // start, finish
    expect(logs[1].status).toBe('success');
  });

  it('should timeout on infinite loop', async () => {
    const sandbox = new ExtensionSandbox(context);
    // While true loop
    const code = 'while(true) {}';

    await expect(sandbox.executeSafe(code, 100)).rejects.toThrow(/timed out/);

    const logs = await extensionAuditService.getLogs(tenantId);
    const failureLog = logs.find(l => l.status === 'failure');
    expect(failureLog).toBeDefined();
  });

  it('should allow API access if permitted', async () => {
    const sandbox = new ExtensionSandbox(context);
    // We can't easily test async API call from sync script in `vm` without promises handling inside VM.
    // However, `vm` supports returning Promises.
    // But `executeSafe` awaits the script result.
    // Let's try to call the API. The API exposed is `api`.

    const code = `api.getData('AllowedType')`;
    const result = await sandbox.executeSafe(code);
    const resolved = await result; // Result is a promise from the API
    expect(resolved).toEqual({ status: 'ok', data: [] });

    const logs = await extensionAuditService.getLogs(tenantId);
    const accessLog = logs.find(l => l.action === 'api_access' && l.status === 'success');
    expect(accessLog).toBeDefined();
  });

  it('should deny API access if scope mismatch', async () => {
    const sandbox = new ExtensionSandbox(context);
    const code = `api.getData('ForbiddenType')`;

    const resultPromise = sandbox.executeSafe(code);
    // The script execution itself might succeed in returning a Rejected Promise, or throw.
    // Since `api.getData` throws, the script promise rejects.

    await expect(async () => {
        const res = await resultPromise;
        await res;
    }).rejects.toThrow(/Access denied/);

    const logs = await extensionAuditService.getLogs(tenantId);
    const deniedLog = logs.find(l => l.action === 'api_access' && l.status === 'denied');
    expect(deniedLog).toBeDefined();
  });
});
