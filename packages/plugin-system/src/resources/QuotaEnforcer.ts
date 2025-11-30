import { PluginManifest } from '../types/plugin.js';
import { ResourceQuota } from '../security/PluginSecurity.js';

/**
 * Resource quota enforcement and monitoring
 */
export class QuotaEnforcer {
  private quotas = new Map<string, ResourceQuota>();
  private usage = new Map<string, ResourceUsageTracker>();
  private violations = new Map<string, QuotaViolation[]>();

  /**
   * Set quota for a plugin
   */
  setQuota(pluginId: string, quota: ResourceQuota): void {
    this.quotas.set(pluginId, quota);
    if (!this.usage.has(pluginId)) {
      this.usage.set(pluginId, {
        pluginId,
        memoryUsedMB: 0,
        cpuTimeMs: 0,
        storageUsedMB: 0,
        networkUsedMbps: 0,
        lastUpdated: new Date(),
      });
    }
  }

  /**
   * Get quota for a plugin
   */
  getQuota(pluginId: string): ResourceQuota | undefined {
    return this.quotas.get(pluginId);
  }

  /**
   * Update resource usage for a plugin
   */
  updateUsage(pluginId: string, usage: Partial<ResourceUsageTracker>): void {
    const current = this.usage.get(pluginId);
    if (!current) {
      return;
    }

    this.usage.set(pluginId, {
      ...current,
      ...usage,
      lastUpdated: new Date(),
    });

    // Check for violations
    this.checkQuotaViolations(pluginId);
  }

  /**
   * Get current usage for a plugin
   */
  getUsage(pluginId: string): ResourceUsageTracker | undefined {
    return this.usage.get(pluginId);
  }

  /**
   * Check if plugin is within quota
   */
  isWithinQuota(pluginId: string): boolean {
    const quota = this.quotas.get(pluginId);
    const usage = this.usage.get(pluginId);

    if (!quota || !usage) {
      return true;
    }

    return (
      usage.memoryUsedMB <= quota.maxMemoryMB &&
      usage.storageUsedMB <= quota.maxStorageMB &&
      usage.networkUsedMbps <= quota.maxNetworkMbps
    );
  }

  /**
   * Check for quota violations
   */
  private checkQuotaViolations(pluginId: string): void {
    const quota = this.quotas.get(pluginId);
    const usage = this.usage.get(pluginId);

    if (!quota || !usage) {
      return;
    }

    const violations: QuotaViolation[] = [];

    if (usage.memoryUsedMB > quota.maxMemoryMB) {
      violations.push({
        pluginId,
        type: 'memory',
        limit: quota.maxMemoryMB,
        actual: usage.memoryUsedMB,
        timestamp: new Date(),
        severity: usage.memoryUsedMB > quota.maxMemoryMB * 1.5 ? 'critical' : 'warning',
      });
    }

    if (usage.storageUsedMB > quota.maxStorageMB) {
      violations.push({
        pluginId,
        type: 'storage',
        limit: quota.maxStorageMB,
        actual: usage.storageUsedMB,
        timestamp: new Date(),
        severity: 'warning',
      });
    }

    if (usage.networkUsedMbps > quota.maxNetworkMbps) {
      violations.push({
        pluginId,
        type: 'network',
        limit: quota.maxNetworkMbps,
        actual: usage.networkUsedMbps,
        timestamp: new Date(),
        severity: 'warning',
      });
    }

    if (violations.length > 0) {
      this.violations.set(pluginId, violations);
    }
  }

  /**
   * Get quota violations for a plugin
   */
  getViolations(pluginId: string): QuotaViolation[] {
    return this.violations.get(pluginId) || [];
  }

  /**
   * Clear violations for a plugin
   */
  clearViolations(pluginId: string): void {
    this.violations.delete(pluginId);
  }

  /**
   * Get all plugins with violations
   */
  getPluginsWithViolations(): string[] {
    return Array.from(this.violations.keys());
  }

  /**
   * Clean up resources for a plugin
   */
  cleanup(pluginId: string): void {
    this.quotas.delete(pluginId);
    this.usage.delete(pluginId);
    this.violations.delete(pluginId);
  }
}

export interface ResourceUsageTracker {
  pluginId: string;
  memoryUsedMB: number;
  cpuTimeMs: number;
  storageUsedMB: number;
  networkUsedMbps: number;
  lastUpdated: Date;
}

export interface QuotaViolation {
  pluginId: string;
  type: 'memory' | 'cpu' | 'storage' | 'network';
  limit: number;
  actual: number;
  timestamp: Date;
  severity: 'warning' | 'critical';
}

/**
 * CPU time tracker for plugins
 */
export class CPUTimeTracker {
  private startTimes = new Map<string, bigint>();
  private totalTime = new Map<string, bigint>();

  /**
   * Start tracking CPU time for a plugin operation
   */
  start(pluginId: string, operationId: string): void {
    const key = `${pluginId}:${operationId}`;
    this.startTimes.set(key, process.hrtime.bigint());
  }

  /**
   * Stop tracking and record CPU time
   */
  stop(pluginId: string, operationId: string): number {
    const key = `${pluginId}:${operationId}`;
    const start = this.startTimes.get(key);

    if (!start) {
      return 0;
    }

    const elapsed = process.hrtime.bigint() - start;
    const currentTotal = this.totalTime.get(pluginId) || BigInt(0);
    this.totalTime.set(pluginId, currentTotal + elapsed);

    this.startTimes.delete(key);

    // Convert nanoseconds to milliseconds
    return Number(elapsed) / 1_000_000;
  }

  /**
   * Get total CPU time for a plugin in milliseconds
   */
  getTotalTime(pluginId: string): number {
    const total = this.totalTime.get(pluginId) || BigInt(0);
    return Number(total) / 1_000_000;
  }

  /**
   * Reset CPU time for a plugin
   */
  reset(pluginId: string): void {
    this.totalTime.delete(pluginId);
    // Clear any orphaned start times
    for (const key of this.startTimes.keys()) {
      if (key.startsWith(`${pluginId}:`)) {
        this.startTimes.delete(key);
      }
    }
  }
}
