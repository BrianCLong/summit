
import { ExtensionContext } from './types';
import vm from 'vm';

export class ExtensionSandbox {
  constructor(private context: ExtensionContext) {}

  public async executeSafe(code: string, timeoutMs = 5000) {
    const sandbox = {
      console: {
        log: (...args: any[]) => console.log(`[Ext ${this.context.extensionId}]`, ...args),
        error: (...args: any[]) => console.error(`[Ext ${this.context.extensionId}]`, ...args),
      },
      // Expose limited API based on permissions
      api: this.createApiSurface(),
    };

    const context = vm.createContext(sandbox);

    // Create script
    const script = new vm.Script(code);

    try {
      // runInContext with timeout
      return script.runInContext(context, {
        timeout: timeoutMs,
        displayErrors: true,
      });
    } catch (error) {
      throw new Error(`Extension execution failed: ${error}`);
    }
  }

  private createApiSurface() {
    // Return safe API wrappers
    // In a real implementation, this would map to internal services based on context.permissions
    return {
        // Placeholder API
        getData: () => ({ status: 'ok' })
    };
  }
}
