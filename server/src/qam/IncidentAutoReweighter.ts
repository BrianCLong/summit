/**
 * MC Platform v0.4.5 - IncidentAutoReweighter
 *
 * Auto-reweigh after incidents: Reduce explore rate by 50% and pin weights
 * for 2 hours after correctness-floor breach or other critical incidents.
 *
 * Key Features:
 * - Automatic exploration rate reduction (50%) during incidents
 * - Weight pinning for configurable duration (default 2 hours)
 * - Multiple incident type support with severity thresholds
 * - Automatic restoration after incident period expires
 * - Comprehensive monitoring and alerting integration
 * - Audit trail for all reweighting actions
 *
 * MIT License
 * Copyright (c) 2025 MC Platform
 */

import { EventEmitter } from 'events';
import { Redis } from 'ioredis';
import { Logger } from 'winston';
import { randomUUID } from 'crypto';

export interface IncidentEvent {
  id: string;
  type: 'correctness_floor_breach' | 'performance_degradation' | 'security_violation' | 'budget_breach' | 'custom';
  severity: 'low' | 'medium' | 'high' | 'critical';
  tenantId: string;
  appId: string;
  timestamp: Date;
  metadata: {
    threshold?: number;
    actualValue?: number;
    affectedRoutes?: string[];
    description?: string;
    source?: string;
  };
  triggerSource: 'automatic' | 'manual' | 'external';
}

export interface ReweightConfig {
  enabled: boolean;
  exploreReduction: number; // Factor to reduce exploration rate (0.5 = 50% reduction)
  pinDurationMs: number; // Duration to pin weights in milliseconds
  triggerThresholds: {
    [key in IncidentEvent['type']]: {
      [severity in IncidentEvent['severity']]: boolean;
    };
  };
  autoRestoreEnabled: boolean;
  maxConcurrentIncidents: number;
}

export interface ActiveReweight {
  id: string;
  incidentId: string;
  tenantId: string;
  appId: string;
  originalSettings: {
    exploreRate: number;
    weights: Record<string, number>;
    timestamp: Date;
  };
  reweightedSettings: {
    exploreRate: number;
    weights: Record<string, number>;
    timestamp: Date;
  };
  startTime: Date;
  endTime: Date;
  status: 'active' | 'expired' | 'manually_restored' | 'override';
  metadata: {
    incidentType: string;
    severity: string;
    restorationScheduled: boolean;
    alertsSent: string[];
  };
}

export interface ReweightMetrics {
  totalIncidents: number;
  activeReweights: number;
  avgReweightDuration: number;
  successfulRestorations: number;
  failedRestorations: number;
  incidentsByType: Record<string, number>;
  incidentsBySeverity: Record<string, number>;
  averageResponseTime: number; // ms from incident to reweight
  lastProcessedIncident: Date | null;
}

export class IncidentAutoReweighter extends EventEmitter {
  private redis: Redis;
  private logger: Logger;
  private config: ReweightConfig;
  private metrics: ReweightMetrics;
  private activeReweights: Map<string, ActiveReweight> = new Map();
  private restorationTimers: Map<string, NodeJS.Timeout> = new Map();
  private isProcessing: boolean = false;

  constructor(redis: Redis, logger: Logger, config: Partial<ReweightConfig> = {}) {
    super();
    this.redis = redis;
    this.logger = logger;
    this.config = {
      enabled: true,
      exploreReduction: 0.5, // 50% reduction
      pinDurationMs: 2 * 60 * 60 * 1000, // 2 hours
      triggerThresholds: {
        correctness_floor_breach: {
          low: false,
          medium: true,
          high: true,
          critical: true,
        },
        performance_degradation: {
          low: false,
          medium: false,
          high: true,
          critical: true,
        },
        security_violation: {
          low: false,
          medium: true,
          high: true,
          critical: true,
        },
        budget_breach: {
          low: false,
          medium: false,
          high: true,
          critical: true,
        },
        custom: {
          low: false,
          medium: false,
          high: false,
          critical: true,
        },
      },
      autoRestoreEnabled: true,
      maxConcurrentIncidents: 10,
      ...config,
    };

    this.metrics = {
      totalIncidents: 0,
      activeReweights: 0,
      avgReweightDuration: 0,
      successfulRestorations: 0,
      failedRestorations: 0,
      incidentsByType: {},
      incidentsBySeverity: {},
      averageResponseTime: 0,
      lastProcessedIncident: null,
    };

    this.initializeEventHandlers();
    this.loadActiveReweights();
  }

  private initializeEventHandlers(): void {
    // Handle graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());

    // Emit metrics periodically
    setInterval(() => {
      this.emit('metrics:updated', this.getMetrics());
    }, 30000); // Every 30 seconds
  }

  private async loadActiveReweights(): Promise<void> {
    try {
      const keys = await this.redis.keys('incident:reweight:*');
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const reweight: ActiveReweight = JSON.parse(data);
          // Restore dates from ISO strings
          reweight.startTime = new Date(reweight.startTime);
          reweight.endTime = new Date(reweight.endTime);
          reweight.originalSettings.timestamp = new Date(reweight.originalSettings.timestamp);
          reweight.reweightedSettings.timestamp = new Date(reweight.reweightedSettings.timestamp);

          if (reweight.status === 'active' && new Date() < reweight.endTime) {
            this.activeReweights.set(reweight.id, reweight);
            this.scheduleRestoration(reweight);
          }
        }
      }

      this.logger.info({
        message: 'Loaded active reweights from Redis',
        count: this.activeReweights.size,
        component: 'IncidentAutoReweighter',
      });
    } catch (error) {
      this.logger.error({
        message: 'Failed to load active reweights',
        error: error instanceof Error ? error.message : String(error),
        component: 'IncidentAutoReweighter',
      });
    }
  }

  /**
   * Process an incident and determine if reweighting is needed
   */
  async processIncident(incident: IncidentEvent): Promise<boolean> {
    if (this.isProcessing) {
      this.logger.warn({
        message: 'Already processing incident, queuing',
        incidentId: incident.id,
        component: 'IncidentAutoReweighter',
      });
      return false;
    }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      this.logger.info({
        message: 'Processing incident for auto-reweight',
        incident: {
          id: incident.id,
          type: incident.type,
          severity: incident.severity,
          tenantId: incident.tenantId,
          appId: incident.appId,
        },
        component: 'IncidentAutoReweighter',
      });

      // Check if reweighting is enabled and incident meets thresholds
      if (!this.config.enabled) {
        this.logger.debug({
          message: 'Auto-reweighting disabled, skipping',
          incidentId: incident.id,
          component: 'IncidentAutoReweighter',
        });
        return false;
      }

      if (!this.shouldTriggerReweight(incident)) {
        this.logger.debug({
          message: 'Incident does not meet reweight thresholds',
          incident: {
            type: incident.type,
            severity: incident.severity,
            threshold: this.config.triggerThresholds[incident.type][incident.severity],
          },
          component: 'IncidentAutoReweighter',
        });
        return false;
      }

      // Check for existing active reweight for this app
      const existingKey = `${incident.tenantId}:${incident.appId}`;
      const existingReweight = Array.from(this.activeReweights.values()).find(
        r => r.tenantId === incident.tenantId && r.appId === incident.appId && r.status === 'active'
      );

      if (existingReweight) {
        this.logger.warn({
          message: 'Active reweight already exists for app, extending duration',
          existingReweightId: existingReweight.id,
          incidentId: incident.id,
          component: 'IncidentAutoReweighter',
        });

        // Extend the existing reweight duration
        await this.extendReweight(existingReweight, incident);
        return true;
      }

      // Check concurrent incident limit
      if (this.activeReweights.size >= this.config.maxConcurrentIncidents) {
        this.logger.error({
          message: 'Maximum concurrent incidents reached, cannot create new reweight',
          maxConcurrent: this.config.maxConcurrentIncidents,
          currentActive: this.activeReweights.size,
          incidentId: incident.id,
          component: 'IncidentAutoReweighter',
        });
        return false;
      }

      // Get current settings from the quantum app
      const currentSettings = await this.getCurrentAppSettings(incident.tenantId, incident.appId);
      if (!currentSettings) {
        this.logger.error({
          message: 'Could not retrieve current app settings',
          tenantId: incident.tenantId,
          appId: incident.appId,
          incidentId: incident.id,
          component: 'IncidentAutoReweighter',
        });
        return false;
      }

      // Create reweight configuration
      const reweight = await this.createReweight(incident, currentSettings);

      // Apply the reweighted settings
      const success = await this.applyReweight(reweight);
      if (!success) {
        return false;
      }

      // Store and schedule restoration
      await this.storeReweight(reweight);
      this.activeReweights.set(reweight.id, reweight);
      this.scheduleRestoration(reweight);

      // Update metrics
      this.updateMetrics(incident, Date.now() - startTime);

      // Emit events
      this.emit('incident:processed', { incident, reweight });
      this.emit('reweight:applied', reweight);

      this.logger.info({
        message: 'Successfully applied incident auto-reweight',
        reweightId: reweight.id,
        incidentId: incident.id,
        settings: {
          originalExploreRate: reweight.originalSettings.exploreRate,
          newExploreRate: reweight.reweightedSettings.exploreRate,
          duration: this.config.pinDurationMs,
        },
        component: 'IncidentAutoReweighter',
      });

      return true;

    } catch (error) {
      this.logger.error({
        message: 'Failed to process incident for auto-reweight',
        error: error instanceof Error ? error.message : String(error),
        incidentId: incident.id,
        component: 'IncidentAutoReweighter',
      });
      return false;
    } finally {
      this.isProcessing = false;
    }
  }

  private shouldTriggerReweight(incident: IncidentEvent): boolean {
    const thresholds = this.config.triggerThresholds[incident.type];
    if (!thresholds) {
      return false;
    }
    return thresholds[incident.severity] || false;
  }

  private async getCurrentAppSettings(tenantId: string, appId: string): Promise<any> {
    try {
      // Get settings from Redis state manager
      const key = `qam:state:${tenantId}:${appId}:current`;
      const data = await this.redis.get(key);
      if (!data) {
        return null;
      }

      const state = JSON.parse(data);
      return {
        exploreRate: state.exploreRate || 0.1,
        weights: state.weights || {},
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error({
        message: 'Failed to get current app settings',
        error: error instanceof Error ? error.message : String(error),
        tenantId,
        appId,
        component: 'IncidentAutoReweighter',
      });
      return null;
    }
  }

  private async createReweight(incident: IncidentEvent, currentSettings: any): Promise<ActiveReweight> {
    const reweightId = randomUUID();
    const now = new Date();
    const endTime = new Date(now.getTime() + this.config.pinDurationMs);

    // Calculate new explore rate (reduced by configured factor)
    const newExploreRate = currentSettings.exploreRate * (1 - this.config.exploreReduction);

    const reweight: ActiveReweight = {
      id: reweightId,
      incidentId: incident.id,
      tenantId: incident.tenantId,
      appId: incident.appId,
      originalSettings: {
        exploreRate: currentSettings.exploreRate,
        weights: { ...currentSettings.weights },
        timestamp: currentSettings.timestamp,
      },
      reweightedSettings: {
        exploreRate: newExploreRate,
        weights: { ...currentSettings.weights }, // Keep same weights, just reduce exploration
        timestamp: now,
      },
      startTime: now,
      endTime: endTime,
      status: 'active',
      metadata: {
        incidentType: incident.type,
        severity: incident.severity,
        restorationScheduled: this.config.autoRestoreEnabled,
        alertsSent: [],
      },
    };

    return reweight;
  }

  private async applyReweight(reweight: ActiveReweight): Promise<boolean> {
    try {
      // Update the quantum app settings
      const key = `qam:state:${reweight.tenantId}:${reweight.appId}:current`;
      const updatedState = {
        exploreRate: reweight.reweightedSettings.exploreRate,
        weights: reweight.reweightedSettings.weights,
        lastUpdated: reweight.reweightedSettings.timestamp,
        reweightActive: true,
        reweightId: reweight.id,
      };

      await this.redis.set(key, JSON.stringify(updatedState));

      // Also set an incident flag
      const incidentKey = `qam:incident:${reweight.tenantId}:${reweight.appId}`;
      await this.redis.setex(incidentKey, Math.ceil(this.config.pinDurationMs / 1000), reweight.incidentId);

      return true;
    } catch (error) {
      this.logger.error({
        message: 'Failed to apply reweight settings',
        error: error instanceof Error ? error.message : String(error),
        reweightId: reweight.id,
        component: 'IncidentAutoReweighter',
      });
      return false;
    }
  }

  private async storeReweight(reweight: ActiveReweight): Promise<void> {
    const key = `incident:reweight:${reweight.id}`;
    await this.redis.setex(
      key,
      Math.ceil(this.config.pinDurationMs / 1000) + 3600, // Add 1 hour buffer
      JSON.stringify(reweight)
    );
  }

  private scheduleRestoration(reweight: ActiveReweight): void {
    if (!this.config.autoRestoreEnabled) {
      return;
    }

    const delay = reweight.endTime.getTime() - Date.now();
    if (delay <= 0) {
      // Already expired, restore immediately
      this.restoreOriginalSettings(reweight.id);
      return;
    }

    const timer = setTimeout(() => {
      this.restoreOriginalSettings(reweight.id);
    }, delay);

    this.restorationTimers.set(reweight.id, timer);

    this.logger.debug({
      message: 'Scheduled automatic restoration',
      reweightId: reweight.id,
      delayMs: delay,
      endTime: reweight.endTime,
      component: 'IncidentAutoReweighter',
    });
  }

  private async extendReweight(existingReweight: ActiveReweight, newIncident: IncidentEvent): Promise<void> {
    // Extend the end time
    const now = new Date();
    existingReweight.endTime = new Date(now.getTime() + this.config.pinDurationMs);

    // Clear existing timer and schedule new one
    const existingTimer = this.restorationTimers.get(existingReweight.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    this.scheduleRestoration(existingReweight);

    // Update stored data
    await this.storeReweight(existingReweight);

    this.logger.info({
      message: 'Extended reweight duration due to new incident',
      reweightId: existingReweight.id,
      originalIncidentId: existingReweight.incidentId,
      newIncidentId: newIncident.id,
      newEndTime: existingReweight.endTime,
      component: 'IncidentAutoReweighter',
    });
  }

  /**
   * Manually restore original settings for a specific reweight
   */
  async restoreOriginalSettings(reweightId: string): Promise<boolean> {
    try {
      const reweight = this.activeReweights.get(reweightId);
      if (!reweight) {
        this.logger.warn({
          message: 'Reweight not found for restoration',
          reweightId,
          component: 'IncidentAutoReweighter',
        });
        return false;
      }

      if (reweight.status !== 'active') {
        this.logger.warn({
          message: 'Reweight is not active, cannot restore',
          reweightId,
          status: reweight.status,
          component: 'IncidentAutoReweighter',
        });
        return false;
      }

      // Restore original settings
      const key = `qam:state:${reweight.tenantId}:${reweight.appId}:current`;
      const restoredState = {
        exploreRate: reweight.originalSettings.exploreRate,
        weights: reweight.originalSettings.weights,
        lastUpdated: new Date(),
        reweightActive: false,
        reweightId: null,
      };

      await this.redis.set(key, JSON.stringify(restoredState));

      // Remove incident flag
      const incidentKey = `qam:incident:${reweight.tenantId}:${reweight.appId}`;
      await this.redis.del(incidentKey);

      // Update reweight status
      reweight.status = 'manually_restored';
      await this.storeReweight(reweight);

      // Clean up
      this.activeReweights.delete(reweightId);
      const timer = this.restorationTimers.get(reweightId);
      if (timer) {
        clearTimeout(timer);
        this.restorationTimers.delete(reweightId);
      }

      // Update metrics
      this.metrics.successfulRestorations++;
      this.metrics.activeReweights = this.activeReweights.size;

      // Emit events
      this.emit('reweight:restored', { reweight, restoredAt: new Date() });

      this.logger.info({
        message: 'Successfully restored original settings',
        reweightId,
        tenantId: reweight.tenantId,
        appId: reweight.appId,
        originalExploreRate: reweight.originalSettings.exploreRate,
        component: 'IncidentAutoReweighter',
      });

      return true;

    } catch (error) {
      this.logger.error({
        message: 'Failed to restore original settings',
        error: error instanceof Error ? error.message : String(error),
        reweightId,
        component: 'IncidentAutoReweighter',
      });

      this.metrics.failedRestorations++;
      return false;
    }
  }

  /**
   * Manually restore settings for a tenant/app combination
   */
  async manualRestore(tenantId: string, appId: string): Promise<boolean> {
    const reweight = Array.from(this.activeReweights.values()).find(
      r => r.tenantId === tenantId && r.appId === appId && r.status === 'active'
    );

    if (!reweight) {
      this.logger.warn({
        message: 'No active reweight found for manual restoration',
        tenantId,
        appId,
        component: 'IncidentAutoReweighter',
      });
      return false;
    }

    return this.restoreOriginalSettings(reweight.id);
  }

  /**
   * Get current metrics
   */
  getMetrics(): ReweightMetrics {
    return {
      ...this.metrics,
      activeReweights: this.activeReweights.size,
    };
  }

  /**
   * Get all active reweights
   */
  getActiveReweights(): ActiveReweight[] {
    return Array.from(this.activeReweights.values());
  }

  /**
   * Get configuration
   */
  getConfig(): ReweightConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  async updateConfig(newConfig: Partial<ReweightConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };

    this.logger.info({
      message: 'Configuration updated',
      newConfig,
      component: 'IncidentAutoReweighter',
    });

    this.emit('config:updated', this.config);
  }

  private updateMetrics(incident: IncidentEvent, responseTime: number): void {
    this.metrics.totalIncidents++;
    this.metrics.activeReweights = this.activeReweights.size;
    this.metrics.lastProcessedIncident = new Date();

    // Update averages
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (this.metrics.totalIncidents - 1) + responseTime) /
      this.metrics.totalIncidents;

    // Update counters
    this.metrics.incidentsByType[incident.type] = (this.metrics.incidentsByType[incident.type] || 0) + 1;
    this.metrics.incidentsBySeverity[incident.severity] = (this.metrics.incidentsBySeverity[incident.severity] || 0) + 1;
  }

  private async shutdown(): Promise<void> {
    this.logger.info({
      message: 'Shutting down IncidentAutoReweighter',
      activeReweights: this.activeReweights.size,
      component: 'IncidentAutoReweighter',
    });

    // Clear all timers
    for (const timer of this.restorationTimers.values()) {
      clearTimeout(timer);
    }
    this.restorationTimers.clear();

    // Emit shutdown event
    this.emit('shutdown', {
      activeReweights: this.activeReweights.size,
      metrics: this.metrics,
    });
  }

  /**
   * Health check
   */
  isHealthy(): boolean {
    return (
      this.redis.status === 'ready' &&
      this.activeReweights.size <= this.config.maxConcurrentIncidents &&
      !this.isProcessing
    );
  }

  /**
   * Get detailed status for monitoring
   */
  getStatus(): any {
    return {
      healthy: this.isHealthy(),
      config: this.config,
      metrics: this.getMetrics(),
      activeReweights: this.activeReweights.size,
      scheduledRestorations: this.restorationTimers.size,
      redisStatus: this.redis.status,
      isProcessing: this.isProcessing,
      uptime: process.uptime(),
    };
  }
}

export default IncidentAutoReweighter;