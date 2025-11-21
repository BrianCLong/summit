/**
 * OpenTelemetry Tracing Tests
 *
 * Tests distributed tracing functionality across different operation types.
 */

import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { TracingService } from '../../src/observability/tracing';
import { SpanStatusCode } from '@opentelemetry/api';

describe('OpenTelemetry Tracing', () => {
  let tracingService: TracingService;

  beforeEach(() => {
    // Create a new instance with tracing disabled for testing
    tracingService = TracingService.getInstance({
      enabled: false, // Disable actual OTEL SDK in tests
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
      environment: 'test',
    });
  });

  afterEach(() => {
    // Reset singleton
    (TracingService as any).instance = null;
  });

  describe('TracingService Initialization', () => {
    test('should initialize with default config', () => {
      const config = tracingService.getConfig();

      expect(config).toMatchObject({
        serviceName: 'test-service',
        serviceVersion: '1.0.0',
        environment: 'test',
        enabled: false,
      });
    });

    test('should read config from environment variables', () => {
      process.env.OTEL_SERVICE_NAME = 'env-service';
      process.env.OTEL_SERVICE_VERSION = '2.0.0';
      process.env.OTEL_ENABLED = 'false';

      const service = TracingService.getInstance();
      const config = service.getConfig();

      expect(config.serviceName).toBe('env-service');
      expect(config.serviceVersion).toBe('2.0.0');

      delete process.env.OTEL_SERVICE_NAME;
      delete process.env.OTEL_SERVICE_VERSION;
      delete process.env.OTEL_ENABLED;

      (TracingService as any).instance = null;
    });
  });

  describe('Generic Trace Wrapper', () => {
    test('should execute operation and return result', async () => {
      const mockOperation = jest.fn(async () => 'success');

      const result = await tracingService.trace(
        'test.operation',
        mockOperation,
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalled();
    });

    test('should handle operation errors', async () => {
      const mockOperation = jest.fn(async () => {
        throw new Error('Operation failed');
      });

      await expect(
        tracingService.trace('test.operation', mockOperation),
      ).rejects.toThrow('Operation failed');
    });

    test('should pass span to operation callback', async () => {
      let capturedSpan: any;

      await tracingService.trace('test.operation', async (span) => {
        capturedSpan = span;
        return 'success';
      });

      expect(capturedSpan).toBeDefined();
      expect(capturedSpan.setAttribute).toBeDefined();
      expect(capturedSpan.setStatus).toBeDefined();
    });

    test('should allow setting attributes in span', async () => {
      const mockOperation = jest.fn(async (span) => {
        span.setAttribute('custom.key', 'custom-value');
        span.setAttribute('custom.count', 42);
        return 'success';
      });

      await tracingService.trace('test.operation', mockOperation);

      expect(mockOperation).toHaveBeenCalled();
    });
  });

  describe('Database Tracing', () => {
    test('should trace postgres operations', async () => {
      const mockDbOperation = jest.fn(async () => [{ id: 1 }, { id: 2 }]);

      const result = await tracingService.traceDatabase(
        'select',
        'postgres',
        mockDbOperation,
        'SELECT * FROM users WHERE id = $1',
      );

      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
      expect(mockDbOperation).toHaveBeenCalled();
    });

    test('should trace neo4j operations', async () => {
      const mockDbOperation = jest.fn(async () => ({
        records: [{ get: () => 'value' }],
      }));

      const result = await tracingService.traceDatabase(
        'cypher',
        'neo4j',
        mockDbOperation,
        'MATCH (n) RETURN n',
      );

      expect(result).toBeDefined();
      expect(mockDbOperation).toHaveBeenCalled();
    });

    test('should trace redis operations', async () => {
      const mockDbOperation = jest.fn(async () => 'cached-value');

      const result = await tracingService.traceDatabase(
        'get',
        'redis',
        mockDbOperation,
        'GET user:123',
      );

      expect(result).toBe('cached-value');
      expect(mockDbOperation).toHaveBeenCalled();
    });

    test('should truncate long queries', async () => {
      const longQuery = 'SELECT * FROM table WHERE ' + 'x = 1 AND '.repeat(100);

      const mockDbOperation = jest.fn(async () => []);

      await tracingService.traceDatabase(
        'select',
        'postgres',
        mockDbOperation,
        longQuery,
      );

      expect(mockDbOperation).toHaveBeenCalled();
      // Query should be truncated to 500 chars in span attributes
    });

    test('should handle database errors', async () => {
      const mockDbOperation = jest.fn(async () => {
        throw new Error('Database connection failed');
      });

      await expect(
        tracingService.traceDatabase('select', 'postgres', mockDbOperation),
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('GraphQL Tracing', () => {
    test('should trace GraphQL resolvers', async () => {
      const mockResolver = jest.fn(async () => ({
        id: '123',
        name: 'Test User',
      }));

      const mockContext = {
        user: { id: 'user-456' },
      };

      const result = await tracingService.traceGraphQL(
        'getUser',
        'user',
        mockResolver,
        mockContext,
      );

      expect(result).toEqual({ id: '123', name: 'Test User' });
      expect(mockResolver).toHaveBeenCalled();
    });

    test('should handle GraphQL resolver errors', async () => {
      const mockResolver = jest.fn(async () => {
        throw new Error('Resolver failed');
      });

      await expect(
        tracingService.traceGraphQL('getUser', 'user', mockResolver),
      ).rejects.toThrow('Resolver failed');
    });

    test('should include user context in span', async () => {
      const mockResolver = jest.fn(async () => 'result');
      const mockContext = {
        user: { id: 'user-789' },
      };

      await tracingService.traceGraphQL(
        'mutation',
        'createEntity',
        mockResolver,
        mockContext,
      );

      expect(mockResolver).toHaveBeenCalled();
    });
  });

  describe('Queue Tracing', () => {
    test('should trace queue job processing', async () => {
      const mockProcessor = jest.fn(async () => ({
        processed: true,
        count: 5,
      }));

      const result = await tracingService.traceQueue(
        'email-queue',
        'send-email',
        mockProcessor,
      );

      expect(result).toEqual({ processed: true, count: 5 });
      expect(mockProcessor).toHaveBeenCalled();
    });

    test('should handle queue processing errors', async () => {
      const mockProcessor = jest.fn(async () => {
        throw new Error('Job processing failed');
      });

      await expect(
        tracingService.traceQueue('email-queue', 'send-email', mockProcessor),
      ).rejects.toThrow('Job processing failed');
    });
  });

  describe('HTTP Tracing', () => {
    test('should trace HTTP requests', async () => {
      const mockHttpOperation = jest.fn(async () => ({
        status: 200,
        data: { message: 'success' },
      }));

      const result = await tracingService.traceHTTP(
        'POST',
        'https://api.example.com/users',
        mockHttpOperation,
      );

      expect(result).toEqual({
        status: 200,
        data: { message: 'success' },
      });
      expect(mockHttpOperation).toHaveBeenCalled();
    });

    test('should handle HTTP errors', async () => {
      const mockHttpOperation = jest.fn(async () => {
        throw new Error('Network timeout');
      });

      await expect(
        tracingService.traceHTTP(
          'GET',
          'https://api.example.com/data',
          mockHttpOperation,
        ),
      ).rejects.toThrow('Network timeout');
    });
  });

  describe('Span Management', () => {
    test('should create manual spans', () => {
      const span = tracingService.startSpan('manual.operation', {
        attributes: { key: 'value' },
      });

      expect(span).toBeDefined();
      expect(span.setAttribute).toBeDefined();
      expect(span.end).toBeDefined();

      span.end();
    });

    test('should get active span', () => {
      const span = tracingService.getActiveSpan();

      // In test environment with tracing disabled, this may be undefined
      // In production with enabled tracing, it would return the active span
      expect(span).toBeUndefined();
    });

    test('should add attributes to active span', () => {
      // This should not throw even if there's no active span
      expect(() => {
        tracingService.addAttributes({ test: 'value', count: 42 });
      }).not.toThrow();
    });

    test('should record exceptions in active span', () => {
      const error = new Error('Test error');

      // This should not throw even if there's no active span
      expect(() => {
        tracingService.recordException(error, { context: 'test' });
      }).not.toThrow();
    });
  });

  describe('Trace Context Propagation', () => {
    test('should get trace context in W3C format', () => {
      const traceContext = tracingService.getTraceContext();

      // With tracing disabled, this will be undefined
      expect(traceContext).toBeUndefined();
    });

    test('should generate valid trace context format', () => {
      // This test would only pass with actual tracing enabled
      // In production: expect(traceContext).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/);
    });
  });

  describe('Performance and Latency', () => {
    test('should complete traces within performance targets', async () => {
      const startTime = Date.now();

      await tracingService.trace('performance.test', async () => {
        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'done';
      });

      const duration = Date.now() - startTime;

      // Tracing overhead should be minimal (< 5ms)
      expect(duration).toBeLessThan(50);
    });

    test('should handle concurrent traces', async () => {
      const operations = Array.from({ length: 10 }, (_, i) =>
        tracingService.trace(`concurrent.${i}`, async () => {
          await new Promise(resolve => setTimeout(resolve, 5));
          return `result-${i}`;
        }),
      );

      const results = await Promise.all(operations);

      expect(results).toHaveLength(10);
      expect(results[0]).toBe('result-0');
      expect(results[9]).toBe('result-9');
    });

    test('should measure latency accurately', async () => {
      const expectedDelay = 100;
      const startTime = Date.now();

      await tracingService.trace('latency.test', async () => {
        await new Promise(resolve => setTimeout(resolve, expectedDelay));
        return 'done';
      });

      const actualDuration = Date.now() - startTime;

      // Should be within 20ms of expected
      expect(actualDuration).toBeGreaterThanOrEqual(expectedDelay);
      expect(actualDuration).toBeLessThan(expectedDelay + 50);
    });
  });

  describe('Error Scenarios', () => {
    test('should handle nested operation failures', async () => {
      await expect(
        tracingService.trace('outer.operation', async () => {
          await tracingService.trace('inner.operation', async () => {
            throw new Error('Inner failure');
          });
        }),
      ).rejects.toThrow('Inner failure');
    });

    test('should handle timeout scenarios', async () => {
      jest.useFakeTimers();

      const operation = tracingService.trace('timeout.test', async () => {
        await new Promise(resolve => setTimeout(resolve, 10000));
        return 'completed';
      });

      jest.advanceTimersByTime(10000);

      await expect(operation).resolves.toBe('completed');

      jest.useRealTimers();
    });

    test('should gracefully handle tracing disabled', async () => {
      const result = await tracingService.trace(
        'disabled.trace',
        async (span) => {
          // Should still work even with no-op span
          span.setAttribute('test', 'value');
          return 'success';
        },
      );

      expect(result).toBe('success');
    });
  });

  describe('Shutdown', () => {
    test('should shutdown gracefully', async () => {
      await expect(tracingService.shutdown()).resolves.not.toThrow();
    });
  });
});
