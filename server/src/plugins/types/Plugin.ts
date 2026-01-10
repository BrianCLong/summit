/**
 * Plugin Interface Definitions
 *
 * Core interfaces for the Summit plugin system.
 *
 * SOC 2 Controls: CC6.1, CC7.2, PI1.1
 *
 * @module plugins/types/Plugin
 */

import { DataEnvelope, GovernanceResult } from '../../types/data-envelope.js';
import { Principal } from '../../types/identity.js';

// ============================================================================
// Plugin Lifecycle
// ============================================================================

export type PluginStatus = 'registered' | 'installed' | 'enabled' | 'disabled' | 'error' | 'deprecated';

export type PluginCategory =
  | 'alerting'
  | 'notification'
  | 'integration'
  | 'analytics'
  | 'automation'
  | 'security'
  | 'compliance'
  | 'custom';

export type PluginCapability =
  | 'read:entities'
  | 'write:entities'
  | 'read:policies'
  | 'execute:actions'
  | 'send:notifications'
  | 'access:external'
  | 'manage:config'
  | 'audit:read'
  | 'admin:full';

// ============================================================================
// Plugin Manifest
// ============================================================================

export interface PluginResourceLimits {
  /** Maximum execution time in milliseconds (default: 30000) */
  timeoutMs?: number;
  /** Maximum memory usage in MB (default: 128) */
  memoryMb?: number;
  /** Maximum API calls per execution (default: 100) */
  apiCalls?: number;
  /** Maximum LLM tokens per execution (default: 0) */
  tokens?: number;
  /** Network access restrictions */
  network?: {
    /** Allowed domains (glob patterns) */
    domains: string[];
  };
}

export interface PluginManifest {
  /** Unique plugin identifier */
  id: string;
  /** Display name */
  name: string;
  /** Semantic version */
  version: string;
  /** Plugin description */
  description: string;
  /** Plugin author */
  author: string;
  /** Category for organization */
  category: PluginCategory;
  /** Required capabilities */
  capabilities: PluginCapability[];
  /** Resource limits required by the plugin */
  resources?: PluginResourceLimits;
  /** Minimum platform version */
  minPlatformVersion?: string;
  /** Plugin dependencies */
  dependencies?: PluginDependency[];
  /** Configuration schema */
  configSchema?: PluginConfigSchema;
  /** Hooks this plugin listens to */
  hooks?: PluginHook[];
  /** Plugin icon URL */
  icon?: string;
  /** Documentation URL */
  docsUrl?: string;
  /** Support URL */
  supportUrl?: string;
  /** License type */
  license?: string;
  /** Tags for search */
  tags?: string[];
  /** Optional cryptographic signature of the bundle */
  signature?: string;
}

export interface PluginDependency {
  pluginId: string;
  minVersion?: string;
  optional?: boolean;
}

export interface PluginConfigSchema {
  type: 'object';
  properties: Record<string, PluginConfigProperty>;
  required?: string[];
}

export interface PluginConfigProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  default?: unknown;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  pattern?: string;
  secret?: boolean;
}

export interface PluginHook {
  event: PluginEvent;
  handler: string;
  priority?: number;
  filter?: Record<string, unknown>;
}

export type PluginEvent =
  | 'entity:created'
  | 'entity:updated'
  | 'entity:deleted'
  | 'policy:evaluated'
  | 'verdict:denied'
  | 'verdict:escalated'
  | 'user:login'
  | 'user:logout'
  | 'alert:triggered'
  | 'schedule:cron'
  | 'webhook:received'
  | 'custom';

export interface PluginPackage {
  manifest: PluginManifest;
  code: string; // Base64 encoded or raw string
  signature?: string;
}

// ============================================================================
// Plugin Context
// ============================================================================

export interface PluginContext {
  /** Tenant ID */
  tenantId: string;
  /** Acting principal */
  principal: Principal;
  /** Plugin configuration */
  config: Record<string, unknown>;
  /** Correlation ID for tracing */
  correlationId: string;
  /** Request timestamp */
  timestamp: string;
  /** Is simulation mode */
  simulation?: boolean;
}

export interface PluginExecutionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  logs?: PluginLogEntry[];
  metrics?: PluginMetrics;
}

export interface PluginLogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface PluginMetrics {
  executionTimeMs: number;
  memoryUsedBytes?: number;
  apiCallCount?: number;
  dataProcessed?: number;
  tokensConsumed?: number;
}

// ============================================================================
// Plugin Interface
// ============================================================================

export interface Plugin {
  /** Plugin manifest */
  manifest: PluginManifest;

  /**
   * Initialize the plugin
   */
  initialize(context: PluginContext): Promise<void>;

  /**
   * Execute plugin action
   */
  execute(
    action: string,
    params: Record<string, unknown>,
    context: PluginContext
  ): Promise<PluginExecutionResult>;

  /**
   * Handle event hook
   */
  onEvent?(
    event: PluginEvent,
    payload: Record<string, unknown>,
    context: PluginContext
  ): Promise<void>;

  /**
   * Validate configuration
   */
  validateConfig?(config: Record<string, unknown>): Promise<{ valid: boolean; errors?: string[] }>;

  /**
   * Cleanup on disable/uninstall
   */
  cleanup?(context: PluginContext): Promise<void>;

  /**
   * Health check
   */
  healthCheck?(): Promise<{ healthy: boolean; message?: string }>;
}

// ============================================================================
// Plugin Registration
// ============================================================================

export interface PluginRegistration {
  id: string;
  manifest: PluginManifest;
  status: PluginStatus;
  installedAt: string;
  installedBy: string;
  enabledAt?: string;
  enabledBy?: string;
  lastExecutedAt?: string;
  executionCount: number;
  errorCount: number;
  lastError?: string;
  version: string;
}

export interface TenantPluginConfig {
  pluginId: string;
  tenantId: string;
  enabled: boolean;
  config: Record<string, unknown>;
  permissions: PluginCapability[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

// ============================================================================
// Plugin API Response Types
// ============================================================================

export interface PluginListResponse {
  plugins: PluginRegistration[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface PluginInstallRequest {
  pluginId: string;
  version?: string;
  config?: Record<string, unknown>;
}

export interface PluginConfigUpdateRequest {
  config: Record<string, unknown>;
  enabled?: boolean;
}

export interface PluginExecuteRequest {
  action: string;
  params: Record<string, unknown>;
  simulation?: boolean;
}

// ============================================================================
// Plugin Governance
// ============================================================================

export interface PluginGovernancePolicy {
  pluginId: string;
  requiredApproval: boolean;
  maxExecutionsPerHour?: number;
  allowedActions?: string[];
  deniedActions?: string[];
  dataAccessRestrictions?: string[];
  auditLevel: 'none' | 'basic' | 'detailed' | 'full';
}

export interface PluginAuditEntry {
  id: string;
  pluginId: string;
  tenantId: string;
  action: string;
  actorId: string;
  timestamp: string;
  duration: number;
  success: boolean;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  governanceVerdict: GovernanceResult;
}
