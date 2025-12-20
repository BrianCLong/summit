import { z } from 'zod';

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

/**
 * Plugin permission types
 */
export enum PluginPermission {
  READ_DATA = 'read:data',
  WRITE_DATA = 'write:data',
  EXECUTE_QUERIES = 'execute:queries',
  ACCESS_GRAPH = 'access:graph',
  NETWORK_ACCESS = 'network:access',
  FILE_SYSTEM = 'filesystem:access',
  DATABASE_ACCESS = 'database:access',
  API_ENDPOINTS = 'api:endpoints',
  UI_EXTENSIONS = 'ui:extensions',
  ANALYTICS = 'analytics:access',
  ML_MODELS = 'ml:models',
  WEBHOOKS = 'webhooks:manage',
  SCHEDULED_TASKS = 'tasks:schedule',
}

/**
 * Plugin manifest schema validator
 */
export const PluginManifestSchema = z.object({
  id: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(200),
  version: z.string().regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/),
  description: z.string().max(1000),
  author: z.object({
    name: z.string(),
    email: z.string().email().optional(),
    url: z.string().url().optional(),
  }),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  license: z.string(),

  // Plugin metadata
  category: z.enum([
    'data-source',
    'analyzer',
    'visualization',
    'export',
    'authentication',
    'search',
    'ml-model',
    'workflow',
    'ui-theme',
    'api-extension',
    'integration',
    'utility',
  ]),

  // Entry points
  main: z.string(),
  icon: z.string().optional(),

  // Dependencies
  dependencies: z.record(z.string()).optional(),
  peerDependencies: z.record(z.string()).optional(),
  engineVersion: z.string(), // Required Summit platform version

  // Permissions required by plugin
  permissions: z.array(z.nativeEnum(PluginPermission)),

  // Resource limits
  resources: z.object({
    maxMemoryMB: z.number().int().positive().max(2048).default(256),
    maxCpuPercent: z.number().int().positive().max(100).default(50),
    maxStorageMB: z.number().int().positive().max(1024).default(100),
    maxNetworkMbps: z.number().int().positive().max(1000).default(10),
  }).optional(),

  // Extension points this plugin provides
  extensionPoints: z.array(z.object({
    id: z.string(),
    type: z.string(),
    config: z.record(z.any()).optional(),
  })).optional(),

  // Configuration schema
  configSchema: z.record(z.any()).optional(),

  // Webhooks
  webhooks: z.array(z.object({
    event: z.string(),
    handler: z.string(),
  })).optional(),

  // API endpoints
  apiEndpoints: z.array(z.object({
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
    path: z.string(),
    handler: z.string(),
  })).optional(),
});

export type PluginManifest = z.infer<typeof PluginManifestSchema>;

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
  events: PluginEventBus;
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
export interface PluginEventBus {
  on(event: string, handler: (...args: any[]) => void | Promise<void>): void;
  off(event: string, handler: (...args: any[]) => void | Promise<void>): void;
  emit(event: string, ...args: any[]): Promise<void>;
  once(event: string, handler: (...args: any[]) => void | Promise<void>): void;
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
