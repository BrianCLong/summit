import { PluginLifecycle, PluginManifest } from './types.js';

export abstract class BasePlugin implements PluginLifecycle {
  constructor(public readonly manifest: PluginManifest) {}

  /**
   * Initialize the plugin with configuration.
   * Plugins should override this to perform setup.
   */
  async init(config: any): Promise<void> {
    // Default implementation: no-op
  }

  /**
   * Check the health of the plugin.
   * Plugins should override this to provide detailed status.
   */
  async health(): Promise<{ status: 'ok' | 'degraded' | 'down'; details?: any }> {
    return { status: 'ok' };
  }

  /**
   * Gracefully shutdown the plugin.
   * Plugins should override this to cleanup resources.
   */
  async shutdown(): Promise<void> {
    // Default implementation: no-op
  }
}
