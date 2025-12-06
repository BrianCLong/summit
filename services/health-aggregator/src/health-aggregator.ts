/**
 * Cross-System Health Checks and Status Reporting
 * Consolidated health check endpoints and dashboards that aggregate status
 * from CompanyOS, Switchboard, and Summit, with automated alerts for degradation.
 */

import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import pino from 'pino';
import cron from 'node-cron';
import { z } from 'zod';

// Health status enum
export const HealthStatusSchema = z.enum(['healthy', 'degraded', 'unhealthy', 'unknown']);
export type HealthStatus = z.infer<typeof HealthStatusSchema>;

// Component type
export const ComponentTypeSchema = z.enum([
  'api',
  'database',
  'cache',
  'queue',
  'service',
  'external',
  'storage',
  'gateway',
]);
export type ComponentType = z.infer<typeof ComponentTypeSchema>;

// System enum
export const SystemSchema = z.enum(['companyos', 'switchboard', 'summit', 'shared']);
export type System = z.infer<typeof SystemSchema>;

// Health check result
export const HealthCheckResultSchema = z.object({
  componentId: z.string(),
  componentName: z.string(),
  componentType: ComponentTypeSchema,
  system: SystemSchema,
  status: HealthStatusSchema,
  responseTimeMs: z.number(),
  message: z.string().optional(),
  details: z.record(z.unknown()).optional(),
  lastCheckedAt: z.date(),
  lastHealthyAt: z.date().optional(),
  consecutiveFailures: z.number().default(0),
  uptime: z.number().optional(), // Percentage
  metadata: z.record(z.unknown()).optional(),
});

export type HealthCheckResult = z.infer<typeof HealthCheckResultSchema>;

// Component configuration
export const ComponentConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: ComponentTypeSchema,
  system: SystemSchema,
  endpoint: z.string().url().optional(),
  healthPath: z.string().default('/healthz'),
  checkIntervalMs: z.number().int().min(1000).default(30000),
  timeoutMs: z.number().int().min(100).default(5000),
  retries: z.number().int().min(0).max(5).default(1),
  enabled: z.boolean().default(true),
  critical: z.boolean().default(false), // Affects overall system status
  thresholds: z.object({
    warningResponseTimeMs: z.number().default(1000),
    criticalResponseTimeMs: z.number().default(5000),
    unhealthyAfterFailures: z.number().default(3),
  }).optional(),
  customCheck: z.function().optional(), // Custom health check function
  tags: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(), // Other component IDs
});

export type ComponentConfig = z.infer<typeof ComponentConfigSchema>;

// System status
export interface SystemStatus {
  system: System;
  status: HealthStatus;
  components: HealthCheckResult[];
  healthyCount: number;
  degradedCount: number;
  unhealthyCount: number;
  lastUpdatedAt: Date;
}

// Aggregated status
export interface AggregatedStatus {
  overallStatus: HealthStatus;
  systems: SystemStatus[];
  totalComponents: number;
  healthyComponents: number;
  degradedComponents: number;
  unhealthyComponents: number;
  lastUpdatedAt: Date;
  uptimePercentage: number;
}

// Alert configuration
export const AlertConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean().default(true),
  conditions: z.object({
    status: z.array(HealthStatusSchema).optional(),
    systems: z.array(SystemSchema).optional(),
    componentTypes: z.array(ComponentTypeSchema).optional(),
    componentIds: z.array(z.string()).optional(),
    consecutiveFailures: z.number().int().optional(),
    responseTimeThresholdMs: z.number().optional(),
  }),
  channels: z.array(z.object({
    type: z.enum(['webhook', 'email', 'slack', 'pagerduty']),
    target: z.string(),
    config: z.record(z.unknown()).optional(),
  })),
  cooldownMs: z.number().int().default(300000), // 5 minutes
  severity: z.enum(['info', 'warning', 'critical']),
});

export type AlertConfig = z.infer<typeof AlertConfigSchema>;

// Alert event
export interface AlertEvent {
  id: string;
  alertConfigId: string;
  alertName: string;
  severity: AlertConfig['severity'];
  component: HealthCheckResult;
  message: string;
  triggeredAt: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

interface HealthAggregatorConfig {
  redis: Redis;
  logger?: pino.Logger;
  checkIntervalMs?: number;
  historyRetentionMs?: number;
}

type HealthAggregatorEvents = {
  'check:completed': [HealthCheckResult];
  'status:changed': [HealthCheckResult, HealthStatus, HealthStatus]; // component, oldStatus, newStatus
  'alert:triggered': [AlertEvent];
  'alert:resolved': [AlertEvent];
  'system:degraded': [System];
  'system:recovered': [System];
};

/**
 * Cross-System Health Aggregator
 */
export class HealthAggregator extends EventEmitter<HealthAggregatorEvents> {
  private redis: Redis;
  private logger: pino.Logger;
  private components: Map<string, ComponentConfig> = new Map();
  private results: Map<string, HealthCheckResult> = new Map();
  private alerts: Map<string, AlertConfig> = new Map();
  private alertCooldowns: Map<string, number> = new Map();
  private checkJobs: Map<string, cron.ScheduledTask> = new Map();
  private statusHistory: Map<string, { status: HealthStatus; timestamp: Date }[]> = new Map();

  private config: Required<Omit<HealthAggregatorConfig, 'redis'>>;

  constructor(config: HealthAggregatorConfig) {
    super();
    this.redis = config.redis;
    this.logger = config.logger || pino({ name: 'health-aggregator' });
    this.config = {
      checkIntervalMs: config.checkIntervalMs || 30000,
      historyRetentionMs: config.historyRetentionMs || 24 * 60 * 60 * 1000, // 24 hours
      logger: this.logger,
    };

    this.registerDefaultComponents();
  }

  /**
   * Register default components
   */
  private registerDefaultComponents(): void {
    const defaults: Omit<ComponentConfig, 'id'>[] = [
      // Summit components
      { name: 'Summit API', type: 'api', system: 'summit', endpoint: 'http://localhost:4000', healthPath: '/health' },
      { name: 'Summit GraphQL', type: 'api', system: 'summit', endpoint: 'http://localhost:4000', healthPath: '/graphql?query=%7B__typename%7D' },
      { name: 'PostgreSQL', type: 'database', system: 'shared', endpoint: 'http://localhost:8080', healthPath: '/', critical: true },
      { name: 'Redis', type: 'cache', system: 'shared', critical: true },
      { name: 'Neo4j', type: 'database', system: 'summit', endpoint: 'http://localhost:7474', healthPath: '/' },

      // CompanyOS components
      { name: 'CompanyOS API', type: 'api', system: 'companyos', endpoint: 'http://localhost:3000', healthPath: '/healthz' },
      { name: 'CompanyOS Policy', type: 'service', system: 'companyos', endpoint: 'http://localhost:8181', healthPath: '/health' },

      // Switchboard components
      { name: 'Switchboard Router', type: 'gateway', system: 'switchboard', endpoint: 'http://localhost:3001', healthPath: '/api/health' },
      { name: 'Kafka', type: 'queue', system: 'shared', endpoint: 'http://localhost:9092', critical: true },
    ];

    for (const component of defaults) {
      this.registerComponent({
        ...component,
        id: `${component.system}-${component.name.toLowerCase().replace(/\s+/g, '-')}`,
        enabled: true,
      });
    }
  }

  /**
   * Register a component for health monitoring
   */
  registerComponent(config: ComponentConfig): void {
    const validated = ComponentConfigSchema.parse(config);
    this.components.set(validated.id, validated);

    // Initialize result
    this.results.set(validated.id, {
      componentId: validated.id,
      componentName: validated.name,
      componentType: validated.type,
      system: validated.system,
      status: 'unknown',
      responseTimeMs: 0,
      lastCheckedAt: new Date(),
      consecutiveFailures: 0,
    });

    // Schedule check
    if (validated.enabled) {
      this.scheduleCheck(validated);
    }

    this.logger.info('Component registered', { componentId: validated.id, name: validated.name });
  }

  /**
   * Unregister a component
   */
  unregisterComponent(componentId: string): boolean {
    const job = this.checkJobs.get(componentId);
    if (job) {
      job.stop();
      this.checkJobs.delete(componentId);
    }

    this.results.delete(componentId);
    return this.components.delete(componentId);
  }

  /**
   * Register an alert configuration
   */
  registerAlert(config: AlertConfig): void {
    const validated = AlertConfigSchema.parse(config);
    this.alerts.set(validated.id, validated);
    this.logger.info('Alert registered', { alertId: validated.id, name: validated.name });
  }

  /**
   * Schedule health check
   */
  private scheduleCheck(config: ComponentConfig): void {
    const intervalMs = config.checkIntervalMs;
    const cronExpression = `*/${Math.max(1, Math.floor(intervalMs / 1000))} * * * * *`;

    // Run immediately
    this.checkComponent(config);

    const job = cron.schedule(cronExpression, () => {
      this.checkComponent(config);
    });

    this.checkJobs.set(config.id, job);
  }

  /**
   * Check a single component
   */
  async checkComponent(config: ComponentConfig): Promise<HealthCheckResult> {
    const startTime = performance.now();
    let status: HealthStatus = 'healthy';
    let message: string | undefined;
    let details: Record<string, unknown> | undefined;

    try {
      if (config.customCheck) {
        // Use custom check function
        const customResult = await config.customCheck();
        status = customResult.status;
        message = customResult.message;
        details = customResult.details;
      } else if (config.endpoint) {
        // HTTP health check
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

        try {
          const response = await fetch(`${config.endpoint}${config.healthPath}`, {
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (!response.ok) {
            status = 'unhealthy';
            message = `HTTP ${response.status}: ${response.statusText}`;
          }
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      } else if (config.type === 'cache' && config.name === 'Redis') {
        // Redis check
        const pong = await this.redis.ping();
        if (pong !== 'PONG') {
          status = 'unhealthy';
          message = 'Redis ping failed';
        }
      } else {
        status = 'unknown';
        message = 'No check method configured';
      }
    } catch (error) {
      status = 'unhealthy';
      message = (error as Error).message;
    }

    const responseTimeMs = performance.now() - startTime;

    // Apply thresholds
    if (status === 'healthy' && config.thresholds) {
      if (responseTimeMs > config.thresholds.criticalResponseTimeMs) {
        status = 'unhealthy';
        message = `Response time ${responseTimeMs.toFixed(0)}ms exceeds critical threshold`;
      } else if (responseTimeMs > config.thresholds.warningResponseTimeMs) {
        status = 'degraded';
        message = `Response time ${responseTimeMs.toFixed(0)}ms exceeds warning threshold`;
      }
    }

    // Get previous result
    const previous = this.results.get(config.id);
    const oldStatus = previous?.status || 'unknown';

    // Calculate consecutive failures
    let consecutiveFailures = 0;
    if (status === 'unhealthy') {
      consecutiveFailures = (previous?.consecutiveFailures || 0) + 1;
    }

    // Check unhealthy threshold
    if (config.thresholds?.unhealthyAfterFailures && consecutiveFailures >= config.thresholds.unhealthyAfterFailures) {
      status = 'unhealthy';
    }

    const result: HealthCheckResult = {
      componentId: config.id,
      componentName: config.name,
      componentType: config.type,
      system: config.system,
      status,
      responseTimeMs,
      message,
      details,
      lastCheckedAt: new Date(),
      lastHealthyAt: status === 'healthy' ? new Date() : previous?.lastHealthyAt,
      consecutiveFailures,
      metadata: { tags: config.tags },
    };

    // Store result
    this.results.set(config.id, result);

    // Store in Redis for distributed access
    await this.redis.set(
      `health:${config.id}`,
      JSON.stringify(result),
      'EX',
      Math.floor(config.checkIntervalMs / 1000) * 3
    );

    // Record history
    this.recordHistory(config.id, result);

    // Emit events
    this.emit('check:completed', result);

    if (oldStatus !== status) {
      this.emit('status:changed', result, oldStatus, status);
      this.logger.info('Component status changed', {
        componentId: config.id,
        oldStatus,
        newStatus: status,
      });
    }

    // Check alerts
    this.checkAlerts(result);

    return result;
  }

  /**
   * Record status history
   */
  private recordHistory(componentId: string, result: HealthCheckResult): void {
    if (!this.statusHistory.has(componentId)) {
      this.statusHistory.set(componentId, []);
    }

    const history = this.statusHistory.get(componentId)!;
    history.push({ status: result.status, timestamp: result.lastCheckedAt });

    // Trim old entries
    const cutoff = Date.now() - this.config.historyRetentionMs;
    while (history.length > 0 && history[0].timestamp.getTime() < cutoff) {
      history.shift();
    }
  }

  /**
   * Check alert conditions
   */
  private checkAlerts(result: HealthCheckResult): void {
    for (const [alertId, alert] of this.alerts) {
      if (!alert.enabled) continue;

      // Check cooldown
      const lastTriggered = this.alertCooldowns.get(alertId) || 0;
      if (Date.now() - lastTriggered < alert.cooldownMs) continue;

      // Check conditions
      if (!this.matchesAlertConditions(result, alert.conditions)) continue;

      // Trigger alert
      const event: AlertEvent = {
        id: randomUUID(),
        alertConfigId: alertId,
        alertName: alert.name,
        severity: alert.severity,
        component: result,
        message: `${result.componentName} is ${result.status}: ${result.message || 'No details'}`,
        triggeredAt: new Date(),
        resolved: false,
      };

      this.alertCooldowns.set(alertId, Date.now());
      this.emit('alert:triggered', event);
      this.logger.warn('Alert triggered', { alertId, componentId: result.componentId, status: result.status });

      // Send to channels
      this.sendAlertToChannels(event, alert.channels);
    }
  }

  /**
   * Check if result matches alert conditions
   */
  private matchesAlertConditions(
    result: HealthCheckResult,
    conditions: AlertConfig['conditions']
  ): boolean {
    if (conditions.status && !conditions.status.includes(result.status)) {
      return false;
    }

    if (conditions.systems && !conditions.systems.includes(result.system)) {
      return false;
    }

    if (conditions.componentTypes && !conditions.componentTypes.includes(result.componentType)) {
      return false;
    }

    if (conditions.componentIds && !conditions.componentIds.includes(result.componentId)) {
      return false;
    }

    if (conditions.consecutiveFailures && result.consecutiveFailures < conditions.consecutiveFailures) {
      return false;
    }

    if (conditions.responseTimeThresholdMs && result.responseTimeMs < conditions.responseTimeThresholdMs) {
      return false;
    }

    return true;
  }

  /**
   * Send alert to configured channels
   */
  private async sendAlertToChannels(
    event: AlertEvent,
    channels: AlertConfig['channels']
  ): Promise<void> {
    for (const channel of channels) {
      try {
        switch (channel.type) {
          case 'webhook':
            await fetch(channel.target, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(event),
            });
            break;

          case 'slack':
            await fetch(channel.target, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: `🚨 *${event.severity.toUpperCase()}*: ${event.message}`,
                attachments: [{
                  color: event.severity === 'critical' ? 'danger' : event.severity === 'warning' ? 'warning' : 'good',
                  fields: [
                    { title: 'Component', value: event.component.componentName, short: true },
                    { title: 'System', value: event.component.system, short: true },
                    { title: 'Status', value: event.component.status, short: true },
                    { title: 'Response Time', value: `${event.component.responseTimeMs.toFixed(0)}ms`, short: true },
                  ],
                }],
              }),
            });
            break;

          // Add more channel types as needed
        }
      } catch (error) {
        this.logger.error('Failed to send alert to channel', {
          channelType: channel.type,
          error: (error as Error).message,
        });
      }
    }
  }

  /**
   * Get status for a specific system
   */
  getSystemStatus(system: System): SystemStatus {
    const components = Array.from(this.results.values()).filter((r) => r.system === system);

    const healthyCount = components.filter((c) => c.status === 'healthy').length;
    const degradedCount = components.filter((c) => c.status === 'degraded').length;
    const unhealthyCount = components.filter((c) => c.status === 'unhealthy').length;

    let status: HealthStatus = 'healthy';
    if (unhealthyCount > 0) {
      // Check if any unhealthy component is critical
      const criticalUnhealthy = components.some((c) => {
        const config = this.components.get(c.componentId);
        return c.status === 'unhealthy' && config?.critical;
      });
      status = criticalUnhealthy ? 'unhealthy' : 'degraded';
    } else if (degradedCount > 0) {
      status = 'degraded';
    }

    return {
      system,
      status,
      components,
      healthyCount,
      degradedCount,
      unhealthyCount,
      lastUpdatedAt: new Date(),
    };
  }

  /**
   * Get aggregated status across all systems
   */
  getAggregatedStatus(): AggregatedStatus {
    const systems: SystemStatus[] = [
      this.getSystemStatus('summit'),
      this.getSystemStatus('companyos'),
      this.getSystemStatus('switchboard'),
      this.getSystemStatus('shared'),
    ];

    const allComponents = Array.from(this.results.values());
    const healthyComponents = allComponents.filter((c) => c.status === 'healthy').length;
    const degradedComponents = allComponents.filter((c) => c.status === 'degraded').length;
    const unhealthyComponents = allComponents.filter((c) => c.status === 'unhealthy').length;

    let overallStatus: HealthStatus = 'healthy';
    if (unhealthyComponents > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedComponents > 0) {
      overallStatus = 'degraded';
    }

    // Calculate uptime percentage
    let totalChecks = 0;
    let healthyChecks = 0;
    for (const [componentId, history] of this.statusHistory) {
      totalChecks += history.length;
      healthyChecks += history.filter((h) => h.status === 'healthy').length;
    }
    const uptimePercentage = totalChecks > 0 ? (healthyChecks / totalChecks) * 100 : 100;

    return {
      overallStatus,
      systems,
      totalComponents: allComponents.length,
      healthyComponents,
      degradedComponents,
      unhealthyComponents,
      lastUpdatedAt: new Date(),
      uptimePercentage,
    };
  }

  /**
   * Get component status
   */
  getComponentStatus(componentId: string): HealthCheckResult | undefined {
    return this.results.get(componentId);
  }

  /**
   * Get all component statuses
   */
  getAllComponentStatuses(): HealthCheckResult[] {
    return Array.from(this.results.values());
  }

  /**
   * Force check all components
   */
  async checkAll(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    for (const config of this.components.values()) {
      if (config.enabled) {
        const result = await this.checkComponent(config);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Get uptime history for a component
   */
  getUptimeHistory(componentId: string, hours = 24): { status: HealthStatus; timestamp: Date }[] {
    const history = this.statusHistory.get(componentId) || [];
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return history.filter((h) => h.timestamp.getTime() >= cutoff);
  }

  /**
   * Shutdown the aggregator
   */
  shutdown(): void {
    for (const job of this.checkJobs.values()) {
      job.stop();
    }
    this.checkJobs.clear();
    this.logger.info('Health aggregator shutdown');
  }
}
