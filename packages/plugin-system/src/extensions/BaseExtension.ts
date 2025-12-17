import {
  Plugin,
  PluginManifest,
  PluginContext,
  PluginHealthStatus,
} from '../types/plugin.js';

/**
 * Base class for all plugin extensions
 */
export abstract class BaseExtension implements Plugin {
  public manifest: PluginManifest;
  protected context!: PluginContext;
  protected initialized = false;
  protected running = false;

  constructor(manifest: PluginManifest) {
    this.manifest = manifest;
  }

  async initialize(context: PluginContext): Promise<void> {
    if (this.initialized) {
      throw new Error(`Plugin ${this.manifest.id} is already initialized`);
    }

    this.context = context;
    await this.onInitialize(context);
    this.initialized = true;

    this.context.logger.info(`Plugin ${this.manifest.id} initialized`);
  }

  async start(): Promise<void> {
    if (!this.initialized) {
      throw new Error(`Plugin ${this.manifest.id} must be initialized before starting`);
    }

    if (this.running) {
      throw new Error(`Plugin ${this.manifest.id} is already running`);
    }

    await this.onStart();
    this.running = true;

    this.context.logger.info(`Plugin ${this.manifest.id} started`);
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    await this.onStop();
    this.running = false;

    this.context.logger.info(`Plugin ${this.manifest.id} stopped`);
  }

  async destroy(): Promise<void> {
    if (this.running) {
      await this.stop();
    }

    await this.onDestroy();
    this.initialized = false;

    this.context.logger.info(`Plugin ${this.manifest.id} destroyed`);
  }

  async healthCheck(): Promise<PluginHealthStatus> {
    try {
      const customHealth = await this.onHealthCheck();

      return {
        healthy: this.initialized && this.running && customHealth.healthy,
        message: customHealth.message,
        details: {
          initialized: this.initialized,
          running: this.running,
          ...customHealth.details,
        },
      };
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Health check failed',
      };
    }
  }

  /**
   * Hook: Called during initialization
   */
  protected abstract onInitialize(context: PluginContext): Promise<void>;

  /**
   * Hook: Called when plugin starts
   */
  protected abstract onStart(): Promise<void>;

  /**
   * Hook: Called when plugin stops
   */
  protected abstract onStop(): Promise<void>;

  /**
   * Hook: Called during cleanup
   */
  protected abstract onDestroy(): Promise<void>;

  /**
   * Hook: Custom health check logic
   */
  protected async onHealthCheck(): Promise<PluginHealthStatus> {
    return { healthy: true };
  }

  /**
   * Helper: Log with context
   */
  protected log = {
    debug: (message: string, meta?: Record<string, any>) =>
      this.context.logger.debug(message, meta),
    info: (message: string, meta?: Record<string, any>) =>
      this.context.logger.info(message, meta),
    warn: (message: string, meta?: Record<string, any>) =>
      this.context.logger.warn(message, meta),
    error: (message: string, error?: Error, meta?: Record<string, any>) =>
      this.context.logger.error(message, error, meta),
  };
}
