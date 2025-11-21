import { EventEmitter } from 'events';
import type { ComponentHealth, SystemHealth } from '../types/index.js';
import { logger } from '../utils/logger.js';

interface HealthCheckConfig {
  checkIntervalMs: number;
  unhealthyThreshold: number;
  degradedLatencyMs: number;
}

export class HealthManager extends EventEmitter {
  private config: HealthCheckConfig;
  private componentHealth: Map<string, ComponentHealth> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(config: HealthCheckConfig) {
    super();
    this.config = config;
    this.initializeComponents();
  }

  private initializeComponents(): void {
    const components = [
      'api-gateway', 'graph-api', 'copilot', 'neo4j', 'postgres',
      'redis', 'kafka', 'auth-service', 'analytics-engine'
    ];

    for (const component of components) {
      this.componentHealth.set(component, {
        component,
        status: 'healthy',
        latency: 0,
        lastCheck: new Date(),
        metrics: {},
      });
    }
  }

  start(): void {
    if (this.checkInterval) return;

    logger.info('Starting health monitoring');
    this.checkInterval = setInterval(
      () => this.runHealthChecks(),
      this.config.checkIntervalMs
    );
    this.runHealthChecks();
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('Health monitoring stopped');
    }
  }

  private async runHealthChecks(): Promise<void> {
    for (const [name, health] of this.componentHealth) {
      const previousStatus = health.status;
      await this.checkComponent(name);

      if (health.status !== previousStatus) {
        this.emit('health_change', { component: name, from: previousStatus, to: health.status });
        if (health.status === 'unhealthy') {
          this.emit('component_unhealthy', health);
        }
      }
    }
  }

  private async checkComponent(name: string): Promise<void> {
    const health = this.componentHealth.get(name);
    if (!health) return;

    const start = Date.now();
    try {
      // Simulated health check - in production, make actual HTTP/TCP checks
      const isHealthy = await this.simulateHealthCheck(name);
      const latency = Date.now() - start;

      health.latency = latency;
      health.lastCheck = new Date();
      health.metrics = {
        responseTime: latency,
        uptime: Math.random() * 99 + 1,
        errorRate: Math.random() * 0.5,
      };

      if (!isHealthy) {
        health.status = 'unhealthy';
      } else if (latency > this.config.degradedLatencyMs) {
        health.status = 'degraded';
      } else {
        health.status = 'healthy';
      }
    } catch (error) {
      health.status = 'unhealthy';
      health.lastCheck = new Date();
      logger.error(`Health check failed for ${name}`, { error });
    }
  }

  private async simulateHealthCheck(name: string): Promise<boolean> {
    // Simulated - 98% healthy
    return Math.random() > 0.02;
  }

  getSystemHealth(): SystemHealth {
    const components = Array.from(this.componentHealth.values());
    const unhealthyCount = components.filter(c => c.status === 'unhealthy').length;
    const degradedCount = components.filter(c => c.status === 'degraded').length;

    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyCount > 0) {
      overall = 'unhealthy';
    } else if (degradedCount > 0) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    return {
      overall,
      components,
      timestamp: new Date(),
    };
  }

  getComponentHealth(name: string): ComponentHealth | undefined {
    return this.componentHealth.get(name);
  }

  isSystemHealthy(): boolean {
    return this.getSystemHealth().overall === 'healthy';
  }
}
