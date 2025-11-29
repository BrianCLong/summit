/**
 * Tests for IntelGraph Rate Limit Middleware
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import Redis from 'ioredis';
import {
  createRateLimiter,
  createRateLimitMiddleware,
  createGraphQLRateLimitPlugin,
  metricsCollector,
  alerter,
  loadConfigFromEnv,
} from '@intelgraph/rate-limiter';

// Mock dependencies
jest.mock('ioredis');
jest.mock('@intelgraph/rate-limiter');
jest.mock('../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Rate Limit Configuration', () => {
  let mockRedisClient: jest.Mocked<Redis>;

  beforeEach(() => {
    mockRedisClient = {
      on: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
    } as any;

    (Redis as unknown as jest.Mock).mockImplementation(() => mockRedisClient);

    jest.clearAllMocks();
  });

  describe('Redis Client Initialization', () => {
    it('should initialize Redis client with default configuration', () => {
      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;
      delete process.env.REDIS_PASSWORD;
      delete process.env.REDIS_RATE_LIMIT_DB;

      // Re-require the module to trigger initialization
      jest.isolateModules(() => {
        require('../rateLimit.new.js');
      });

      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'localhost',
          port: 6379,
          db: 1,
          keyPrefix: 'intelgraph:ratelimit:',
        }),
      );
    });

    it('should initialize Redis client with environment configuration', () => {
      process.env.REDIS_HOST = 'redis.example.com';
      process.env.REDIS_PORT = '6380';
      process.env.REDIS_PASSWORD = 'secret123';
      process.env.REDIS_RATE_LIMIT_DB = '2';

      jest.isolateModules(() => {
        require('../rateLimit.new.js');
      });

      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'redis.example.com',
          port: 6380,
          password: 'secret123',
          db: 2,
          keyPrefix: 'intelgraph:ratelimit:',
        }),
      );

      // Clean up
      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;
      delete process.env.REDIS_PASSWORD;
      delete process.env.REDIS_RATE_LIMIT_DB;
    });

    it('should configure retry strategy with exponential backoff', () => {
      jest.isolateModules(() => {
        require('../rateLimit.new.js');
      });

      const config = (Redis as unknown as jest.Mock).mock.calls[0][0];
      const retryStrategy = config.retryStrategy;

      expect(retryStrategy(1)).toBe(50);
      expect(retryStrategy(2)).toBe(100);
      expect(retryStrategy(10)).toBe(500);
      expect(retryStrategy(50)).toBe(2000); // Max delay
    });

    it('should enable lazy connect', () => {
      jest.isolateModules(() => {
        require('../rateLimit.new.js');
      });

      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          lazyConnect: true,
        }),
      );
    });
  });

  describe('Rate Limiter Creation', () => {
    it('should create rate limiter with loaded configuration', () => {
      const mockConfig = {
        tiers: {
          free: { requestsPerMinute: 10 },
          premium: { requestsPerMinute: 100 },
        },
      };

      (loadConfigFromEnv as jest.Mock).mockReturnValue(mockConfig);

      jest.isolateModules(() => {
        const module = require('../rateLimit.new.js');
        expect(createRateLimiter).toHaveBeenCalled();
        expect(createRateLimiter).toHaveBeenCalledWith(
          expect.anything(),
          mockConfig,
        );
      });
    });
  });

  describe('Alert Configuration', () => {
    it('should configure alert handler for rate limit violations', () => {
      (alerter.onAlert as jest.Mock).mockImplementation(() => {});

      jest.isolateModules(() => {
        require('../rateLimit.new.js');
      });

      expect(alerter.onAlert).toHaveBeenCalled();
    });

    it('should log rate limit violations', async () => {
      let alertHandler: (violation: any) => Promise<void>;

      (alerter.onAlert as jest.Mock).mockImplementation((handler) => {
        alertHandler = handler;
      });

      jest.isolateModules(() => {
        require('../rateLimit.new.js');
      });

      const mockViolation = {
        identifier: 'user-123',
        endpoint: '/api/graphql',
        tier: 'free',
        attempted: 150,
        limit: 100,
      };

      const { logger } = require('../utils/logger.js');
      await alertHandler!(mockViolation);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Rate limit violation alert',
          identifier: 'user-123',
          endpoint: '/api/graphql',
        }),
      );
    });
  });

  describe('Middleware Configuration', () => {
    it('should create rate limit middleware with headers enabled', () => {
      (createRateLimitMiddleware as jest.Mock).mockReturnValue(jest.fn());

      jest.isolateModules(() => {
        require('../rateLimit.new.js');
      });

      expect(createRateLimitMiddleware).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          headers: true,
        }),
      );
    });

    it('should skip rate limiting for health check endpoints', () => {
      let skipFunction: (req: any) => Promise<boolean>;

      (createRateLimitMiddleware as jest.Mock).mockImplementation(
        (limiter, options) => {
          skipFunction = options.skip;
          return jest.fn();
        },
      );

      jest.isolateModules(() => {
        require('../rateLimit.new.js');
      });

      expect(skipFunction!({ path: '/health' })).resolves.toBe(true);
      expect(skipFunction!({ path: '/metrics' })).resolves.toBe(true);
    });

    it('should not skip rate limiting for API endpoints', () => {
      let skipFunction: (req: any) => Promise<boolean>;

      (createRateLimitMiddleware as jest.Mock).mockImplementation(
        (limiter, options) => {
          skipFunction = options.skip;
          return jest.fn();
        },
      );

      jest.isolateModules(() => {
        require('../rateLimit.new.js');
      });

      expect(skipFunction!({ path: '/api/graphql' })).resolves.toBe(false);
    });

    it('should skip rate limiting for internal service calls', () => {
      let skipFunction: (req: any) => Promise<boolean>;

      (createRateLimitMiddleware as jest.Mock).mockImplementation(
        (limiter, options) => {
          skipFunction = options.skip;
          return jest.fn();
        },
      );

      jest.isolateModules(() => {
        require('../rateLimit.new.js');
      });

      expect(
        skipFunction!({ path: '/api/data', isInternalCall: true }),
      ).resolves.toBe(true);
    });
  });

  describe('GraphQL Plugin Configuration', () => {
    it('should create GraphQL rate limit plugin with default complexity', () => {
      delete process.env.GRAPHQL_MAX_COMPLEXITY;

      jest.isolateModules(() => {
        require('../rateLimit.new.js');
      });

      expect(createGraphQLRateLimitPlugin).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          maxComplexity: 1000,
        }),
      );
    });

    it('should create GraphQL rate limit plugin with custom complexity', () => {
      process.env.GRAPHQL_MAX_COMPLEXITY = '5000';

      jest.isolateModules(() => {
        require('../rateLimit.new.js');
      });

      expect(createGraphQLRateLimitPlugin).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          maxComplexity: 5000,
        }),
      );

      delete process.env.GRAPHQL_MAX_COMPLEXITY;
    });
  });

  describe('Graceful Shutdown', () => {
    it('should handle SIGTERM gracefully', async () => {
      jest.isolateModules(() => {
        require('../rateLimit.new.js');
      });

      const { logger } = require('../utils/logger.js');

      // Trigger SIGTERM
      const sigtermHandlers = process.listeners('SIGTERM');
      const handler = sigtermHandlers[sigtermHandlers.length - 1] as () => void;

      if (handler) {
        await handler();
      }

      expect(logger.info).toHaveBeenCalledWith('Shutting down rate limiter...');
    });
  });
});
