import type { PluginContext } from './sdk';

export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  entry: string;
  timeoutMs?: number;
  allowedModules?: string[];
  allowedEnv?: string[];
  allowedVaultPaths?: string[];
  cacheKeyPrefix?: string;
}

export interface PluginLoaderOptions {
  rootDir: string;
  defaultTimeoutMs?: number;
  baseAllowedModules?: string[];
}

export interface PluginExecutionOptions {
  config?: Record<string, unknown>;
  timeoutMs?: number;
}

export interface PluginSandboxLogger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}

export interface PluginSandboxContext {
  manifest: PluginManifest;
  logger: PluginSandboxLogger;
  env: Record<string, string | undefined>;
  fetch: typeof fetch;
  cache?: {
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown, ttlSeconds?: number) => Promise<void>;
  };
  vault?: {
    read: (path: string) => Promise<unknown>;
  };
}

export interface LoadedPlugin {
  manifest: PluginManifest;
  run: (inputs: unknown, ctx: PluginContext, options?: PluginExecutionOptions) => Promise<unknown>;
}
