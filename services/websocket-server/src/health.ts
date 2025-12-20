/**
 * Health Check Implementation
 */

import Redis from 'ioredis';
import { HealthStatus } from './types/index.js';
import { ConnectionManager } from './managers/ConnectionManager.js';
import { logger } from './utils/logger.js';

export class HealthChecker {
  private redis: Redis;
  private connectionManager: ConnectionManager;
  private startTime: number;

  constructor(redis: Redis, connectionManager: ConnectionManager) {
    this.redis = redis;
    this.connectionManager = connectionManager;
    this.startTime = Date.now();
  }

  async check(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkRedis(),
      this.checkMemory(),
      this.checkConnections(),
    ]);

    const redisCheck = checks[0].status === 'fulfilled' ? checks[0].value : null;
    const memoryCheck = checks[1].status === 'fulfilled' ? checks[1].value : null;
    const connectionsCheck = checks[2].status === 'fulfilled' ? checks[2].value : null;

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (!redisCheck?.connected) {
      status = 'unhealthy';
    } else if (memoryCheck && memoryCheck.percentage > 90) {
      status = 'degraded';
    }

    return {
      status,
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      connections: connectionsCheck || {
        total: 0,
        byTenant: {},
      },
      redis: redisCheck || {
        connected: false,
      },
      memory: memoryCheck || {
        used: 0,
        total: 0,
        percentage: 0,
      },
    };
  }

  private async checkRedis(): Promise<{
    connected: boolean;
    latency?: number;
  }> {
    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;

      return {
        connected: true,
        latency,
      };
    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Redis health check failed');
      return {
        connected: false,
      };
    }
  }

  private checkMemory(): {
    used: number;
    total: number;
    percentage: number;
  } {
    const usage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const usedMemory = usage.heapUsed;
    const percentage = (usedMemory / totalMemory) * 100;

    return {
      used: usedMemory,
      total: totalMemory,
      percentage,
    };
  }

  private checkConnections(): {
    total: number;
    byTenant: Record<string, number>;
  } {
    return {
      total: this.connectionManager.getTotalConnections(),
      byTenant: this.connectionManager.getConnectionsByTenant(),
    };
  }
}
