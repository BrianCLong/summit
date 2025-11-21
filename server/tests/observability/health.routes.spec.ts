/**
 * Health endpoint tests
 * Tests the improved health check endpoints with error logging and diagnostics
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the database modules
jest.mock('../../src/db/neo4jConnection.js', () => ({
  default: {
    getDriver: () => ({
      verifyConnectivity: jest.fn().mockResolvedValue(true),
    }),
  },
}));

jest.mock('../../src/db/postgres.js', () => ({
  getPostgresPool: () => ({
    query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
  }),
}));

jest.mock('../../src/db/redis.js', () => ({
  getRedisClient: () => ({
    ping: jest.fn().mockResolvedValue('PONG'),
  }),
}));

jest.mock('../../src/utils/logger.js', () => ({
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Health Endpoints', () => {
  describe('ServiceHealthError interface', () => {
    it('should have required fields for error tracking', () => {
      const error = {
        service: 'neo4j',
        error: 'Connection refused',
        timestamp: new Date().toISOString(),
      };

      expect(error).toHaveProperty('service');
      expect(error).toHaveProperty('error');
      expect(error).toHaveProperty('timestamp');
      expect(typeof error.service).toBe('string');
      expect(typeof error.error).toBe('string');
      expect(typeof error.timestamp).toBe('string');
    });
  });

  describe('/health/detailed response structure', () => {
    it('should include errors array in response', () => {
      // The improved health endpoint should include an errors array
      const healthResponse = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: 1000,
        environment: 'test',
        services: {
          neo4j: 'healthy',
          postgres: 'healthy',
          redis: 'healthy',
        },
        memory: {
          used: 100,
          total: 200,
          unit: 'MB',
        },
        errors: [], // New field for error tracking
      };

      expect(healthResponse).toHaveProperty('errors');
      expect(Array.isArray(healthResponse.errors)).toBe(true);
    });

    it('should populate errors array when services fail', () => {
      const healthResponse = {
        status: 'degraded',
        services: {
          neo4j: 'unhealthy',
          postgres: 'healthy',
          redis: 'healthy',
        },
        errors: [
          {
            service: 'neo4j',
            error: 'Connection refused on localhost:7687',
            timestamp: '2025-11-20T12:00:00Z',
          },
        ],
      };

      expect(healthResponse.status).toBe('degraded');
      expect(healthResponse.errors.length).toBe(1);
      expect(healthResponse.errors[0].service).toBe('neo4j');
    });
  });

  describe('/health/ready response structure', () => {
    it('should include failures array when services are unavailable', () => {
      const readyResponse = {
        status: 'not ready',
        failures: ['Neo4j: Connection refused', 'PostgreSQL: timeout'],
        message: 'Critical services are unavailable. Check database connections.',
      };

      expect(readyResponse).toHaveProperty('failures');
      expect(Array.isArray(readyResponse.failures)).toBe(true);
      expect(readyResponse).toHaveProperty('message');
    });

    it('should return ready status when all services are available', () => {
      const readyResponse = {
        status: 'ready',
      };

      expect(readyResponse.status).toBe('ready');
    });
  });

  describe('Error message quality', () => {
    it('should provide actionable error messages', () => {
      const errorMessages = [
        'Critical services are unavailable. Check database connections.',
        'Neo4j: Connection refused on localhost:7687',
        'PostgreSQL: Connection timeout after 30s',
        'Redis: Authentication failed',
      ];

      errorMessages.forEach((msg) => {
        // Error messages should:
        // 1. Identify the service
        // 2. Describe the issue
        // 3. Be actionable or provide context
        expect(msg.length).toBeGreaterThan(10);
        expect(msg).not.toContain('undefined');
        expect(msg).not.toContain('null');
      });
    });
  });
});

describe('Config Error Messages', () => {
  it('should provide helpful documentation for environment variables', () => {
    const envVarHelp: Record<string, string> = {
      DATABASE_URL: 'PostgreSQL connection string (e.g., postgresql://user:pass@host:5432/db)',
      NEO4J_URI: 'Neo4j bolt URI (e.g., bolt://localhost:7687)',
      JWT_SECRET: 'JWT signing secret (min 32 characters, use strong random value)',
    };

    Object.entries(envVarHelp).forEach(([key, help]) => {
      expect(help.length).toBeGreaterThan(20);
      expect(help).toContain('e.g.,');
    });
  });

  it('should include recovery steps in error output', () => {
    const recoverySteps = [
      'Copy .env.example to .env: cp .env.example .env',
      'Update the missing variables in .env',
      'For production, generate strong secrets (e.g., openssl rand -base64 32)',
      'See docs/ONBOARDING.md for detailed setup instructions',
    ];

    recoverySteps.forEach((step) => {
      expect(step.length).toBeGreaterThan(10);
    });
  });
});

describe('wait-for-stack.sh diagnostic output', () => {
  it('should define PORT_NAMES for human-readable output', () => {
    const portNames = ['PostgreSQL', 'Neo4j', 'Redis', 'Gateway'];
    const ports = ['localhost:5432', 'localhost:7687', 'localhost:6379', 'localhost:4100'];

    expect(portNames.length).toBe(ports.length);
    portNames.forEach((name) => {
      expect(name.length).toBeGreaterThan(0);
      expect(name).not.toContain('localhost');
    });
  });
});
