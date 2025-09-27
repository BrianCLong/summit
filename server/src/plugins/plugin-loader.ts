import { promises as fs } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { z } from 'zod';
import type { PluginContext } from './sdk';
import type {
  LoadedPlugin,
  PluginExecutionOptions,
  PluginLoaderOptions,
  PluginManifest,
  PluginSandboxContext,
  PluginSandboxLogger,
} from './plugin-types';

const manifestSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().optional(),
  entry: z.string().min(1),
  timeoutMs: z.number().int().positive().optional(),
  allowedModules: z.array(z.string()).optional(),
  allowedEnv: z.array(z.string()).optional(),
  allowedVaultPaths: z.array(z.string()).optional(),
  cacheKeyPrefix: z.string().optional(),
});

type InternalPlugin = {
  manifest: PluginManifest;
  entryPath: string;
  directory: string;
  script: vm.Script;
};

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

export class PluginLoader {
  private readonly rootDir: string;
  private readonly defaultTimeoutMs: number;
  private readonly baseAllowedModules: string[];
  private readonly plugins = new Map<string, InternalPlugin>();

  constructor(options: PluginLoaderOptions) {
    this.rootDir = options.rootDir;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 5_000;
    this.baseAllowedModules = unique(options.baseAllowedModules ?? []);
  }

  async loadAll(): Promise<LoadedPlugin[]> {
    this.plugins.clear();
    const manifestPaths = await this.findManifestFiles(this.rootDir);
    for (const manifestPath of manifestPaths) {
      const manifest = await this.loadManifest(manifestPath);
      if (this.plugins.has(manifest.name)) {
        throw new Error(`Duplicate plugin name detected: ${manifest.name}`);
      }
      const entryPath = path.resolve(path.dirname(manifestPath), manifest.entry);
      const code = await fs.readFile(entryPath, 'utf8');
      const script = new vm.Script(code, { filename: entryPath });
      this.plugins.set(manifest.name, {
        manifest,
        entryPath,
        directory: path.dirname(entryPath),
        script,
      });
    }

    return Array.from(this.plugins.values()).map((plugin) => ({
      manifest: plugin.manifest,
      run: (inputs: unknown, ctx: PluginContext, options?: PluginExecutionOptions) =>
        this.execute(plugin.manifest.name, inputs, ctx, options),
    }));
  }

  listManifests(): PluginManifest[] {
    return Array.from(this.plugins.values()).map((plugin) => plugin.manifest);
  }

  async execute(
    name: string,
    inputs: unknown,
    hostContext: PluginContext,
    options?: PluginExecutionOptions,
  ): Promise<unknown> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin not loaded: ${name}`);
    }

    const timeout = options?.timeoutMs ?? plugin.manifest.timeoutMs ?? this.defaultTimeoutMs;
    const sandbox = this.createSandbox(plugin, hostContext);
    const context = vm.createContext(sandbox, {
      codeGeneration: { strings: true, wasm: false },
      name: `plugin:${plugin.manifest.name}`,
    });

    plugin.script.runInContext(context, { timeout });
    const exported = (sandbox.module?.exports ?? sandbox.exports) as {
      execute?: (payload: {
        inputs: unknown;
        context: PluginSandboxContext;
        config: Record<string, unknown>;
      }) => unknown | Promise<unknown>;
    };

    if (!exported || typeof exported.execute !== 'function') {
      throw new Error(`Plugin ${plugin.manifest.name} must export an execute function.`);
    }

    const pluginContext = this.createPluginContext(plugin, hostContext);
    const config = options?.config ?? {};
    return exported.execute({ inputs, context: pluginContext, config });
  }

  private async findManifestFiles(dir: string): Promise<string[]> {
    const manifestFiles: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        manifestFiles.push(...(await this.findManifestFiles(entryPath)));
      } else if (entry.isFile() && entry.name === 'plugin.json') {
        manifestFiles.push(entryPath);
      }
    }
    return manifestFiles;
  }

  private async loadManifest(manifestPath: string): Promise<PluginManifest> {
    const raw = await fs.readFile(manifestPath, 'utf8');
    const parsed = JSON.parse(raw);
    const manifest = manifestSchema.parse(parsed);
    return { ...manifest, entry: manifest.entry };
  }

  private createSandbox(plugin: InternalPlugin, hostContext: PluginContext) {
    const env = this.buildEnv(plugin.manifest);
    const requireFromPlugin = createRequire(plugin.entryPath);
    const allowedModules = unique([
      ...this.baseAllowedModules,
      ...(plugin.manifest.allowedModules ?? []),
    ]);
    const sandboxRequire = (specifier: string) => {
      if (specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/')) {
        const resolved = requireFromPlugin.resolve(specifier);
        const normalized = path.normalize(resolved);
        if (!normalized.startsWith(plugin.directory)) {
          throw new Error(`Plugin ${plugin.manifest.name} cannot require files outside its directory.`);
        }
        return requireFromPlugin(resolved);
      }
      if (!allowedModules.includes(specifier)) {
        throw new Error(`Module ${specifier} is not allowed for plugin ${plugin.manifest.name}.`);
      }
      return requireFromPlugin(specifier);
    };

    const sandbox: Record<string, unknown> = {
      module: { exports: {} },
      exports: {},
      require: sandboxRequire,
      __dirname: plugin.directory,
      __filename: plugin.entryPath,
      fetch,
      URL,
      URLSearchParams,
      TextEncoder,
      TextDecoder,
      AbortController,
      Buffer,
      console: this.createConsole(plugin.manifest, hostContext.logger),
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      process: Object.freeze({ env }),
    };

    sandbox.global = sandbox;
    return sandbox;
  }

  private createPluginContext(plugin: InternalPlugin, hostContext: PluginContext): PluginSandboxContext {
    const manifest = plugin.manifest;
    const logger = this.createLogger(manifest, hostContext.logger);
    const cachePrefix = manifest.cacheKeyPrefix ?? manifest.name;
    const cache = this.createCacheApi(cachePrefix, hostContext);
    const vault = this.createVaultApi(manifest, hostContext);

    return {
      manifest,
      logger,
      env: this.buildEnv(manifest),
      fetch,
      cache,
      vault,
    };
  }

  private createConsole(manifest: PluginManifest, baseLogger: PluginContext['logger']) {
    const logger = this.createLogger(manifest, baseLogger);
    return {
      log: (...args: unknown[]) => logger.info(...args),
      info: (...args: unknown[]) => logger.info(...args),
      warn: (...args: unknown[]) => logger.warn(...args),
      error: (...args: unknown[]) => logger.error(...args),
      debug: (...args: unknown[]) => logger.debug(...args),
    };
  }

  private createLogger(manifest: PluginManifest, baseLogger: PluginContext['logger']): PluginSandboxLogger {
    const fallback = console;
    const logger = baseLogger ?? (fallback as PluginContext['logger']);
    const prefix = `[plugin:${manifest.name}]`;
    return {
      info: (...args: unknown[]) => logger.info(prefix, ...args),
      warn: (...args: unknown[]) => logger.warn(prefix, ...args),
      error: (...args: unknown[]) => logger.error(prefix, ...args),
      debug: (...args: unknown[]) =>
        typeof (logger as any).debug === 'function'
          ? (logger as any).debug(prefix, ...args)
          : logger.info(prefix, ...args),
    };
  }

  private createCacheApi(prefix: string, hostContext: PluginContext) {
    if (!hostContext.cache) {
      return undefined;
    }
    return {
      get: (key: string) => hostContext.cache.get(`${prefix}:${key}`),
      set: (key: string, value: unknown, ttlSeconds?: number) =>
        hostContext.cache.set(`${prefix}:${key}`, value, ttlSeconds),
    };
  }

  private createVaultApi(manifest: PluginManifest, hostContext: PluginContext) {
    if (!hostContext.vault || !manifest.allowedVaultPaths || manifest.allowedVaultPaths.length === 0) {
      return undefined;
    }
    const allowed = manifest.allowedVaultPaths.map((pathPrefix) => pathPrefix.trim()).filter(Boolean);
    return {
      read: async (pathKey: string) => {
        const isAllowed = allowed.some((prefix) => pathKey.startsWith(prefix));
        if (!isAllowed) {
          throw new Error(`Access to vault path ${pathKey} is not permitted for plugin ${manifest.name}.`);
        }
        return hostContext.vault.read(pathKey);
      },
    };
  }

  private buildEnv(manifest: PluginManifest) {
    const envKeys = manifest.allowedEnv ?? [];
    const env: Record<string, string | undefined> = {};
    for (const key of envKeys) {
      env[key] = process.env[key];
    }
    return env;
  }
}
