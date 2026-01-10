import {
  PluginManifestSchema,
  PluginSignatureSchema,
  type PluginManifest,
  type PluginSignature,
} from '../manifest/schema.js';
import { PluginPermission } from './permissions.js';

/**
 * Plugin lifecycle states
 */
export enum PluginState {
  UNLOADED = 'unloaded',
  LOADING = 'loading',
  LOADED = 'loaded',
  INITIALIZING = 'initializing',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ERROR = 'error',
  UNLOADING = 'unloading',
}

export { PluginManifestSchema, PluginSignatureSchema, PluginPermission };
export type { PluginManifest, PluginSignature };

/**
 * Plugin context provided to plugins at runtime
 */
export interface PluginContext {
  pluginId: string;
  version: string;
  config: Record<string, any>;
  logger: PluginLogger;
  storage: PluginStorage;
  api: PluginAPI;
  events: IPluginEventBus;
}

/**
 * Plugin logger interface
 */
export interface PluginLogger {
  debug(message: string, meta?: Record<string, any>): void;
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, error?: Error, meta?: Record<string, any>): void;
}

/**
 * Plugin storage interface
 */
export interface PluginStorage {
  get<T = any>(key: string): Promise<T | null>;
  set<T = any>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
}

/**
 * Plugin API interface
 */
export interface PluginAPI {
  request<T = any>(endpoint: string, options?: RequestOptions): Promise<T>;
  graphql<T = any>(query: string, variables?: Record<string, any>): Promise<T>;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

/**
 * Plugin event bus interface
 */
export interface IPluginEventBus {
  on(event: string, handler: (...args: any[]) => void | Promise<void>): any;
  off(event: string, handler: (...args: any[]) => void | Promise<void>): any;
  emit(event: string, ...args: any[]): any;
  once(event: string, handler: (...args: any[]) => void | Promise<void>): any;
}

/**
 * Plugin interface that all plugins must implement
 */
export interface Plugin {
  manifest: PluginManifest;

  /**
   * Initialize the plugin
   */
  initialize(context: PluginContext): Promise<void>;

  /**
   * Start the plugin
   */
  start(): Promise<void>;

  /**
   * Stop the plugin
   */
  stop(): Promise<void>;

  /**
   * Cleanup resources
   */
  destroy(): Promise<void>;

  /**
   * Health check
   */
  healthCheck?(): Promise<PluginHealthStatus>;
}

export interface PluginHealthStatus {
  healthy: boolean;
  message?: string;
  details?: Record<string, any>;
}

/**
 * Plugin metadata stored in registry
 */
export interface PluginMetadata {
  manifest: PluginManifest;
  state: PluginState;
  installedAt: Date;
  updatedAt: Date;
  enabledAt?: Date;
  disabledAt?: Date;
  config: Record<string, any>;
  stats: PluginStats;
}

export interface PluginStats {
  downloads: number;
  activeInstalls: number;
  rating: number;
  reviews: number;
  lastUsed?: Date;
  errorCount: number;
  successCount: number;
}

/**
 * Plugin loader interface
 */
export interface PluginLoader {
  load(pluginId: string, version?: string): Promise<Plugin>;
  unload(pluginId: string): Promise<void>;
  reload(pluginId: string): Promise<void>;
  isLoaded(pluginId: string): boolean;
  getLoadedPlugins(): Map<string, Plugin>;
}

/**
 * Plugin registry interface
 */
export interface PluginRegistry {
  register(plugin: PluginMetadata): Promise<void>;
  unregister(pluginId: string): Promise<void>;
  get(pluginId: string): Promise<PluginMetadata | null>;
  list(filter?: PluginFilter): Promise<PluginMetadata[]>;
  update(pluginId: string, updates: Partial<PluginMetadata>): Promise<void>;
  search(query: string): Promise<PluginMetadata[]>;
}

export interface PluginFilter {
  category?: string;
  state?: PluginState;
  author?: string;
  tags?: string[];
  minRating?: number;
}

/**
 * Plugin dependency resolver
 */
export interface DependencyResolver {
  resolve(pluginId: string, version: string): Promise<DependencyTree>;
  checkCompatibility(pluginId: string, version: string): Promise<CompatibilityResult>;
}

export interface DependencyTree {
  plugin: PluginManifest;
  dependencies: Map<string, DependencyTree>;
}

export interface CompatibilityResult {
  compatible: boolean;
  issues: CompatibilityIssue[];
}

export interface CompatibilityIssue {
  type: 'version-mismatch' | 'missing-dependency' | 'conflict' | 'unsupported-platform';
  message: string;
  severity: 'error' | 'warning';
}
