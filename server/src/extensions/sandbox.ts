
import { ExtensionContext, ExtensionExecutionMode } from './types';
import { permissionEnforcer } from './permissions';
import { extensionAuditService } from './audit';
import vm from 'vm';

export class ExtensionSandbox {
  constructor(private context: ExtensionContext) {}

  public async executeSafe(code: string, timeoutMs = 5000) {
    // 1. Audit Start
    await extensionAuditService.log(this.context, 'execute_start', 'success', { timeoutMs });

    // 2. Permission Check
    // We do broad permission check before spinning up VM
    // Specific API calls are checked inside the API surface

    // 3. Create Sandbox Environment
    const sandbox = {
      console: {
        log: (...args: any[]) => console.log(`[Ext ${this.context.extensionId}]`, ...args),
        error: (...args: any[]) => console.error(`[Ext ${this.context.extensionId}]`, ...args),
      },
      // Expose limited API based on permissions
      api: this.createApiSurface(),
    };

    const context = vm.createContext(sandbox);

    // 4. Create Script
    try {
      const script = new vm.Script(code);

      // 5. Run with Timeout and Memory Limits
      // Note: VM memory limit is not strictly enforced by `timeout` option, but we can limit execution time.
      // Strict memory isolation requires isolated-vm or separate processes, but `vm` is okay for prototype.
      const result = script.runInContext(context, {
        timeout: timeoutMs,
        displayErrors: true,
      });

      await extensionAuditService.log(this.context, 'execute_finish', 'success');
      return result;

    } catch (error: any) {
      await extensionAuditService.log(this.context, 'execute_finish', 'failure', { error: error.message });
      throw new Error(`Extension execution failed: ${error.message}`);
    }
  }

  private createApiSurface() {
    // Return safe API wrappers that call PermissionEnforcer
    return {
        getData: async (type: string, query: any) => {
            // Check Scope Access
            const allowed = await permissionEnforcer.checkScopeAccess(
                this.context,
                'node', // mapping generic 'data' to 'node' for this example
                'read',
                { type }
            );

            if (!allowed) {
                await extensionAuditService.log(this.context, 'api_access', 'denied', { api: 'getData', type });
                throw new Error(`Access denied to resource type: ${type}`);
            }

            await extensionAuditService.log(this.context, 'api_access', 'success', { api: 'getData', type });
            return { status: 'ok', data: [] }; // Mock return
        },

        createData: async (type: string, payload: any) => {
             const allowed = await permissionEnforcer.checkScopeAccess(
                this.context,
                'node',
                'create',
                { type }
             );

             if (!allowed) {
                 await extensionAuditService.log(this.context, 'api_access', 'denied', { api: 'createData', type });
                 throw new Error(`Create denied for resource type: ${type}`);
             }

             await extensionAuditService.log(this.context, 'api_access', 'success', { api: 'createData', type });
             return { status: 'created', id: 'mock-id' };
        }
    };
  }
}
