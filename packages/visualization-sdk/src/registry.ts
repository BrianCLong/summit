import type { VisualizationRegistration, PluginMetadata, PluginLifecycle } from './types';

/**
 * Global visualization plugin registry
 */
class VisualizationRegistry {
  private plugins: Map<string, VisualizationRegistration> = new Map();
  private lifecycles: Map<string, PluginLifecycle> = new Map();

  /**
   * Register a new visualization plugin
   */
  register<TData = unknown, TConfig = unknown>(
    registration: VisualizationRegistration<TData, TConfig>,
    lifecycle?: PluginLifecycle
  ): void {
    const { metadata } = registration;

    if (this.plugins.has(metadata.id)) {
      console.warn(`Plugin "${metadata.id}" is already registered. Overwriting.`);
    }

    this.plugins.set(metadata.id, registration as VisualizationRegistration);

    if (lifecycle) {
      this.lifecycles.set(metadata.id, lifecycle);
      lifecycle.onRegister?.();
    }

    console.log(`Registered visualization plugin: ${metadata.name} (${metadata.id})`);
  }

  /**
   * Unregister a plugin
   */
  unregister(pluginId: string): boolean {
    const lifecycle = this.lifecycles.get(pluginId);
    if (lifecycle?.onUnregister) {
      lifecycle.onUnregister();
    }

    this.lifecycles.delete(pluginId);
    return this.plugins.delete(pluginId);
  }

  /**
   * Get a registered plugin
   */
  get<TData = unknown, TConfig = unknown>(
    pluginId: string
  ): VisualizationRegistration<TData, TConfig> | undefined {
    return this.plugins.get(pluginId) as VisualizationRegistration<TData, TConfig> | undefined;
  }

  /**
   * Get all registered plugins
   */
  getAll(): VisualizationRegistration[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugins by category
   */
  getByCategory(category: PluginMetadata['category']): VisualizationRegistration[] {
    return this.getAll().filter(p => p.metadata.category === category);
  }

  /**
   * Get plugins by tag
   */
  getByTag(tag: string): VisualizationRegistration[] {
    return this.getAll().filter(p => p.metadata.tags.includes(tag));
  }

  /**
   * Search plugins by name or description
   */
  search(query: string): VisualizationRegistration[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(p =>
      p.metadata.name.toLowerCase().includes(lowerQuery) ||
      p.metadata.description?.toLowerCase().includes(lowerQuery) ||
      p.metadata.tags.some(t => t.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Check if a plugin is registered
   */
  has(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Get plugin count
   */
  get size(): number {
    return this.plugins.size;
  }

  /**
   * Clear all plugins
   */
  clear(): void {
    this.lifecycles.forEach(lifecycle => lifecycle.onUnregister?.());
    this.plugins.clear();
    this.lifecycles.clear();
  }
}

// Global singleton registry
export const visualizationRegistry = new VisualizationRegistry();

/**
 * Helper function to create a plugin registration
 */
export function createVisualization<TData, TConfig>(
  registration: VisualizationRegistration<TData, TConfig>,
  lifecycle?: PluginLifecycle
): VisualizationRegistration<TData, TConfig> {
  visualizationRegistry.register(registration, lifecycle);
  return registration;
}

/**
 * Decorator for registering visualizations
 */
export function registerVisualization(
  metadata: PluginMetadata,
  options?: {
    dataSchema?: any;
    configSchema?: any;
    defaultConfig?: any;
    lifecycle?: PluginLifecycle;
  }
) {
  return function (Component: React.ComponentType<any>) {
    visualizationRegistry.register(
      {
        metadata,
        component: Component,
        dataSchema: options?.dataSchema,
        configSchema: options?.configSchema,
        defaultConfig: options?.defaultConfig,
      },
      options?.lifecycle
    );
    return Component;
  };
}
