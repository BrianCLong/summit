/**
 * Extension Loader
 *
 * Discovers and loads extensions from configured directories.
 * Optimized for performance with parallel loading and caching.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import {
  ExtensionManifest,
  ExtensionManifestSchema,
  Extension,
  ExtensionContext,
  ExtensionLogger,
  ExtensionAPI,
  ExtensionActivation,
} from './types.js';
import { ExtensionRegistry } from './registry.js';
import { PolicyEnforcer } from './policy/enforcer.js';

export interface LoaderOptions {
  extensionDirs: string[];
  configPath?: string;
  storagePath?: string;
  api?: Partial<ExtensionAPI>;
  policyEnforcer?: PolicyEnforcer;
  autoLoad?: boolean;
  /** Maximum time in ms to wait for extension activation (default: 30000) */
  activationTimeout?: number;
  /** Enable parallel loading of extensions (default: true) */
  parallelLoad?: boolean;
  /** Maximum concurrent extension loads (default: 10) */
  maxConcurrent?: number;
}

interface LoadResult {
  name: string;
  success: boolean;
  error?: string;
  duration: number;
}

export class ExtensionLoader {
  private registry: ExtensionRegistry;
  private options: Required<Omit<LoaderOptions, 'api' | 'policyEnforcer'>> & {
    api?: Partial<ExtensionAPI>;
    policyEnforcer?: PolicyEnforcer;
  };
  private activations = new Map<string, ExtensionActivation>();
  private manifestCache = new Map<string, { manifest: ExtensionManifest; mtime: number }>();

  constructor(options: LoaderOptions) {
    this.registry = new ExtensionRegistry();
    this.options = {
      extensionDirs: options.extensionDirs,
      configPath: options.configPath || path.join(process.cwd(), '.summit/extensions/config'),
      storagePath: options.storagePath || path.join(process.cwd(), '.summit/extensions/storage'),
      autoLoad: options.autoLoad ?? true,
      activationTimeout: options.activationTimeout ?? 30000,
      parallelLoad: options.parallelLoad ?? true,
      maxConcurrent: options.maxConcurrent ?? 10,
      api: options.api,
      policyEnforcer: options.policyEnforcer,
    };
  }

  /**
   * Discover extensions in configured directories
   */
  async discover(): Promise<ExtensionManifest[]> {
    const startTime = Date.now();
    const manifests: ExtensionManifest[] = [];

    // Discover in all directories in parallel
    const discoveries = await Promise.allSettled(
      this.options.extensionDirs.map((dir) => this.discoverInDirectory(dir))
    );

    for (const result of discoveries) {
      if (result.status === 'fulfilled') {
        manifests.push(...result.value);
      } else {
        console.error('Discovery failed:', result.reason);
      }
    }

    const duration = Date.now() - startTime;
    console.info(`Discovered ${manifests.length} extension(s) in ${duration}ms`);
    return manifests;
  }

  /**
   * Discover extensions in a single directory
   */
  private async discoverInDirectory(dir: string): Promise<ExtensionManifest[]> {
    const manifests: ExtensionManifest[] = [];

    try {
      // Check if directory exists
      try {
        await fs.access(dir);
      } catch {
        // Directory doesn't exist, skip silently
        return manifests;
      }

      // Find all extension.json files
      const pattern = path.join(dir, '**/extension.json');
      const files = await glob(pattern, {
        absolute: true,
        ignore: ['**/node_modules/**', '**/dist/**'],
      });

      // Load manifests in parallel
      const loadResults = await Promise.allSettled(
        files.map(async (file) => {
          const manifest = await this.loadManifest(file);
          const extensionPath = path.dirname(file);
          return { manifest, extensionPath };
        })
      );

      for (const result of loadResults) {
        if (result.status === 'fulfilled') {
          const { manifest, extensionPath } = result.value;
          this.registry.register(manifest, extensionPath);
          manifests.push(manifest);
        } else {
          console.warn('Failed to load manifest:', result.reason);
        }
      }
    } catch (err) {
      console.error(`Failed to discover extensions in ${dir}:`, err);
    }

    return manifests;
  }

  /**
   * Load and validate an extension manifest with caching
   */
  private async loadManifest(manifestPath: string): Promise<ExtensionManifest> {
    // Check cache
    const stat = await fs.stat(manifestPath);
    const cached = this.manifestCache.get(manifestPath);

    if (cached && cached.mtime === stat.mtimeMs) {
      return cached.manifest;
    }

    const content = await fs.readFile(manifestPath, 'utf-8');

    let data: unknown;
    try {
      data = JSON.parse(content);
    } catch (parseErr) {
      throw new Error(`Invalid JSON in ${manifestPath}: ${parseErr}`);
    }

    // Validate against schema
    const result = ExtensionManifestSchema.safeParse(data);

    if (!result.success) {
      const errors = result.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      throw new Error(`Invalid extension manifest at ${manifestPath}: ${errors}`);
    }

    // Cache the result
    this.manifestCache.set(manifestPath, {
      manifest: result.data,
      mtime: stat.mtimeMs,
    });

    return result.data;
  }

  /**
   * Load all discovered extensions
   */
  async loadAll(): Promise<LoadResult[]> {
    const startTime = Date.now();
    const extensions = this.registry.getEnabled().filter((ext) => !ext.loaded);
    const results: LoadResult[] = [];

    if (this.options.parallelLoad) {
      // Load in parallel with concurrency limit
      results.push(...(await this.loadParallel(extensions)));
    } else {
      // Load sequentially
      for (const ext of extensions) {
        const result = await this.loadExtensionWithTiming(ext);
        results.push(result);
      }
    }

    const stats = this.registry.getStats();
    const duration = Date.now() - startTime;
    console.info(
      `Loaded ${stats.loaded}/${stats.total} extensions in ${duration}ms (${stats.failed} failed)`
    );

    return results;
  }

  /**
   * Load extensions in parallel with concurrency limit
   */
  private async loadParallel(extensions: Extension[]): Promise<LoadResult[]> {
    const results: LoadResult[] = [];
    const chunks = this.chunkArray(extensions, this.options.maxConcurrent);

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map((ext) => this.loadExtensionWithTiming(ext))
      );
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Load a single extension with timing
   */
  private async loadExtensionWithTiming(ext: Extension): Promise<LoadResult> {
    const startTime = Date.now();

    try {
      await this.loadExtension(ext);
      return {
        name: ext.manifest.name,
        success: true,
        duration: Date.now() - startTime,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.registry.markFailed(ext.manifest.name, error);
      return {
        name: ext.manifest.name,
        success: false,
        error,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Load a single extension
   */
  private async loadExtension(ext: Extension): Promise<void> {
    const { manifest, path: extensionPath } = ext;

    // Check policy
    if (this.options.policyEnforcer) {
      const allowed = await this.options.policyEnforcer.checkPermissions(
        manifest.name,
        manifest.permissions
      );

      if (!allowed) {
        throw new Error(`Extension ${manifest.name} denied by policy`);
      }
    }

    // Load configuration
    const config = await this.loadConfig(manifest.name);

    // Create extension context
    const context = this.createContext(extensionPath, manifest.name, config);

    // Load the main entrypoint
    const mainEntrypoint = manifest.entrypoints.main;
    if (!mainEntrypoint) {
      throw new Error(`Extension ${manifest.name} has no main entrypoint`);
    }

    const modulePath = path.join(extensionPath, mainEntrypoint.path);

    // Check if module exists
    try {
      await fs.access(modulePath);
    } catch {
      throw new Error(
        `Extension ${manifest.name} entrypoint not found: ${modulePath}. Did you run 'pnpm build'?`
      );
    }

    const module = await import(modulePath);

    // Get the exported activation function or class
    const exportName = mainEntrypoint.export || 'default';
    const exported = module[exportName];

    if (!exported) {
      throw new Error(
        `Extension ${manifest.name} does not export '${exportName}' from ${mainEntrypoint.path}`
      );
    }

    // Activate the extension with timeout
    const activation = await this.activateWithTimeout(
      manifest.name,
      exported,
      context
    );

    // Store activation and mark as loaded
    this.activations.set(manifest.name, activation);
    this.registry.markLoaded(manifest.name, module, config);
  }

  /**
   * Activate extension with timeout
   */
  private async activateWithTimeout(
    name: string,
    exported: unknown,
    context: ExtensionContext
  ): Promise<ExtensionActivation> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Extension ${name} activation timed out after ${this.options.activationTimeout}ms`));
      }, this.options.activationTimeout);
    });

    const activationPromise = this.activateExtension(name, exported, context);

    return Promise.race([activationPromise, timeoutPromise]);
  }

  /**
   * Activate extension based on export type
   */
  private async activateExtension(
    name: string,
    exported: unknown,
    context: ExtensionContext
  ): Promise<ExtensionActivation> {
    if (typeof exported === 'function') {
      // Check if it's a class constructor
      if (exported.prototype && exported.prototype.constructor === exported) {
        const instance = new (exported as new () => { activate?: (ctx: ExtensionContext) => Promise<ExtensionActivation> })();
        if (typeof instance.activate === 'function') {
          return (await instance.activate(context)) || {};
        }
        return {};
      } else {
        // Plain function
        return (await (exported as (ctx: ExtensionContext) => Promise<ExtensionActivation>)(context)) || {};
      }
    } else if (
      exported &&
      typeof exported === 'object' &&
      'activate' in exported &&
      typeof (exported as { activate: unknown }).activate === 'function'
    ) {
      // Object with activate method
      return (await (exported as { activate: (ctx: ExtensionContext) => Promise<ExtensionActivation> }).activate(context)) || {};
    }

    throw new Error(
      `Extension ${name} entrypoint must be a function or have an activate() method`
    );
  }

  /**
   * Create extension context
   */
  private createContext(
    extensionPath: string,
    extensionName: string,
    config: Record<string, unknown>
  ): ExtensionContext {
    const storagePath = path.join(this.options.storagePath, extensionName);

    // Ensure storage directory exists (async, don't block)
    fs.mkdir(storagePath, { recursive: true }).catch((err) => {
      console.warn(`Failed to create storage directory for ${extensionName}:`, err);
    });

    return {
      extensionPath,
      storagePath,
      config,
      logger: this.createLogger(extensionName),
      api: this.createAPI(storagePath),
    };
  }

  /**
   * Create logger for extension
   */
  private createLogger(extensionName: string): ExtensionLogger {
    const prefix = `[ext:${extensionName}]`;

    return {
      info: (msg: string, ...args: unknown[]) => console.info(prefix, msg, ...args),
      warn: (msg: string, ...args: unknown[]) => console.warn(prefix, msg, ...args),
      error: (msg: string, ...args: unknown[]) => console.error(prefix, msg, ...args),
      debug: (msg: string, ...args: unknown[]) => console.debug(prefix, msg, ...args),
    };
  }

  /**
   * Create API for extension
   */
  private createAPI(storagePath: string): ExtensionAPI {
    // Default implementations with storage
    const defaultAPI: ExtensionAPI = {
      entities: {
        create: async () => {
          throw new Error('entities.create not implemented - connect to Summit API');
        },
        update: async () => {
          throw new Error('entities.update not implemented - connect to Summit API');
        },
        delete: async () => {
          throw new Error('entities.delete not implemented - connect to Summit API');
        },
        query: async () => {
          throw new Error('entities.query not implemented - connect to Summit API');
        },
      },
      relationships: {
        create: async () => {
          throw new Error('relationships.create not implemented - connect to Summit API');
        },
        query: async () => {
          throw new Error('relationships.query not implemented - connect to Summit API');
        },
      },
      investigations: {
        create: async () => {
          throw new Error('investigations.create not implemented - connect to Summit API');
        },
        get: async () => {
          throw new Error('investigations.get not implemented - connect to Summit API');
        },
        update: async () => {
          throw new Error('investigations.update not implemented - connect to Summit API');
        },
      },
      storage: {
        get: async (key: string) => {
          const file = path.join(storagePath, `${this.sanitizeKey(key)}.json`);
          try {
            const data = await fs.readFile(file, 'utf-8');
            return JSON.parse(data);
          } catch {
            return undefined;
          }
        },
        set: async (key: string, value: unknown) => {
          const file = path.join(storagePath, `${this.sanitizeKey(key)}.json`);
          await fs.mkdir(storagePath, { recursive: true });
          await fs.writeFile(file, JSON.stringify(value, null, 2));
        },
        delete: async (key: string) => {
          const file = path.join(storagePath, `${this.sanitizeKey(key)}.json`);
          await fs.unlink(file).catch(() => {});
        },
      },
    };

    // Merge with provided API overrides
    if (this.options.api) {
      return {
        entities: { ...defaultAPI.entities, ...this.options.api.entities },
        relationships: { ...defaultAPI.relationships, ...this.options.api.relationships },
        investigations: { ...defaultAPI.investigations, ...this.options.api.investigations },
        storage: { ...defaultAPI.storage, ...this.options.api.storage },
        http: this.options.api.http,
      };
    }

    return defaultAPI;
  }

  /**
   * Sanitize storage key to prevent path traversal
   */
  private sanitizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  /**
   * Load extension configuration
   */
  private async loadConfig(extensionName: string): Promise<Record<string, unknown>> {
    const configFile = path.join(this.options.configPath, `${extensionName}.json`);

    try {
      const content = await fs.readFile(configFile, 'utf-8');
      return JSON.parse(content) as Record<string, unknown>;
    } catch {
      // No config file, return empty config
      return {};
    }
  }

  /**
   * Unload all extensions (cleanup)
   */
  async unloadAll(): Promise<void> {
    // Deactivate in reverse order
    const order = this.registry.getActivationOrder().reverse();

    const results = await Promise.allSettled(
      order.map((name) => this.unloadExtension(name))
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('Failed to unload extension:', result.reason);
      }
    }

    this.registry.clear();
    this.activations.clear();
  }

  /**
   * Unload a single extension
   */
  private async unloadExtension(name: string): Promise<void> {
    const activation = this.activations.get(name);

    if (activation?.dispose) {
      try {
        await activation.dispose();
      } catch (err) {
        console.error(`Error during ${name} disposal:`, err);
      }
    }

    this.activations.delete(name);
    this.registry.unregister(name);
  }

  /**
   * Reload extensions (discover + load)
   */
  async reload(): Promise<void> {
    await this.unloadAll();
    this.manifestCache.clear();
    await this.discover();
    await this.loadAll();
  }

  /**
   * Get the extension registry
   */
  getRegistry(): ExtensionRegistry {
    return this.registry;
  }

  /**
   * Clear manifest cache
   */
  clearCache(): void {
    this.manifestCache.clear();
  }

  /**
   * Get loader statistics
   */
  getStats() {
    return {
      ...this.registry.getStats(),
      cacheSize: this.manifestCache.size,
      activations: this.activations.size,
    };
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
