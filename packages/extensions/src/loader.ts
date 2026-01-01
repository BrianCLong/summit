// @ts-nocheck
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
} from './types.js';
import { ExtensionRegistry } from './registry.js';
import { PolicyEnforcer } from './policy/enforcer.js';
import { CompatibilityChecker } from './compatibility.js';
import { StaticPolicyValidator } from './policy/static-validator.js';
import { SandboxRunner, SandboxActivationHandle } from './sandbox/sandbox-runner.js';
import { ExtensionObservability } from './observability.js';
import { ExtensionHealthMonitor } from './health.js';

export interface LoaderOptions {
  extensionDirs: string[];
  configPath?: string;
  storagePath?: string;
  api?: Partial<ExtensionAPI>;
  policyEnforcer?: PolicyEnforcer;
  autoLoad?: boolean;
  dependencyAllowList?: string[];
  dependencyDenyList?: string[];
  platformVersion?: string;
}

export class ExtensionLoader {
  private registry: ExtensionRegistry;
  private options: Required<Omit<LoaderOptions, 'api' | 'policyEnforcer'>> & {
    api?: Partial<ExtensionAPI>;
    policyEnforcer?: PolicyEnforcer;
  };
  private activations = new Map<string, SandboxActivationHandle>();
  private compatibility: CompatibilityChecker;
  private staticValidator: StaticPolicyValidator;
  private sandbox: SandboxRunner;
  private observability: ExtensionObservability;
  private healthMonitor: ExtensionHealthMonitor;

  constructor(options: LoaderOptions) {
    this.registry = new ExtensionRegistry();
    this.observability = new ExtensionObservability();
    this.compatibility = new CompatibilityChecker({
      platformVersion: options.platformVersion || process.env.SUMMIT_VERSION || '1.0.0',
      supportedBackwardsMajorVersions: 1,
    });
    this.staticValidator = new StaticPolicyValidator({
      dependencyAllowList: options.dependencyAllowList,
      dependencyDenyList: options.dependencyDenyList,
    });
    this.options = {
      extensionDirs: options.extensionDirs,
      configPath: options.configPath || path.join(process.cwd(), '.summit/extensions/config'),
      storagePath: options.storagePath || path.join(process.cwd(), '.summit/extensions/storage'),
      autoLoad: options.autoLoad ?? true,
      api: options.api,
      policyEnforcer: options.policyEnforcer,
    };
    this.sandbox = new SandboxRunner(this.observability);
    this.healthMonitor = new ExtensionHealthMonitor(this.registry, this.observability);
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
        this.healthMonitor.recordFailure(ext.manifest.name);
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

    // Compatibility window enforcement
    this.compatibility.validate(manifest);

    // Static policy validation
    await this.staticValidator.validate(manifest, extensionPath);

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
    const exportName = mainEntrypoint.export || 'default';
    const activation = await this.sandbox.run(manifest, modulePath, exportName, context);

    // Store activation and mark as loaded
    this.activations.set(manifest.name, activation);
    this.registry.markLoaded(manifest.name, activation.exports, config);
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
      info: (msg, ...args) => {
        this.observability.recordLog(extensionName, 'info', msg, ...args);
        console.info(prefix, msg, ...args);
      },
      warn: (msg, ...args) => {
        this.observability.recordLog(extensionName, 'warn', msg, ...args);
        console.warn(prefix, msg, ...args);
      },
      error: (msg, ...args) => {
        this.observability.recordLog(extensionName, 'error', msg, ...args);
        console.error(prefix, msg, ...args);
        this.healthMonitor.recordFailure(extensionName);
      },
      debug: (msg, ...args) => {
        this.observability.recordLog(extensionName, 'debug', msg, ...args);
        console.debug(prefix, msg, ...args);
      },
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
          this.observability.recordLog('extension-api', 'warn', 'entities.create called but not connected to graph DB');
          throw new Error(
            'Extension API entities.create requires graph database connection. ' +
            'Configure ExtensionLoader with api.entities.create implementation that connects to Neo4j/PostgreSQL. ' +
            'See server/src/graphql/resolvers/crudResolvers.ts for reference implementation.'
          );
        },
        update: async (id, data) => {
          this.observability.recordLog('extension-api', 'warn', `entities.update called for ${id} but not connected`);
          throw new Error(
            'Extension API entities.update requires graph database connection. ' +
            'Configure ExtensionLoader with api.entities.update implementation.'
          );
        },
        delete: async (id) => {
          this.observability.recordLog('extension-api', 'warn', `entities.delete called for ${id} but not connected`);
          throw new Error(
            'Extension API entities.delete requires graph database connection. ' +
            'Configure ExtensionLoader with api.entities.delete implementation.'
          );
        },
        query: async (filter) => {
          this.observability.recordLog('extension-api', 'warn', 'entities.query called but not connected');
          throw new Error(
            'Extension API entities.query requires graph database connection. ' +
            'Configure ExtensionLoader with api.entities.query implementation.'
          );
        },
      },
      relationships: {
        create: async (rel) => {
          this.observability.recordLog('extension-api', 'warn', 'relationships.create called but not connected');
          throw new Error(
            'Extension API relationships.create requires graph database connection. ' +
            'Configure ExtensionLoader with api.relationships.create implementation. ' +
            'See server/src/graphql/resolvers/crudResolvers.ts for reference implementation.'
          );
        },
        query: async (filter) => {
          this.observability.recordLog('extension-api', 'warn', 'relationships.query called but not connected');
          throw new Error(
            'Extension API relationships.query requires graph database connection. ' +
            'Configure ExtensionLoader with api.relationships.query implementation.'
          );
        },
      },
      investigations: {
        create: async (inv) => {
          this.observability.recordLog('extension-api', 'warn', 'investigations.create called but not connected');
          throw new Error(
            'Extension API investigations.create requires investigation service connection. ' +
            'Configure ExtensionLoader with api.investigations.create implementation. ' +
            'See server/src/graphql/resolvers/crudResolvers.ts for reference implementation.'
          );
        },
        get: async (id) => {
          this.observability.recordLog('extension-api', 'warn', `investigations.get called for ${id} but not connected`);
          throw new Error(
            'Extension API investigations.get requires investigation service connection. ' +
            'Configure ExtensionLoader with api.investigations.get implementation.'
          );
        },
        update: async (id, data) => {
          this.observability.recordLog('extension-api', 'warn', `investigations.update called for ${id} but not connected`);
          throw new Error(
            'Extension API investigations.update requires investigation service connection. ' +
            'Configure ExtensionLoader with api.investigations.update implementation.'
          );
        },
      },
      storage: {
        get: async (key) => {
          if (!key || typeof key !== 'string') {
            throw new Error('Storage key must be a non-empty string');
          }
          const file = path.join(storagePath, `${key}.json`);
          try {
            const data = await fs.readFile(file, 'utf-8');
            return JSON.parse(data);
          } catch {
            return undefined;
          }
        },
        set: async (key, value) => {
          if (!key || typeof key !== 'string') {
            throw new Error('Storage key must be a non-empty string');
          }
          const file = path.join(storagePath, `${key}.json`);
          await fs.mkdir(storagePath, { recursive: true });
          await fs.writeFile(file, JSON.stringify(value, null, 2));
        },
        delete: async (key) => {
          if (!key || typeof key !== 'string') {
            throw new Error('Storage key must be a non-empty string');
          }
          const file = path.join(storagePath, `${key}.json`);
          await fs.unlink(file).catch(() => {});
        },
      },
    };

    // Merge with provided API overrides
    // This allows the host application to inject proper implementations
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
