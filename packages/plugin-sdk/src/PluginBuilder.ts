import {
  Plugin,
  PluginManifest,
  PluginContext,
  PluginPermission,
} from '@summit/plugin-system';

/**
 * Builder class for creating plugins with fluent API
 */
export class PluginBuilder {
  private manifest: Partial<PluginManifest> = {
    permissions: [],
    extensionPoints: [],
    webhooks: [],
    apiEndpoints: [],
  };
  private initHandler?: (context: PluginContext) => Promise<void>;
  private startHandler?: () => Promise<void>;
  private stopHandler?: () => Promise<void>;
  private destroyHandler?: () => Promise<void>;
  private healthCheckHandler?: () => Promise<any>;

  /**
   * Set plugin metadata
   */
  withMetadata(metadata: {
    id: string;
    name: string;
    version: string;
    description: string;
    author: {
      name: string;
      email?: string;
      url?: string;
    };
    license: string;
    category: PluginManifest['category'];
  }): this {
    Object.assign(this.manifest, metadata);
    return this;
  }

  /**
   * Set main entry point
   */
  withMain(main: string): this {
    this.manifest.main = main;
    return this;
  }

  /**
   * Add required platform version
   */
  requiresEngine(version: string): this {
    this.manifest.engineVersion = version;
    return this;
  }

  /**
   * Add permission
   */
  requestPermission(permission: PluginPermission): this {
    if (!this.manifest.permissions) {
      this.manifest.permissions = [];
    }
    if (!this.manifest.permissions.includes(permission)) {
      this.manifest.permissions.push(permission);
    }
    return this;
  }

  /**
   * Add multiple permissions
   */
  requestPermissions(...permissions: PluginPermission[]): this {
    permissions.forEach(p => this.requestPermission(p));
    return this;
  }

  /**
   * Set resource limits
   */
  withResources(resources: {
    maxMemoryMB?: number;
    maxCpuPercent?: number;
    maxStorageMB?: number;
    maxNetworkMbps?: number;
  }): this {
    this.manifest.resources = {
      maxMemoryMB: resources.maxMemoryMB || 256,
      maxCpuPercent: resources.maxCpuPercent || 50,
      maxStorageMB: resources.maxStorageMB || 100,
      maxNetworkMbps: resources.maxNetworkMbps || 10,
    };
    return this;
  }

  /**
   * Add extension point
   */
  providesExtensionPoint(extensionPoint: {
    id: string;
    type: string;
    config?: Record<string, any>;
  }): this {
    if (!this.manifest.extensionPoints) {
      this.manifest.extensionPoints = [];
    }
    this.manifest.extensionPoints.push(extensionPoint);
    return this;
  }

  /**
   * Add webhook handler
   */
  onWebhook(event: string, handler: string): this {
    if (!this.manifest.webhooks) {
      this.manifest.webhooks = [];
    }
    this.manifest.webhooks.push({ event, handler });
    return this;
  }

  /**
   * Add API endpoint
   */
  addEndpoint(endpoint: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    handler: string;
  }): this {
    if (!this.manifest.apiEndpoints) {
      this.manifest.apiEndpoints = [];
    }
    this.manifest.apiEndpoints.push(endpoint);
    return this;
  }

  /**
   * Set initialization handler
   */
  onInitialize(handler: (context: PluginContext) => Promise<void>): this {
    this.initHandler = handler;
    return this;
  }

  /**
   * Set start handler
   */
  onStart(handler: () => Promise<void>): this {
    this.startHandler = handler;
    return this;
  }

  /**
   * Set stop handler
   */
  onStop(handler: () => Promise<void>): this {
    this.stopHandler = handler;
    return this;
  }

  /**
   * Set destroy handler
   */
  onDestroy(handler: () => Promise<void>): this {
    this.destroyHandler = handler;
    return this;
  }

  /**
   * Set health check handler
   */
  withHealthCheck(handler: () => Promise<any>): this {
    this.healthCheckHandler = handler;
    return this;
  }

  /**
   * Build the plugin
   */
  build(): Plugin {
    // Validate required fields
    if (!this.manifest.id) throw new Error('Plugin ID is required');
    if (!this.manifest.name) throw new Error('Plugin name is required');
    if (!this.manifest.version) throw new Error('Plugin version is required');
    if (!this.manifest.description) throw new Error('Plugin description is required');
    if (!this.manifest.author) throw new Error('Plugin author is required');
    if (!this.manifest.license) throw new Error('Plugin license is required');
    if (!this.manifest.category) throw new Error('Plugin category is required');
    if (!this.manifest.main) throw new Error('Plugin main entry point is required');
    if (!this.manifest.engineVersion) throw new Error('Engine version is required');

    const manifest = this.manifest as PluginManifest;

    return {
      manifest,
      initialize: this.initHandler || (async () => {}),
      start: this.startHandler || (async () => {}),
      stop: this.stopHandler || (async () => {}),
      destroy: this.destroyHandler || (async () => {}),
      healthCheck: this.healthCheckHandler,
    };
  }
}

/**
 * Create a new plugin builder
 */
export function createPlugin(): PluginBuilder {
  return new PluginBuilder();
}
