import EventEmitter from "eventemitter3";
import semver from "semver";
import {
  Plugin,
  PluginState,
  PluginManifest,
  PluginContext,
  PluginLoader,
  PluginRegistry,
  PluginMetadata,
  DependencyResolver,
} from "../types/plugin.js";
import { PluginManifestSchema } from "../manifest/schema.js";
import { PluginManifestValidationError } from "../errors/PluginManifestValidationError.js";
import { verifySignature } from "../security/verifySignature.js";

/**
 * Central plugin manager implementing microkernel pattern
 */
export class PluginManager extends EventEmitter {
  private plugins = new Map<string, PluginInstance>();
  private loader: PluginLoader;
  private registry: PluginRegistry;
  private dependencyResolver: DependencyResolver;
  private platformVersion: string;

  constructor(
    loader: PluginLoader,
    registry: PluginRegistry,
    dependencyResolver: DependencyResolver,
    platformVersion: string
  ) {
    super();
    this.loader = loader;
    this.registry = registry;
    this.dependencyResolver = dependencyResolver;
    this.platformVersion = platformVersion;
  }

  /**
   * Install a plugin
   */
  async install(manifest: PluginManifest, _source: PluginSource): Promise<void> {
    const verificationEnabled = this.shouldVerify();
    const manifestToInstall = verificationEnabled ? this.validateManifest(manifest) : manifest;
    const { id, version } = manifestToInstall;

    // Check if already installed
    if (this.plugins.has(id)) {
      throw new Error(`Plugin ${id} is already installed`);
    }

    if (verificationEnabled) {
      await verifySignature({
        manifest: manifestToInstall,
        signature: manifestToInstall.signature?.signature,
        publicKey: manifestToInstall.signature?.publicKey,
        algorithm: manifestToInstall.signature?.algorithm,
      });
    }

    // Check platform compatibility
    if (!semver.satisfies(this.platformVersion, manifestToInstall.engineVersion)) {
      throw new Error(
        `Plugin ${id} requires platform version ${manifestToInstall.engineVersion}, but current version is ${this.platformVersion}`
      );
    }

    // Resolve and check dependencies
    const compatibilityResult = await this.dependencyResolver.checkCompatibility(id, version);
    if (!compatibilityResult.compatible) {
      const errors = compatibilityResult.issues.filter((issue) => issue.severity === "error");
      throw new Error(
        `Plugin ${id} has compatibility issues:\n${errors.map((e) => e.message).join("\n")}`
      );
    }

    // Create plugin metadata
    const metadata: PluginMetadata = {
      manifest: manifestToInstall,
      state: PluginState.UNLOADED,
      installedAt: new Date(),
      updatedAt: new Date(),
      config: {},
      stats: {
        downloads: 0,
        activeInstalls: 0,
        rating: 0,
        reviews: 0,
        errorCount: 0,
        successCount: 0,
      },
    };

    // Register plugin
    await this.registry.register(metadata);

    this.emit("plugin:installed", { pluginId: id, version });
  }

  /**
   * Enable and start a plugin
   */
  async enable(pluginId: string): Promise<void> {
    const metadata = await this.registry.get(pluginId);
    if (!metadata) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (this.plugins.has(pluginId)) {
      throw new Error(`Plugin ${pluginId} is already enabled`);
    }

    // Load plugin
    await this.registry.update(pluginId, { state: PluginState.LOADING });
    const plugin = await this.loader.load(pluginId, metadata.manifest.version);

    // Create plugin context
    const context = this.createPluginContext(metadata);

    // Initialize plugin
    await this.registry.update(pluginId, { state: PluginState.INITIALIZING });
    await plugin.initialize(context);

    // Start plugin
    await plugin.start();

    // Store plugin instance
    const instance: PluginInstance = {
      plugin,
      metadata,
      context,
      startedAt: new Date(),
    };
    this.plugins.set(pluginId, instance);

    await this.registry.update(pluginId, {
      state: PluginState.ACTIVE,
      enabledAt: new Date(),
    });

    this.emit("plugin:enabled", { pluginId });
  }

  /**
   * Disable and stop a plugin
   */
  async disable(pluginId: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new Error(`Plugin ${pluginId} is not enabled`);
    }

    // Stop plugin
    await instance.plugin.stop();

    // Cleanup
    await instance.plugin.destroy();

    // Unload
    await this.loader.unload(pluginId);

    // Remove from active plugins
    this.plugins.delete(pluginId);

    await this.registry.update(pluginId, {
      state: PluginState.UNLOADED,
      disabledAt: new Date(),
    });

    this.emit("plugin:disabled", { pluginId });
  }

  /**
   * Uninstall a plugin
   */
  async uninstall(pluginId: string): Promise<void> {
    // Disable if enabled
    if (this.plugins.has(pluginId)) {
      await this.disable(pluginId);
    }

    // Unregister
    await this.registry.unregister(pluginId);

    this.emit("plugin:uninstalled", { pluginId });
  }

  /**
   * Update a plugin
   */
  async update(pluginId: string, newVersion: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    const wasEnabled = Boolean(instance);

    // Disable if enabled
    if (wasEnabled) {
      await this.disable(pluginId);
    }

    // Update version in registry (simplified - would fetch new manifest)
    await this.registry.update(pluginId, {
      updatedAt: new Date(),
    });

    // Re-enable if it was enabled
    if (wasEnabled) {
      await this.enable(pluginId);
    }

    this.emit("plugin:updated", { pluginId, version: newVersion });
  }

  /**
   * Hot reload a plugin
   */
  async reload(pluginId: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new Error(`Plugin ${pluginId} is not enabled`);
    }

    // Stop current instance
    await instance.plugin.stop();

    // Reload code
    await this.loader.reload(pluginId);

    // Load fresh instance
    const plugin = await this.loader.load(pluginId, instance.metadata.manifest.version);

    // Initialize and start
    await plugin.initialize(instance.context);
    await plugin.start();

    // Update instance
    instance.plugin = plugin;
    instance.startedAt = new Date();

    this.emit("plugin:reloaded", { pluginId });
  }

  /**
   * Get plugin instance
   */
  get(pluginId: string): PluginInstance | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * List all installed plugins
   */
  listInstalled(): Promise<PluginMetadata[]> {
    return this.registry.list();
  }

  /**
   * List all enabled plugins
   */
  listEnabled(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Check plugin health
   */
  async checkHealth(pluginId: string): Promise<any> {
    const instance = this.plugins.get(pluginId);
    if (!instance || !instance.plugin.healthCheck) {
      return { healthy: false, message: "Plugin not running or no health check" };
    }

    try {
      return await instance.plugin.healthCheck();
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : "Health check failed",
      };
    }
  }

  /**
   * Create plugin context
   */
  private createPluginContext(metadata: PluginMetadata): PluginContext {
    // This would be implemented with actual services
    return {
      pluginId: metadata.manifest.id,
      version: metadata.manifest.version,
      config: metadata.config,
      logger: this.createLogger(metadata.manifest.id),
      storage: this.createStorage(metadata.manifest.id),
      api: this.createAPI(metadata.manifest.id),
      events: this.createEventBus(metadata.manifest.id),
    };
  }

  /* eslint-disable no-console */
  private createLogger(pluginId: string): any {
    return {
      debug: (msg: string, meta?: any) => console.debug(`[${pluginId}]`, msg, meta),
      info: (msg: string, meta?: any) => console.info(`[${pluginId}]`, msg, meta),
      warn: (msg: string, meta?: any) => console.warn(`[${pluginId}]`, msg, meta),
      error: (msg: string, error?: Error, meta?: any) =>
        console.error(`[${pluginId}]`, msg, error, meta),
    };
  }
  /* eslint-enable no-console */

  private createStorage(_pluginId: string): any {
    // Simplified storage - would use actual storage service
    const store = new Map();
    return {
      get: (key: string) => Promise.resolve(store.get(key) ?? null),
      set: (key: string, value: any) => {
        store.set(key, value);
        return Promise.resolve();
      },
      delete: (key: string) => {
        store.delete(key);
        return Promise.resolve();
      },
      has: (key: string) => Promise.resolve(store.has(key)),
      keys: () => Promise.resolve(Array.from(store.keys())),
      clear: () => {
        store.clear();
        return Promise.resolve();
      },
    };
  }

  private createAPI(_pluginId: string): any {
    return {
      request: (_endpoint: string, _options?: any) => Promise.reject(new Error("Not implemented")),
      graphql: (_query: string, _variables?: any) => Promise.reject(new Error("Not implemented")),
    };
  }

  private createEventBus(_pluginId: string): any {
    const emitter = new EventEmitter();
    return {
      on: (event: string, handler: any) => emitter.on(event, handler),
      off: (event: string, handler: any) => emitter.off(event, handler),
      emit: (event: string, ...args: any[]) => {
        emitter.emit(event, ...args);
        return Promise.resolve();
      },
      once: (event: string, handler: any) => emitter.once(event, handler),
    };
  }

  private shouldVerify(): boolean {
    return String(process.env.PLUGIN_VERIFY_ENABLED).toLowerCase() === "true";
  }

  private validateManifest(manifest: PluginManifest): PluginManifest {
    const result = PluginManifestSchema.safeParse(manifest);

    if (!result.success) {
      throw new PluginManifestValidationError(result.error);
    }

    return result.data;
  }
}

interface PluginInstance {
  plugin: Plugin;
  metadata: PluginMetadata;
  context: PluginContext;
  startedAt: Date;
}

interface PluginSource {
  type: "npm" | "git" | "local" | "marketplace";
  location: string;
}
