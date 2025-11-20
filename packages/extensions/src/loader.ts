/**
 * Extension Loader
 *
 * Discovers and loads extensions from configured directories.
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
}

export class ExtensionLoader {
  private registry: ExtensionRegistry;
  private options: Required<Omit<LoaderOptions, 'api' | 'policyEnforcer'>> & {
    api?: Partial<ExtensionAPI>;
    policyEnforcer?: PolicyEnforcer;
  };
  private activations = new Map<string, ExtensionActivation>();

  constructor(options: LoaderOptions) {
    this.registry = new ExtensionRegistry();
    this.options = {
      extensionDirs: options.extensionDirs,
      configPath: options.configPath || path.join(process.cwd(), '.summit/extensions/config'),
      storagePath: options.storagePath || path.join(process.cwd(), '.summit/extensions/storage'),
      autoLoad: options.autoLoad ?? true,
      api: options.api,
      policyEnforcer: options.policyEnforcer,
    };
  }

  /**
   * Discover extensions in configured directories
   */
  async discover(): Promise<ExtensionManifest[]> {
    const manifests: ExtensionManifest[] = [];

    for (const dir of this.options.extensionDirs) {
      try {
        // Find all extension.json files
        const pattern = path.join(dir, '**/extension.json');
        const files = await glob(pattern, { absolute: true });

        for (const file of files) {
          try {
            const manifest = await this.loadManifest(file);
            const extensionPath = path.dirname(file);

            this.registry.register(manifest, extensionPath);
            manifests.push(manifest);
          } catch (err) {
            console.error(`Failed to load manifest ${file}:`, err);
          }
        }
      } catch (err) {
        console.error(`Failed to discover extensions in ${dir}:`, err);
      }
    }

    console.info(`Discovered ${manifests.length} extension(s)`);
    return manifests;
  }

  /**
   * Load and validate an extension manifest
   */
  private async loadManifest(manifestPath: string): Promise<ExtensionManifest> {
    const content = await fs.readFile(manifestPath, 'utf-8');
    const data = JSON.parse(content);

    // Validate against schema
    const result = ExtensionManifestSchema.safeParse(data);

    if (!result.success) {
      throw new Error(
        `Invalid extension manifest: ${result.error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join(', ')}`
      );
    }

    return result.data;
  }

  /**
   * Load all discovered extensions
   */
  async loadAll(): Promise<void> {
    const extensions = this.registry.getEnabled();

    for (const ext of extensions) {
      try {
        await this.loadExtension(ext);
      } catch (err) {
        this.registry.markFailed(
          ext.manifest.name,
          err instanceof Error ? err.message : String(err)
        );
      }
    }

    const stats = this.registry.getStats();
    console.info(
      `Loaded ${stats.loaded}/${stats.total} extensions (${stats.failed} failed)`
    );
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
    const context = this.createContext(extensionPath, config);

    // Load the main entrypoint
    const mainEntrypoint = manifest.entrypoints.main;
    if (!mainEntrypoint) {
      throw new Error(`Extension ${manifest.name} has no main entrypoint`);
    }

    const modulePath = path.join(extensionPath, mainEntrypoint.path);
    const module = await import(modulePath);

    // Get the exported activation function or class
    const exportName = mainEntrypoint.export || 'default';
    const exported = module[exportName];

    if (!exported) {
      throw new Error(
        `Extension ${manifest.name} does not export '${exportName}' from ${mainEntrypoint.path}`
      );
    }

    // Activate the extension
    let activation: ExtensionActivation = {};

    if (typeof exported === 'function') {
      // Function entrypoint
      if (exported.prototype && exported.prototype.constructor === exported) {
        // Class constructor
        const instance = new exported();
        if (typeof instance.activate === 'function') {
          activation = await instance.activate(context);
        }
      } else {
        // Plain function
        activation = await exported(context);
      }
    } else if (typeof exported.activate === 'function') {
      // Object with activate method
      activation = await exported.activate(context);
    } else {
      throw new Error(
        `Extension ${manifest.name} entrypoint must be a function or have an activate() method`
      );
    }

    // Store activation and mark as loaded
    this.activations.set(manifest.name, activation);
    this.registry.markLoaded(manifest.name, module, config);
  }

  /**
   * Create extension context
   */
  private createContext(extensionPath: string, config: Record<string, any>): ExtensionContext {
    const storagePath = path.join(
      this.options.storagePath,
      path.basename(extensionPath)
    );

    // Ensure storage directory exists
    fs.mkdir(storagePath, { recursive: true }).catch(console.error);

    return {
      extensionPath,
      storagePath,
      config,
      logger: this.createLogger(path.basename(extensionPath)),
      api: this.createAPI(storagePath),
    };
  }

  /**
   * Create logger for extension
   */
  private createLogger(extensionName: string): ExtensionLogger {
    const prefix = `[ext:${extensionName}]`;

    return {
      info: (msg, ...args) => console.info(prefix, msg, ...args),
      warn: (msg, ...args) => console.warn(prefix, msg, ...args),
      error: (msg, ...args) => console.error(prefix, msg, ...args),
      debug: (msg, ...args) => console.debug(prefix, msg, ...args),
    };
  }

  /**
   * Create API for extension
   */
  private createAPI(storagePath: string): ExtensionAPI {
    // Default implementations with storage
    const defaultAPI: ExtensionAPI = {
      entities: {
        create: async (entity) => {
          throw new Error('entities.create not implemented');
        },
        update: async (id, data) => {
          throw new Error('entities.update not implemented');
        },
        delete: async (id) => {
          throw new Error('entities.delete not implemented');
        },
        query: async (filter) => {
          throw new Error('entities.query not implemented');
        },
      },
      relationships: {
        create: async (rel) => {
          throw new Error('relationships.create not implemented');
        },
        query: async (filter) => {
          throw new Error('relationships.query not implemented');
        },
      },
      investigations: {
        create: async (inv) => {
          throw new Error('investigations.create not implemented');
        },
        get: async (id) => {
          throw new Error('investigations.get not implemented');
        },
        update: async (id, data) => {
          throw new Error('investigations.update not implemented');
        },
      },
      storage: {
        get: async (key) => {
          const file = path.join(storagePath, `${key}.json`);
          try {
            const data = await fs.readFile(file, 'utf-8');
            return JSON.parse(data);
          } catch {
            return undefined;
          }
        },
        set: async (key, value) => {
          const file = path.join(storagePath, `${key}.json`);
          await fs.mkdir(storagePath, { recursive: true });
          await fs.writeFile(file, JSON.stringify(value, null, 2));
        },
        delete: async (key) => {
          const file = path.join(storagePath, `${key}.json`);
          await fs.unlink(file).catch(() => {});
        },
      },
    };

    // Merge with provided API overrides
    return {
      ...defaultAPI,
      ...this.options.api,
    };
  }

  /**
   * Load extension configuration
   */
  private async loadConfig(extensionName: string): Promise<Record<string, any>> {
    const configFile = path.join(this.options.configPath, `${extensionName}.json`);

    try {
      const content = await fs.readFile(configFile, 'utf-8');
      return JSON.parse(content);
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

    for (const name of order) {
      try {
        await this.unloadExtension(name);
      } catch (err) {
        console.error(`Failed to unload extension ${name}:`, err);
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
      await activation.dispose();
    }

    this.activations.delete(name);
    this.registry.unregister(name);
  }

  /**
   * Reload extensions (discover + load)
   */
  async reload(): Promise<void> {
    await this.unloadAll();
    await this.discover();
    await this.loadAll();
  }

  /**
   * Get the extension registry
   */
  getRegistry(): ExtensionRegistry {
    return this.registry;
  }
}
