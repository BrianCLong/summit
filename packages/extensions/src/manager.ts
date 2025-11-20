/**
 * Extension Manager
 *
 * High-level API for managing the entire extension system.
 */

import { ExtensionLoader, LoaderOptions } from './loader.js';
import { ExtensionRegistry } from './registry.js';
import { PolicyEnforcer } from './policy/enforcer.js';
import { CopilotIntegration } from './integrations/copilot.js';
import { CommandPaletteIntegration } from './integrations/command-palette.js';
import { CLIIntegration } from './integrations/cli.js';
import { ExtensionAPI } from './types.js';

export interface ExtensionManagerOptions {
  extensionDirs: string[];
  configPath?: string;
  storagePath?: string;
  api?: Partial<ExtensionAPI>;
  opaUrl?: string;
  enablePolicy?: boolean;
  autoLoad?: boolean;
}

/**
 * Central manager for the extension system
 */
export class ExtensionManager {
  private loader: ExtensionLoader;
  private registry: ExtensionRegistry;
  private policyEnforcer?: PolicyEnforcer;

  public readonly copilot: CopilotIntegration;
  public readonly commandPalette: CommandPaletteIntegration;
  public readonly cli: CLIIntegration;

  private initialized = false;

  constructor(options: ExtensionManagerOptions) {
    // Initialize policy enforcer if enabled
    if (options.enablePolicy !== false) {
      this.policyEnforcer = new PolicyEnforcer(options.opaUrl);
    }

    // Initialize loader
    const loaderOptions: LoaderOptions = {
      extensionDirs: options.extensionDirs,
      configPath: options.configPath,
      storagePath: options.storagePath,
      api: options.api,
      policyEnforcer: this.policyEnforcer,
      autoLoad: options.autoLoad,
    };

    this.loader = new ExtensionLoader(loaderOptions);
    this.registry = this.loader.getRegistry();

    // Initialize integrations
    this.copilot = new CopilotIntegration(this.registry);
    this.commandPalette = new CommandPaletteIntegration(this.registry);
    this.cli = new CLIIntegration(this.registry);
  }

  /**
   * Initialize the extension system (discover and load extensions)
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('Extension manager already initialized');
      return;
    }

    console.info('Initializing extension system...');

    // Discover extensions
    await this.loader.discover();

    // Load extensions
    await this.loader.loadAll();

    // Register integrations
    await this.copilot.registerAll();
    await this.commandPalette.registerAll();
    await this.cli.registerAll();

    this.initialized = true;

    const stats = this.registry.getStats();
    console.info(
      `Extension system initialized: ${stats.loaded}/${stats.total} extensions loaded`
    );
  }

  /**
   * Reload all extensions
   */
  async reload(): Promise<void> {
    console.info('Reloading extension system...');

    // Clear integrations
    this.copilot.clear();
    this.commandPalette.clear();
    this.cli.clear();

    // Reload extensions
    await this.loader.reload();

    // Re-register integrations
    await this.copilot.registerAll();
    await this.commandPalette.registerAll();
    await this.cli.registerAll();

    console.info('Extension system reloaded');
  }

  /**
   * Shutdown the extension system
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    console.info('Shutting down extension system...');

    // Unload all extensions
    await this.loader.unloadAll();

    // Clear integrations
    this.copilot.clear();
    this.commandPalette.clear();
    this.cli.clear();

    this.initialized = false;
    console.info('Extension system shut down');
  }

  /**
   * Get the extension registry
   */
  getRegistry(): ExtensionRegistry {
    return this.registry;
  }

  /**
   * Check if the extension system is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get extension statistics
   */
  getStats() {
    return {
      ...this.registry.getStats(),
      copilot: {
        tools: this.copilot.getTools().length,
        skills: this.copilot.getSkills().length,
      },
      ui: {
        commands: this.commandPalette.getCommands().length,
        widgets: this.commandPalette.getWidgets().length,
      },
      cli: {
        commands: this.cli.getCommands().length,
      },
    };
  }

  /**
   * Load OPA policy for extension permissions
   */
  async loadPolicy(policyRego: string): Promise<void> {
    if (!this.policyEnforcer) {
      throw new Error('Policy enforcement is not enabled');
    }
    await this.policyEnforcer.loadPolicy(policyRego);
  }
}
