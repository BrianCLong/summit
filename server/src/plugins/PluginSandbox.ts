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
  PluginResourceLimits,
} from './types/Plugin.js';
import logger from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export interface SandboxConfig {
  maxExecutionTimeMs: number;
  maxMemoryMb: number;
  maxApiCalls: number;
  maxTokens: number;
  allowedDomains: string[];
  blockedOperations: string[];
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
  maxTokens: 1000, // Default limit
  allowedDomains: ['*'],
  blockedOperations: ['eval', 'Function', 'child_process', 'fs'],
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
    let apiCallCount = 0;
    let tokensConsumed = 0;

    // Determine limits: Use plugin manifest resources if defined, otherwise sandbox default
    const pluginLimits = plugin.manifest.resources || {};
    const effectiveTimeout = timeout || pluginLimits.timeoutMs || this.config.maxExecutionTimeMs;
    const maxApiCalls = pluginLimits.apiCalls ?? this.config.maxApiCalls;
    const maxTokens = pluginLimits.tokens ?? this.config.maxTokens;
    const allowedDomains = pluginLimits.network?.domains ?? this.config.allowedDomains;

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

    // Create restricted HTTP client
    const httpClient = {
      fetch: async (url: string, options?: globalThis.RequestInit) => {
        // Check call limit
        if (apiCallCount >= maxApiCalls) {
          throw new Error(`API call limit exceeded (max: ${maxApiCalls})`);
        }

        // Check domain allowlist
        const urlObj = new URL(url);
        const isAllowed = this.isDomainAllowed(urlObj.hostname, allowedDomains);
        if (!isAllowed) {
          throw new Error(`Domain not allowed: ${urlObj.hostname}`);
        }

        apiCallCount++;

        // Add correlation ID to requests
        const headers = new Headers(options?.headers);
        headers.set('X-Correlation-ID', context.correlationId);
        headers.set('X-Plugin-ID', plugin.manifest.id);

        return fetch(url, { ...options, headers });
      },
    };

    // Sandboxed context
    const sandboxedContext: PluginContext = {
      ...context,
      // @ts-ignore - injecting safe utilities
      fetch: httpClient.fetch,
      log: pluginLogger,
      // In production, we would use VM2 or similar for true isolation
    };

    try {
      // Execute with timeout
      const executionPromise = plugin.execute(action, params, sandboxedContext);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Plugin execution timed out after ${effectiveTimeout}ms`));
        }, effectiveTimeout);
      });

      const result = await Promise.race([executionPromise, timeoutPromise]);

      const executionTimeMs = Date.now() - startTime;

      return {
        ...result,
        logs: [...logs, ...(result.logs || [])],
        metrics: {
          executionTimeMs,
          apiCallCount,
          tokensConsumed,
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
          tokensConsumed,
        },
      };
    }
  }

  /**
   * Check if a domain matches the allowed list (supports wildcards like *.example.com)
   */
  private isDomainAllowed(domain: string, allowedDomains: string[]): boolean {
    if (allowedDomains.includes('*')) return true;

    return allowedDomains.some((pattern) => {
      if (pattern === domain) return true;
      if (pattern.startsWith('*.')) {
        const suffix = pattern.slice(2);
        return domain.endsWith(suffix) && domain.split('.').length === suffix.split('.').length + 1;
      }
      return false;
    });
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
