/**
 * Summit Extension Manifest Types
 *
 * Defines the structure for extension manifests, capabilities, and permissions.
 */

import { z } from 'zod';

/**
 * Extension types supported by Summit
 */
export enum ExtensionType {
  CONNECTOR = 'connector',
  WIDGET = 'widget',
  COMMAND = 'command',
  TOOL = 'tool',
  ANALYZER = 'analyzer',
  INTEGRATION = 'integration',
}

/**
 * Capabilities that extensions can expose
 */
export enum ExtensionCapability {
  // Data capabilities
  DATA_INGESTION = 'data.ingestion',
  DATA_EXPORT = 'data.export',
  DATA_TRANSFORM = 'data.transform',

  // UI capabilities
  UI_WIDGET = 'ui.widget',
  UI_COMMAND = 'ui.command',
  UI_PANEL = 'ui.panel',

  // Copilot capabilities
  COPILOT_TOOL = 'copilot.tool',
  COPILOT_SKILL = 'copilot.skill',

  // Analysis capabilities
  ANALYTICS = 'analytics',
  ENRICHMENT = 'enrichment',

  // Integration capabilities
  API_PROVIDER = 'api.provider',
  WEBHOOK = 'webhook',
}

/**
 * Permissions that extensions can request
 */
export enum ExtensionPermission {
  // Data permissions
  READ_ENTITIES = 'entities:read',
  WRITE_ENTITIES = 'entities:write',
  READ_RELATIONSHIPS = 'relationships:read',
  WRITE_RELATIONSHIPS = 'relationships:write',
  READ_INVESTIGATIONS = 'investigations:read',
  WRITE_INVESTIGATIONS = 'investigations:write',

  // System permissions
  NETWORK_ACCESS = 'network:access',
  FILE_SYSTEM_READ = 'fs:read',
  FILE_SYSTEM_WRITE = 'fs:write',
  EXECUTE_COMMANDS = 'commands:execute',

  // API permissions
  API_ACCESS = 'api:access',
  WEBHOOK_REGISTER = 'webhook:register',

  // User permissions
  USER_DATA_ACCESS = 'user:data',
}

/**
 * Extension entrypoint definition
 */
export const EntrypointSchema = z.object({
  type: z.enum(['function', 'class', 'http', 'cli']),
  path: z.string().describe('Relative path to the entrypoint module'),
  export: z.string().optional().describe('Named export (default if not specified)'),
  handler: z.string().optional().describe('Function/method name to invoke'),
});

export type Entrypoint = z.infer<typeof EntrypointSchema>;

/**
 * Extension configuration schema
 */
export const ConfigSchemaDefinition = z.object({
  type: z.enum(['object', 'string', 'number', 'boolean', 'array']),
  properties: z.record(z.any()).optional(),
  required: z.array(z.string()).optional(),
  default: z.any().optional(),
  description: z.string().optional(),
});

export type ConfigSchema = z.infer<typeof ConfigSchemaDefinition>;

/**
 * Extension manifest schema
 */
export const ExtensionManifestSchema = z.object({
  // Identity
  name: z.string()
    .min(1)
    .regex(/^[a-z0-9-]+$/)
    .describe('Unique extension identifier (kebab-case)'),

  displayName: z.string()
    .min(1)
    .describe('Human-readable name'),

  version: z.string()
    .regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/)
    .describe('Semantic version (e.g., 1.0.0)'),

  description: z.string()
    .min(1)
    .describe('Brief description of the extension'),

  author: z.string()
    .optional()
    .describe('Extension author'),

  license: z.string()
    .optional()
    .describe('License identifier (e.g., MIT, Apache-2.0)'),

  // Type and capabilities
  type: z.nativeEnum(ExtensionType)
    .describe('Primary extension type'),

  capabilities: z.array(z.nativeEnum(ExtensionCapability))
    .min(1)
    .describe('List of capabilities this extension provides'),

  // Permissions
  permissions: z.array(z.nativeEnum(ExtensionPermission))
    .default([])
    .describe('Permissions required by this extension'),

  // Entrypoints
  entrypoints: z.record(EntrypointSchema)
    .describe('Named entrypoints for different contexts'),

  // Configuration
  configSchema: ConfigSchemaDefinition
    .optional()
    .describe('JSON Schema for extension configuration'),

  // Dependencies
  dependencies: z.record(z.string())
    .optional()
    .describe('NPM package dependencies'),

  peerDependencies: z.record(z.string())
    .optional()
    .describe('Expected peer dependencies'),

  // Integration points
  copilot: z.object({
    tools: z.array(z.object({
      name: z.string(),
      description: z.string(),
      parameters: z.record(z.any()),
      entrypoint: z.string(),
    })).optional(),
    skills: z.array(z.object({
      name: z.string(),
      description: z.string(),
      entrypoint: z.string(),
    })).optional(),
  }).optional(),

  ui: z.object({
    commands: z.array(z.object({
      id: z.string(),
      title: z.string(),
      icon: z.string().optional(),
      category: z.string().optional(),
      entrypoint: z.string(),
    })).optional(),
    widgets: z.array(z.object({
      id: z.string(),
      title: z.string(),
      component: z.string(),
      placement: z.enum(['dashboard', 'sidebar', 'panel']).optional(),
    })).optional(),
  }).optional(),

  cli: z.object({
    commands: z.array(z.object({
      name: z.string(),
      description: z.string(),
      entrypoint: z.string(),
      arguments: z.array(z.object({
        name: z.string(),
        description: z.string(),
        required: z.boolean().optional(),
        type: z.enum(['string', 'number', 'boolean']).optional(),
      })).optional(),
      options: z.array(z.object({
        name: z.string(),
        alias: z.string().optional(),
        description: z.string(),
        type: z.enum(['string', 'number', 'boolean']).optional(),
        default: z.any().optional(),
      })).optional(),
    })).optional(),
  }).optional(),

  // Metadata
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  keywords: z.array(z.string()).optional(),

  // Summit-specific
  summit: z.object({
    minVersion: z.string().optional(),
    maxVersion: z.string().optional(),
    experimental: z.boolean().optional(),
  }).optional(),
});

export type ExtensionManifest = z.infer<typeof ExtensionManifestSchema>;

/**
 * Extension instance metadata
 */
export interface Extension {
  manifest: ExtensionManifest;
  path: string;
  enabled: boolean;
  loaded: boolean;
  error?: string;
  module?: any;
  config?: Record<string, any>;
}

/**
 * Extension context passed to extension code
 */
export interface ExtensionContext {
  extensionPath: string;
  storagePath: string;
  config: Record<string, any>;
  logger: ExtensionLogger;
  api: ExtensionAPI;
}

/**
 * Logger interface for extensions
 */
export interface ExtensionLogger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

/**
 * API interface for extensions
 */
export interface ExtensionAPI {
  // Entity operations
  entities: {
    create(entity: any): Promise<any>;
    update(id: string, data: any): Promise<any>;
    delete(id: string): Promise<void>;
    query(filter: any): Promise<any[]>;
  };

  // Relationship operations
  relationships: {
    create(relationship: any): Promise<any>;
    query(filter: any): Promise<any[]>;
  };

  // Investigation operations
  investigations: {
    create(investigation: any): Promise<any>;
    get(id: string): Promise<any>;
    update(id: string, data: any): Promise<any>;
  };

  // Storage operations
  storage: {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    delete(key: string): Promise<void>;
  };

  // HTTP client (if network permission granted)
  http?: {
    get(url: string, options?: any): Promise<any>;
    post(url: string, data: any, options?: any): Promise<any>;
  };
}

/**
 * Extension activation result
 */
export interface ExtensionActivation {
  dispose?: () => void | Promise<void>;
  exports?: Record<string, any>;
}

/**
 * Extension hook interface
 */
export interface ExtensionHooks {
  activate?(context: ExtensionContext): Promise<ExtensionActivation>;
  deactivate?(): Promise<void>;
}
