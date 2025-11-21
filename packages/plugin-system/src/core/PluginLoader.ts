import { Plugin, PluginManifest } from '../types/plugin.js';
import { PluginSandbox } from './PluginSandbox.js';

/**
 * Plugin loader with sandboxing and isolation
 */
export class DefaultPluginLoader {
  private loadedPlugins = new Map<string, LoadedPlugin>();
  private pluginPaths = new Map<string, string>();
  private sandbox: PluginSandbox;

  constructor(sandbox: PluginSandbox) {
    this.sandbox = sandbox;
  }

  /**
   * Register a plugin path
   */
  registerPath(pluginId: string, path: string): void {
    this.pluginPaths.set(pluginId, path);
  }

  /**
   * Load a plugin
   */
  async load(pluginId: string, version?: string): Promise<Plugin> {
    const key = version ? `${pluginId}@${version}` : pluginId;

    // Check if already loaded
    if (this.loadedPlugins.has(key)) {
      return this.loadedPlugins.get(key)!.plugin;
    }

    // Get plugin path
    const path = this.pluginPaths.get(pluginId);
    if (!path) {
      throw new Error(`Plugin path not registered for ${pluginId}`);
    }

    // Load manifest
    const manifest = await this.loadManifest(path);

    // Validate version if specified
    if (version && manifest.version !== version) {
      throw new Error(
        `Version mismatch: requested ${version}, found ${manifest.version}`
      );
    }

    // Load plugin code in sandbox
    const plugin = await this.sandbox.loadPlugin(path, manifest);

    // Cache loaded plugin
    this.loadedPlugins.set(key, {
      plugin,
      manifest,
      path,
      loadedAt: new Date(),
    });

    return plugin;
  }

  /**
   * Unload a plugin
   */
  async unload(pluginId: string): Promise<void> {
    const loaded = this.loadedPlugins.get(pluginId);
    if (!loaded) {
      return;
    }

    // Cleanup sandbox
    await this.sandbox.unloadPlugin(pluginId);

    this.loadedPlugins.delete(pluginId);
  }

  /**
   * Reload a plugin (for hot-reloading)
   */
  async reload(pluginId: string): Promise<void> {
    const loaded = this.loadedPlugins.get(pluginId);
    if (!loaded) {
      throw new Error(`Plugin ${pluginId} is not loaded`);
    }

    // Unload current version
    await this.unload(pluginId);

    // Clear require cache for the plugin (Node.js specific)
    this.clearRequireCache(loaded.path);

    // Will be reloaded on next load() call
  }

  /**
   * Check if plugin is loaded
   */
  isLoaded(pluginId: string): boolean {
    return this.loadedPlugins.has(pluginId);
  }

  /**
   * Get all loaded plugins
   */
  getLoadedPlugins(): Map<string, Plugin> {
    const result = new Map<string, Plugin>();
    for (const [key, loaded] of this.loadedPlugins.entries()) {
      result.set(key, loaded.plugin);
    }
    return result;
  }

  /**
   * Load plugin manifest
   */
  private async loadManifest(pluginPath: string): Promise<PluginManifest> {
    try {
      const manifestPath = `${pluginPath}/plugin.json`;
      const { default: manifest } = await import(manifestPath);
      return manifest;
    } catch (error) {
      throw new Error(
        `Failed to load plugin manifest from ${pluginPath}: ${error}`
      );
    }
  }

  /**
   * Clear Node.js require cache for a module
   */
  private clearRequireCache(pluginPath: string): void {
    // Find all cached modules from this plugin
    const cacheKeys = Object.keys(require.cache).filter(key =>
      key.startsWith(pluginPath)
    );

    // Delete from cache
    for (const key of cacheKeys) {
      delete require.cache[key];
    }
  }
}

interface LoadedPlugin {
  plugin: Plugin;
  manifest: PluginManifest;
  path: string;
  loadedAt: Date;
}
