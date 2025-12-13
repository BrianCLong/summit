/**
 * Plugin System for Admin CLI
 * Enables extensibility through custom commands and hooks
 */

import { Command } from 'commander';
import { resolve, join } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { logger } from '../utils/logger.js';
import type { CommandContext } from '../types/index.js';

/**
 * Plugin interface
 */
export interface AdminCLIPlugin {
  /** Plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Plugin description */
  description: string;
  /** Author */
  author?: string;

  /**
   * Initialize the plugin
   * Called once when plugin is loaded
   */
  init?: (context: PluginContext) => Promise<void>;

  /**
   * Register new commands
   * @param program - Commander program instance
   */
  commands?: (program: Command) => void;

  /**
   * Hook implementations
   */
  hooks?: PluginHooks;
}

/**
 * Plugin hooks
 */
export interface PluginHooks {
  /** Called before command execution */
  preCommand?: (context: CommandContext) => Promise<void>;

  /** Called after successful command execution */
  postCommand?: (context: CommandContext, result: unknown) => Promise<void>;

  /** Called when command fails */
  onError?: (context: CommandContext, error: Error) => Promise<void>;

  /** Called before output formatting */
  onOutput?: (data: unknown, format: string) => Promise<unknown>;

  /** Called before audit logging */
  onAudit?: (event: AuditEvent) => Promise<AuditEvent>;
}

/**
 * Plugin context provided during initialization
 */
export interface PluginContext {
  /** CLI version */
  cliVersion: string;
  /** Configuration directory */
  configDir: string;
  /** Logger instance */
  logger: typeof logger;
}

/**
 * Audit event for plugins
 */
export interface AuditEvent {
  action: string;
  command: string;
  args: string[];
  options: Record<string, unknown>;
  userId: string;
  result: 'success' | 'failure' | 'cancelled';
  errorMessage?: string;
  durationMs?: number;
}

/**
 * Plugin registry
 */
class PluginRegistry {
  private plugins: Map<string, AdminCLIPlugin> = new Map();
  private hooks: {
    preCommand: Array<NonNullable<PluginHooks['preCommand']>>;
    postCommand: Array<NonNullable<PluginHooks['postCommand']>>;
    onError: Array<NonNullable<PluginHooks['onError']>>;
    onOutput: Array<NonNullable<PluginHooks['onOutput']>>;
    onAudit: Array<NonNullable<PluginHooks['onAudit']>>;
  } = {
    preCommand: [],
    postCommand: [],
    onError: [],
    onOutput: [],
    onAudit: [],
  };

  /**
   * Register a plugin
   */
  register(plugin: AdminCLIPlugin): void {
    if (this.plugins.has(plugin.name)) {
      logger.warn(`Plugin "${plugin.name}" is already registered, skipping`);
      return;
    }

    this.plugins.set(plugin.name, plugin);

    // Register hooks
    if (plugin.hooks) {
      if (plugin.hooks.preCommand) {
        this.hooks.preCommand.push(plugin.hooks.preCommand);
      }
      if (plugin.hooks.postCommand) {
        this.hooks.postCommand.push(plugin.hooks.postCommand);
      }
      if (plugin.hooks.onError) {
        this.hooks.onError.push(plugin.hooks.onError);
      }
      if (plugin.hooks.onOutput) {
        this.hooks.onOutput.push(plugin.hooks.onOutput);
      }
      if (plugin.hooks.onAudit) {
        this.hooks.onAudit.push(plugin.hooks.onAudit);
      }
    }

    logger.verbose(`Plugin registered: ${plugin.name} v${plugin.version}`);
  }

  /**
   * Unregister a plugin
   */
  unregister(name: string): boolean {
    return this.plugins.delete(name);
  }

  /**
   * Get all registered plugins
   */
  getAll(): AdminCLIPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugin by name
   */
  get(name: string): AdminCLIPlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Execute pre-command hooks
   */
  async executePreCommand(context: CommandContext): Promise<void> {
    for (const hook of this.hooks.preCommand) {
      await hook(context);
    }
  }

  /**
   * Execute post-command hooks
   */
  async executePostCommand(context: CommandContext, result: unknown): Promise<void> {
    for (const hook of this.hooks.postCommand) {
      await hook(context, result);
    }
  }

  /**
   * Execute error hooks
   */
  async executeOnError(context: CommandContext, error: Error): Promise<void> {
    for (const hook of this.hooks.onError) {
      await hook(context, error);
    }
  }

  /**
   * Execute output hooks
   */
  async executeOnOutput(data: unknown, format: string): Promise<unknown> {
    let result = data;
    for (const hook of this.hooks.onOutput) {
      result = await hook(result, format);
    }
    return result;
  }

  /**
   * Execute audit hooks
   */
  async executeOnAudit(event: AuditEvent): Promise<AuditEvent> {
    let result = event;
    for (const hook of this.hooks.onAudit) {
      result = await hook(result);
    }
    return result;
  }

  /**
   * Register commands from all plugins
   */
  registerCommands(program: Command): void {
    for (const plugin of this.plugins.values()) {
      if (plugin.commands) {
        try {
          plugin.commands(program);
          logger.verbose(`Commands registered from plugin: ${plugin.name}`);
        } catch (err) {
          logger.error(`Failed to register commands from plugin ${plugin.name}`, {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
  }
}

/**
 * Global plugin registry
 */
export const pluginRegistry = new PluginRegistry();

/**
 * Load plugins from directory
 */
export async function loadPlugins(pluginDir: string, context: PluginContext): Promise<void> {
  if (!existsSync(pluginDir)) {
    logger.verbose(`Plugin directory does not exist: ${pluginDir}`);
    return;
  }

  const entries = readdirSync(pluginDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const pluginPath = join(pluginDir, entry.name);
    const packagePath = join(pluginPath, 'package.json');

    if (!existsSync(packagePath)) {
      logger.verbose(`No package.json in ${pluginPath}, skipping`);
      continue;
    }

    try {
      // Load plugin
      const mainPath = join(pluginPath, 'dist', 'index.js');
      if (!existsSync(mainPath)) {
        logger.warn(`Plugin ${entry.name} has no dist/index.js, skipping`);
        continue;
      }

      const pluginModule = await import(pathToFileURL(mainPath).href);
      const plugin: AdminCLIPlugin = pluginModule.default ?? pluginModule;

      // Validate plugin
      if (!plugin.name || !plugin.version) {
        logger.warn(`Plugin in ${pluginPath} is missing name or version, skipping`);
        continue;
      }

      // Initialize plugin
      if (plugin.init) {
        await plugin.init(context);
      }

      // Register plugin
      pluginRegistry.register(plugin);
    } catch (err) {
      logger.error(`Failed to load plugin from ${pluginPath}`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

/**
 * Get default plugin directories
 */
export function getPluginDirectories(): string[] {
  const homeDir = process.env.HOME ?? process.env.USERPROFILE ?? '';

  return [
    // User plugins
    join(homeDir, '.config', 'summit-admin-cli', 'plugins'),
    // System plugins (for enterprise deployments)
    '/usr/share/summit-admin-cli/plugins',
    // Local plugins (for development)
    join(process.cwd(), '.summit-plugins'),
  ].filter(Boolean);
}

/**
 * Create plugin context
 */
export function createPluginContext(): PluginContext {
  const homeDir = process.env.HOME ?? process.env.USERPROFILE ?? '';

  return {
    cliVersion: '1.0.0',
    configDir: join(homeDir, '.config', 'summit-admin-cli'),
    logger,
  };
}
