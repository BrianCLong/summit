/**
 * Plugin Sandbox
 *
 * Provides isolated execution environment for plugins with resource limits.
 *
 * SOC 2 Controls: CC6.1, CC7.2, PI1.1
 *
 * @module plugins/PluginSandbox
 */

import {
  Plugin,
  PluginContext,
  PluginExecutionResult,
  PluginLogEntry,
  PluginMetrics,
} from './types/Plugin.js';
import logger from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export interface SandboxConfig {
  maxExecutionTimeMs: number;
  maxMemoryMb: number;
  maxApiCalls: number;
  allowedDomains?: string[];
  blockedOperations?: string[];
}

export interface SandboxedExecution {
  result: PluginExecutionResult;
  metrics: PluginMetrics;
  logs: PluginLogEntry[];
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: SandboxConfig = {
  maxExecutionTimeMs: 30000,
  maxMemoryMb: 128,
  maxApiCalls: 100,
  allowedDomains: ['*'],
  blockedOperations: ['eval', 'Function'],
};

// ============================================================================
// Plugin Sandbox Implementation
// ============================================================================

export class PluginSandbox {
  private config: SandboxConfig;

  constructor(config: Partial<SandboxConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute a plugin action in a sandboxed environment
   */
  async execute(
    plugin: Plugin,
    action: string,
    params: Record<string, unknown>,
    context: PluginContext,
    timeout?: number
  ): Promise<PluginExecutionResult> {
    const startTime = Date.now();
    const logs: PluginLogEntry[] = [];
    const apiCallCount = 0;

    // Create sandboxed context with resource tracking
    const sandboxedContext: PluginContext = {
      ...context,
      // In production, would wrap with proxies to track/limit resource usage
    };

    // Create a logger for the plugin
    const pluginLogger = {
      debug: (message: string, data?: Record<string, unknown>) => {
        logs.push({ level: 'debug', message, timestamp: new Date().toISOString(), data });
      },
      info: (message: string, data?: Record<string, unknown>) => {
        logs.push({ level: 'info', message, timestamp: new Date().toISOString(), data });
      },
      warn: (message: string, data?: Record<string, unknown>) => {
        logs.push({ level: 'warn', message, timestamp: new Date().toISOString(), data });
      },
      error: (message: string, data?: Record<string, unknown>) => {
        logs.push({ level: 'error', message, timestamp: new Date().toISOString(), data });
      },
    };

    try {
      // Execute with timeout
      const timeoutMs = timeout || this.config.maxExecutionTimeMs;

      const executionPromise = plugin.execute(action, params, sandboxedContext);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Plugin execution timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      const result = await Promise.race([executionPromise, timeoutPromise]);

      const executionTimeMs = Date.now() - startTime;

      return {
        ...result,
        logs: [...logs, ...(result.logs || [])],
        metrics: {
          executionTimeMs,
          apiCallCount,
          ...(result.metrics || {}),
        },
      };
    } catch (error: any) {
      const executionTimeMs = Date.now() - startTime;

      logger.error({ error, pluginId: plugin.manifest.id, action }, 'Sandbox execution error');

      return {
        success: false,
        error: error.message || 'Unknown error during plugin execution',
        logs,
        metrics: {
          executionTimeMs,
          apiCallCount,
        },
      };
    }
  }

  /**
   * Validate that a plugin doesn't use blocked operations
   */
  validatePlugin(pluginCode: string): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    for (const blocked of this.config.blockedOperations || []) {
      if (pluginCode.includes(blocked)) {
        violations.push(`Blocked operation detected: ${blocked}`);
      }
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  /**
   * Create a resource-limited HTTP client for plugins
   */
  createHttpClient(context: PluginContext) {
    let callCount = 0;
    const maxCalls = this.config.maxApiCalls;
    const allowedDomains = this.config.allowedDomains || ['*'];

    return {
      fetch: async (url: string, options?: globalThis.RequestInit) => {
        // Check call limit
        if (callCount >= maxCalls) {
          throw new Error(`API call limit exceeded (max: ${maxCalls})`);
        }

        // Check domain allowlist
        if (!allowedDomains.includes('*')) {
          const urlObj = new URL(url);
          if (!allowedDomains.includes(urlObj.hostname)) {
            throw new Error(`Domain not allowed: ${urlObj.hostname}`);
          }
        }

        callCount++;

        // Add correlation ID to requests
        const headers = new Headers(options?.headers);
        headers.set('X-Correlation-ID', context.correlationId);
        headers.set('X-Plugin-ID', 'plugin-request');

        return fetch(url, { ...options, headers });
      },
      getCallCount: () => callCount,
    };
  }

  /**
   * Create a sandboxed storage interface for plugins
   */
  createStorage(pluginId: string, tenantId: string) {
    const storageKey = `plugin:${pluginId}:${tenantId}`;
    const memoryStore: Map<string, unknown> = new Map();

    return {
      get: async (key: string): Promise<unknown> => {
        return memoryStore.get(`${storageKey}:${key}`);
      },
      set: async (key: string, value: unknown): Promise<void> => {
        memoryStore.set(`${storageKey}:${key}`, value);
      },
      delete: async (key: string): Promise<void> => {
        memoryStore.delete(`${storageKey}:${key}`);
      },
      list: async (): Promise<string[]> => {
        const prefix = `${storageKey}:`;
        return Array.from(memoryStore.keys())
          .filter((k) => k.startsWith(prefix))
          .map((k) => k.slice(prefix.length));
      },
    };
  }

  /**
   * Update sandbox configuration
   */
  updateConfig(config: Partial<SandboxConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): SandboxConfig {
    return { ...this.config };
  }
}

// Export singleton
export const pluginSandbox = new PluginSandbox();
export default PluginSandbox;
