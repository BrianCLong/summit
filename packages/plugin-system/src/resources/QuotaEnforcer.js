"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CPUTimeTracker = exports.QuotaEnforcer = void 0;
/**
 * Resource quota enforcement and monitoring
 */
class QuotaEnforcer {
    quotas = new Map();
    usage = new Map();
    violations = new Map();
    /**
     * Set quota for a plugin
     */
    setQuota(pluginId, quota) {
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
    getQuota(pluginId) {
        return this.quotas.get(pluginId);
    }
    /**
     * Update resource usage for a plugin
     */
    updateUsage(pluginId, usage) {
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
    getUsage(pluginId) {
        return this.usage.get(pluginId);
    }
    /**
     * Check if plugin is within quota
     */
    isWithinQuota(pluginId) {
        const quota = this.quotas.get(pluginId);
        const usage = this.usage.get(pluginId);
        if (!quota || !usage) {
            return true;
        }
        return (usage.memoryUsedMB <= quota.maxMemoryMB &&
            usage.storageUsedMB <= quota.maxStorageMB &&
            usage.networkUsedMbps <= quota.maxNetworkMbps);
    }
    /**
     * Check for quota violations
     */
    checkQuotaViolations(pluginId) {
        const quota = this.quotas.get(pluginId);
        const usage = this.usage.get(pluginId);
        if (!quota || !usage) {
            return;
        }
        const violations = [];
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
    getViolations(pluginId) {
        return this.violations.get(pluginId) || [];
    }
    /**
     * Clear violations for a plugin
     */
    clearViolations(pluginId) {
        this.violations.delete(pluginId);
    }
    /**
     * Get all plugins with violations
     */
    getPluginsWithViolations() {
        return Array.from(this.violations.keys());
    }
    /**
     * Clean up resources for a plugin
     */
    cleanup(pluginId) {
        this.quotas.delete(pluginId);
        this.usage.delete(pluginId);
        this.violations.delete(pluginId);
    }
}
exports.QuotaEnforcer = QuotaEnforcer;
/**
 * CPU time tracker for plugins
 */
class CPUTimeTracker {
    startTimes = new Map();
    totalTime = new Map();
    /**
     * Start tracking CPU time for a plugin operation
     */
    start(pluginId, operationId) {
        const key = `${pluginId}:${operationId}`;
        this.startTimes.set(key, process.hrtime.bigint());
    }
    /**
     * Stop tracking and record CPU time
     */
    stop(pluginId, operationId) {
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
    getTotalTime(pluginId) {
        const total = this.totalTime.get(pluginId) || BigInt(0);
        return Number(total) / 1_000_000;
    }
    /**
     * Reset CPU time for a plugin
     */
    reset(pluginId) {
        this.totalTime.delete(pluginId);
        // Clear any orphaned start times
        for (const key of this.startTimes.keys()) {
            if (key.startsWith(`${pluginId}:`)) {
                this.startTimes.delete(key);
            }
        }
    }
}
exports.CPUTimeTracker = CPUTimeTracker;
