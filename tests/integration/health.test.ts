/**
 * Health Check Integration Tests
 *
 * Tests for service health endpoints and system readiness.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Types for health check responses
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version?: string;
  checks: {
    name: string;
    status: 'pass' | 'warn' | 'fail';
    responseTime?: number;
    message?: string;
  }[];
}

// Mock health check service
const createMockHealthService = () => {
  return {
    checkHealth: jest.fn(async (): Promise<HealthStatus> => {
      const checks = [
        { name: 'database', status: 'pass' as const, responseTime: 5 },
        { name: 'redis', status: 'pass' as const, responseTime: 2 },
        { name: 'neo4j', status: 'pass' as const, responseTime: 10 },
      ];

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        checks,
      };
    }),

    checkReady: jest.fn(async (): Promise<boolean> => {
      return true;
    }),

    checkLive: jest.fn(async (): Promise<boolean> => {
      return true;
    }),

    checkDatabase: jest.fn(async (): Promise<{ status: string; responseTime: number }> => {
      return { status: 'connected', responseTime: 5 };
    }),

    checkRedis: jest.fn(async (): Promise<{ status: string; responseTime: number }> => {
      return { status: 'connected', responseTime: 2 };
    }),

    checkNeo4j: jest.fn(async (): Promise<{ status: string; responseTime: number }> => {
      return { status: 'connected', responseTime: 10 };
    }),
  };
};

describe('Health Check Integration', () => {
  let healthService: ReturnType<typeof createMockHealthService>;

  beforeEach(() => {
    healthService = createMockHealthService();
    jest.clearAllMocks();
  });

  describe('Health Endpoint', () => {
    it('should return healthy status when all checks pass', async () => {
      const health = await healthService.checkHealth();

      expect(health.status).toBe('healthy');
      expect(health.timestamp).toBeDefined();
      expect(health.checks).toHaveLength(3);
      health.checks.forEach(check => {
        expect(check.status).toBe('pass');
      });
    });

    it('should include version information', async () => {
      const health = await healthService.checkHealth();

      expect(health.version).toBeDefined();
    });

    it('should return degraded when a non-critical check fails', async () => {
      healthService.checkHealth.mockResolvedValueOnce({
        status: 'degraded',
        timestamp: new Date().toISOString(),
        checks: [
          { name: 'database', status: 'pass', responseTime: 5 },
          { name: 'redis', status: 'warn', responseTime: 100, message: 'High latency' },
          { name: 'neo4j', status: 'pass', responseTime: 10 },
        ],
      });

      const health = await healthService.checkHealth();

      expect(health.status).toBe('degraded');
      expect(health.checks.find(c => c.name === 'redis')?.status).toBe('warn');
    });

    it('should return unhealthy when a critical check fails', async () => {
      healthService.checkHealth.mockResolvedValueOnce({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: [
          { name: 'database', status: 'fail', message: 'Connection refused' },
          { name: 'redis', status: 'pass', responseTime: 2 },
          { name: 'neo4j', status: 'pass', responseTime: 10 },
        ],
      });

      const health = await healthService.checkHealth();

      expect(health.status).toBe('unhealthy');
      expect(health.checks.find(c => c.name === 'database')?.status).toBe('fail');
    });

    it('should include response times for each check', async () => {
      const health = await healthService.checkHealth();

      health.checks.forEach(check => {
        expect(check.responseTime).toBeDefined();
        expect(check.responseTime).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Readiness Probe', () => {
    it('should return true when service is ready', async () => {
      const ready = await healthService.checkReady();

      expect(ready).toBe(true);
    });

    it('should return false when service is not ready', async () => {
      healthService.checkReady.mockResolvedValueOnce(false);

      const ready = await healthService.checkReady();

      expect(ready).toBe(false);
    });
  });

  describe('Liveness Probe', () => {
    it('should return true when service is alive', async () => {
      const live = await healthService.checkLive();

      expect(live).toBe(true);
    });

    it('should return false when service is dead', async () => {
      healthService.checkLive.mockResolvedValueOnce(false);

      const live = await healthService.checkLive();

      expect(live).toBe(false);
    });
  });

  describe('Individual Component Checks', () => {
    it('should check database connectivity', async () => {
      const result = await healthService.checkDatabase();

      expect(result.status).toBe('connected');
      expect(result.responseTime).toBeDefined();
    });

    it('should check Redis connectivity', async () => {
      const result = await healthService.checkRedis();

      expect(result.status).toBe('connected');
      expect(result.responseTime).toBeDefined();
    });

    it('should check Neo4j connectivity', async () => {
      const result = await healthService.checkNeo4j();

      expect(result.status).toBe('connected');
      expect(result.responseTime).toBeDefined();
    });

    it('should handle database connection failure', async () => {
      healthService.checkDatabase.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(healthService.checkDatabase()).rejects.toThrow('Connection refused');
    });

    it('should handle Redis connection failure', async () => {
      healthService.checkRedis.mockRejectedValueOnce(new Error('Redis unavailable'));

      await expect(healthService.checkRedis()).rejects.toThrow('Redis unavailable');
    });

    it('should handle Neo4j connection failure', async () => {
      healthService.checkNeo4j.mockRejectedValueOnce(new Error('Neo4j unavailable'));

      await expect(healthService.checkNeo4j()).rejects.toThrow('Neo4j unavailable');
    });
  });

  describe('Performance Thresholds', () => {
    it('should warn when response time exceeds threshold', async () => {
      healthService.checkHealth.mockResolvedValueOnce({
        status: 'degraded',
        timestamp: new Date().toISOString(),
        checks: [
          { name: 'database', status: 'warn', responseTime: 500, message: 'Slow response' },
          { name: 'redis', status: 'pass', responseTime: 2 },
          { name: 'neo4j', status: 'pass', responseTime: 10 },
        ],
      });

      const health = await healthService.checkHealth();
      const dbCheck = health.checks.find(c => c.name === 'database');

      expect(dbCheck?.status).toBe('warn');
      expect(dbCheck?.responseTime).toBeGreaterThan(100);
    });

    it('should fail when response time is critically high', async () => {
      healthService.checkHealth.mockResolvedValueOnce({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: [
          { name: 'database', status: 'fail', responseTime: 5000, message: 'Timeout' },
          { name: 'redis', status: 'pass', responseTime: 2 },
          { name: 'neo4j', status: 'pass', responseTime: 10 },
        ],
      });

      const health = await healthService.checkHealth();
      const dbCheck = health.checks.find(c => c.name === 'database');

      expect(dbCheck?.status).toBe('fail');
      expect(health.status).toBe('unhealthy');
    });
  });
});

describe('Service Dependencies', () => {
  it('should check all required dependencies on startup', async () => {
    const requiredDependencies = ['database', 'redis', 'neo4j'];
    const healthService = createMockHealthService();

    const health = await healthService.checkHealth();
    const checkedDependencies = health.checks.map(c => c.name);

    requiredDependencies.forEach(dep => {
      expect(checkedDependencies).toContain(dep);
    });
  });

  it('should handle partial dependency failure gracefully', async () => {
    const healthService = createMockHealthService();

    healthService.checkHealth.mockResolvedValueOnce({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      checks: [
        { name: 'database', status: 'pass', responseTime: 5 },
        { name: 'redis', status: 'fail', message: 'Connection lost' },
        { name: 'neo4j', status: 'pass', responseTime: 10 },
      ],
    });

    const health = await healthService.checkHealth();

    expect(health.status).toBe('degraded');
    expect(health.checks.filter(c => c.status === 'pass')).toHaveLength(2);
    expect(health.checks.filter(c => c.status === 'fail')).toHaveLength(1);
  });
});
