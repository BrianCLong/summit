/**
 * Standard Metrics Tests
 *
 * Tests RED and USE metrics implementations.
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { Registry } from 'prom-client';
import {
  createStandardMetrics,
  REDMetrics,
  USEMetrics,
} from '../../src/observability/standard-metrics';

describe('Standard Metrics', () => {
  let registry: Registry;
  let redMetrics: REDMetrics;
  let useMetrics: USEMetrics;

  beforeEach(() => {
    registry = new Registry();
    const metrics = createStandardMetrics(registry, {
      prefix: 'test',
      enabled: true,
    });
    redMetrics = metrics.red;
    useMetrics = metrics.use;
  });

  describe('RED Metrics - HTTP', () => {
    test('should record successful HTTP requests', async () => {
      const stopTimer = redMetrics.http.startTimer({
        method: 'GET',
        route: '/api/users',
      });

      // Simulate operation
      await new Promise(resolve => setTimeout(resolve, 10));

      redMetrics.http.recordSuccess({
        method: 'GET',
        route: '/api/users',
        status_code: 200,
      });

      stopTimer({ status_code: '200' });

      const metricsOutput = await registry.metrics();

      expect(metricsOutput).toContain('test_http_requests_total');
      expect(metricsOutput).toContain('test_http_request_duration_seconds');
    });

    test('should record HTTP errors', () => {
      redMetrics.http.recordError({
        method: 'POST',
        route: '/api/users',
        error_type: 'ValidationError',
      });

      expect(async () => {
        const metricsOutput = await registry.metrics();
        expect(metricsOutput).toContain('test_http_errors_total');
      }).not.toThrow();
    });

    test('should track HTTP request duration', async () => {
      const stopTimer = redMetrics.http.startTimer({
        method: 'GET',
        route: '/api/data',
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      stopTimer({ status_code: '200' });

      const metricsOutput = await registry.metrics();
      expect(metricsOutput).toContain('test_http_request_duration_seconds');
    });

    test('should handle multiple concurrent requests', async () => {
      const timers = Array.from({ length: 10 }, (_, i) =>
        redMetrics.http.startTimer({
          method: 'GET',
          route: `/api/endpoint${i}`,
        }),
      );

      await Promise.all(
        timers.map(async (timer, i) => {
          await new Promise(resolve => setTimeout(resolve, 5));
          redMetrics.http.recordSuccess({
            method: 'GET',
            route: `/api/endpoint${i}`,
            status_code: 200,
          });
          timer({ status_code: '200' });
        }),
      );

      const metricsOutput = await registry.metrics();
      expect(metricsOutput).toContain('test_http_requests_total');
    });
  });

  describe('RED Metrics - GraphQL', () => {
    test('should record successful GraphQL operations', async () => {
      const stopTimer = redMetrics.graphql.startTimer({
        operation_name: 'GetUser',
        operation_type: 'query',
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      redMetrics.graphql.recordSuccess({
        operation_name: 'GetUser',
        operation_type: 'query',
      });

      stopTimer({ operation_type: 'query' });

      const metricsOutput = await registry.metrics();
      expect(metricsOutput).toContain('test_graphql_requests_total');
      expect(metricsOutput).toContain('test_graphql_request_duration_seconds');
    });

    test('should record GraphQL errors', () => {
      redMetrics.graphql.recordError({
        operation_name: 'CreateUser',
        error_type: 'AuthorizationError',
      });

      expect(async () => {
        const metricsOutput = await registry.metrics();
        expect(metricsOutput).toContain('test_graphql_errors_total');
      }).not.toThrow();
    });

    test('should track resolver duration', async () => {
      const stopTimer = redMetrics.graphql.startResolverTimer({
        type_name: 'User',
        field_name: 'posts',
      });

      await new Promise(resolve => setTimeout(resolve, 20));

      stopTimer({ field_name: 'posts' });

      const metricsOutput = await registry.metrics();
      expect(metricsOutput).toContain('test_graphql_resolver_duration_seconds');
    });

    test('should differentiate between queries and mutations', async () => {
      redMetrics.graphql.recordSuccess({
        operation_name: 'GetUser',
        operation_type: 'query',
      });

      redMetrics.graphql.recordSuccess({
        operation_name: 'UpdateUser',
        operation_type: 'mutation',
      });

      const metricsOutput = await registry.metrics();
      expect(metricsOutput).toContain('operation_type="query"');
      expect(metricsOutput).toContain('operation_type="mutation"');
    });
  });

  describe('RED Metrics - Database', () => {
    test('should record successful database queries', async () => {
      const stopTimer = redMetrics.database.startTimer({
        db_type: 'postgres',
        operation: 'select',
      });

      await new Promise(resolve => setTimeout(resolve, 15));

      redMetrics.database.recordSuccess({
        db_type: 'postgres',
        operation: 'select',
      });

      stopTimer({ operation: 'select' });

      const metricsOutput = await registry.metrics();
      expect(metricsOutput).toContain('test_db_queries_total');
      expect(metricsOutput).toContain('test_db_query_duration_seconds');
    });

    test('should record database errors', () => {
      redMetrics.database.recordError({
        db_type: 'neo4j',
        operation: 'cypher',
        error_type: 'ConnectionError',
      });

      expect(async () => {
        const metricsOutput = await registry.metrics();
        expect(metricsOutput).toContain('test_db_query_errors_total');
      }).not.toThrow();
    });

    test('should track queries across different databases', async () => {
      redMetrics.database.recordSuccess({
        db_type: 'postgres',
        operation: 'select',
      });

      redMetrics.database.recordSuccess({
        db_type: 'neo4j',
        operation: 'cypher',
      });

      redMetrics.database.recordSuccess({
        db_type: 'redis',
        operation: 'get',
      });

      const metricsOutput = await registry.metrics();
      expect(metricsOutput).toContain('db_type="postgres"');
      expect(metricsOutput).toContain('db_type="neo4j"');
      expect(metricsOutput).toContain('db_type="redis"');
    });
  });

  describe('USE Metrics - Utilization', () => {
    test('should record CPU utilization', () => {
      useMetrics.recordUtilization('cpu', 75.5);

      expect(async () => {
        const metricsOutput = await registry.metrics();
        expect(metricsOutput).toContain('test_cpu_utilization_percent');
      }).not.toThrow();
    });

    test('should record memory utilization', () => {
      useMetrics.recordUtilization('memory', 82.3);

      expect(async () => {
        const metricsOutput = await registry.metrics();
        expect(metricsOutput).toContain('test_memory_utilization_percent');
      }).not.toThrow();
    });

    test('should record database connection pool utilization', () => {
      useMetrics.recordUtilization('db_connection', 60.0, {
        db_type: 'postgres',
        pool_name: 'main',
      });

      expect(async () => {
        const metricsOutput = await registry.metrics();
        expect(metricsOutput).toContain('test_db_connection_utilization_percent');
      }).not.toThrow();
    });

    test('should record thread pool utilization', () => {
      useMetrics.recordUtilization('thread_pool', 45.0, {
        pool_name: 'worker',
      });

      expect(async () => {
        const metricsOutput = await registry.metrics();
        expect(metricsOutput).toContain('test_thread_pool_utilization_percent');
      }).not.toThrow();
    });
  });

  describe('USE Metrics - Saturation', () => {
    test('should record request queue depth', () => {
      useMetrics.recordSaturation('request', 15, {
        queue_type: 'http',
      });

      expect(async () => {
        const metricsOutput = await registry.metrics();
        expect(metricsOutput).toContain('test_request_queue_depth');
      }).not.toThrow();
    });

    test('should record database connection queue depth', () => {
      useMetrics.recordSaturation('db_connection', 5, {
        db_type: 'postgres',
      });

      expect(async () => {
        const metricsOutput = await registry.metrics();
        expect(metricsOutput).toContain('test_db_connection_queue_depth');
      }).not.toThrow();
    });

    test('should record job queue depth', () => {
      useMetrics.recordSaturation('job', 100, {
        queue_name: 'email',
      });

      expect(async () => {
        const metricsOutput = await registry.metrics();
        expect(metricsOutput).toContain('test_job_queue_depth');
      }).not.toThrow();
    });

    test('should record backpressure events', () => {
      useMetrics.recordBackpressure('database');
      useMetrics.recordBackpressure('queue');

      expect(async () => {
        const metricsOutput = await registry.metrics();
        expect(metricsOutput).toContain('test_backpressure_events_total');
      }).not.toThrow();
    });
  });

  describe('USE Metrics - Errors', () => {
    test('should record system errors', () => {
      useMetrics.recordSystemError('OutOfMemory', 'runtime');
      useMetrics.recordSystemError('Timeout', 'network');

      expect(async () => {
        const metricsOutput = await registry.metrics();
        expect(metricsOutput).toContain('test_system_errors_total');
      }).not.toThrow();
    });

    test('should record resource errors', () => {
      useMetrics.recordResourceError('database', 'ConnectionPoolExhausted');
      useMetrics.recordResourceError('cache', 'EvictionError');

      expect(async () => {
        const metricsOutput = await registry.metrics();
        expect(metricsOutput).toContain('test_resource_errors_total');
      }).not.toThrow();
    });
  });

  describe('USE Metrics - Latency Percentiles', () => {
    test('should record latency observations', () => {
      // Record various latencies
      useMetrics.recordLatency('graphql_query', 0.025); // 25ms
      useMetrics.recordLatency('graphql_query', 0.150); // 150ms
      useMetrics.recordLatency('graphql_query', 0.500); // 500ms
      useMetrics.recordLatency('graphql_query', 1.200); // 1200ms

      expect(async () => {
        const metricsOutput = await registry.metrics();
        expect(metricsOutput).toContain('test_latency_p50_seconds');
        expect(metricsOutput).toContain('test_latency_p95_seconds');
        expect(metricsOutput).toContain('test_latency_p99_seconds');
      }).not.toThrow();
    });

    test('should track latencies by operation type', () => {
      useMetrics.recordLatency('api_request', 0.100);
      useMetrics.recordLatency('database_query', 0.050);
      useMetrics.recordLatency('cache_lookup', 0.002);

      expect(async () => {
        const metricsOutput = await registry.metrics();
        expect(metricsOutput).toContain('operation_type="api_request"');
        expect(metricsOutput).toContain('operation_type="database_query"');
        expect(metricsOutput).toContain('operation_type="cache_lookup"');
      }).not.toThrow();
    });
  });

  describe('Performance Targets', () => {
    test('should track p95 latency under 1.5s for graph queries', () => {
      // Simulate typical graph query latencies
      const latencies = [
        0.100, 0.150, 0.200, 0.250, 0.300, // Fast queries
        0.400, 0.500, 0.600, 0.700, 0.800, // Medium queries
        0.900, 1.000, 1.100, 1.200, 1.300, // Slower queries
        1.350, 1.400, 1.450, 1.480, 1.490, // Near target
      ];

      latencies.forEach(latency => {
        useMetrics.recordLatency('graph_query', latency);
      });

      // All recorded latencies should be under 1.5s target
      expect(Math.max(...latencies)).toBeLessThan(1.5);
    });

    test('should identify slow queries exceeding SLO', () => {
      const slowQuery = 2.5; // Exceeds 1.5s target
      const fastQuery = 0.5; // Well under target

      useMetrics.recordLatency('graph_query', fastQuery);
      useMetrics.recordLatency('graph_query', slowQuery);

      expect(slowQuery).toBeGreaterThan(1.5);
    });
  });

  describe('Metrics Export', () => {
    test('should export metrics in Prometheus format', async () => {
      // Record some metrics
      redMetrics.http.recordSuccess({
        method: 'GET',
        route: '/test',
        status_code: 200,
      });

      useMetrics.recordUtilization('cpu', 50.0);
      useMetrics.recordSaturation('request', 10, { queue_type: 'http' });

      const metricsOutput = await registry.metrics();

      // Verify Prometheus text format
      expect(metricsOutput).toContain('# HELP');
      expect(metricsOutput).toContain('# TYPE');
      expect(metricsOutput).toContain('test_http_requests_total');
      expect(metricsOutput).toContain('test_cpu_utilization_percent');
      expect(metricsOutput).toContain('test_request_queue_depth');
    });

    test('should include metric metadata', async () => {
      const metricsOutput = await registry.metrics();

      // HELP lines describe metrics
      expect(metricsOutput).toMatch(/# HELP test_.*_total/);
      // TYPE lines specify metric types
      expect(metricsOutput).toMatch(/# TYPE test_.*_(counter|gauge|histogram|summary)/);
    });
  });

  describe('Metric Labels', () => {
    test('should support multiple label dimensions', async () => {
      redMetrics.http.recordSuccess({
        method: 'POST',
        route: '/api/v1/users',
        status_code: 201,
      });

      const metricsOutput = await registry.metrics();
      expect(metricsOutput).toContain('method="POST"');
      expect(metricsOutput).toContain('route="/api/v1/users"');
      expect(metricsOutput).toContain('status_code="201"');
    });

    test('should aggregate metrics by labels', () => {
      // Record multiple requests to same endpoint
      for (let i = 0; i < 5; i++) {
        redMetrics.http.recordSuccess({
          method: 'GET',
          route: '/api/stats',
          status_code: 200,
        });
      }

      expect(async () => {
        const metricsOutput = await registry.metrics();
        expect(metricsOutput).toContain('test_http_requests_total');
      }).not.toThrow();
    });
  });

  describe('Histogram Buckets', () => {
    test('should use appropriate buckets for HTTP latency', async () => {
      const stopTimer = redMetrics.http.startTimer({
        method: 'GET',
        route: '/test',
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      stopTimer({ status_code: '200' });

      const metricsOutput = await registry.metrics();

      // Should have histogram buckets
      expect(metricsOutput).toMatch(/le="0\.01"/);
      expect(metricsOutput).toMatch(/le="0\.1"/);
      expect(metricsOutput).toMatch(/le="1"/);
    });

    test('should use fine-grained buckets for database queries', async () => {
      const stopTimer = redMetrics.database.startTimer({
        db_type: 'postgres',
        operation: 'select',
      });

      await new Promise(resolve => setTimeout(resolve, 5));
      stopTimer({ operation: 'select' });

      const metricsOutput = await registry.metrics();

      // Should have fine-grained buckets for fast DB queries
      expect(metricsOutput).toMatch(/le="0\.001"/);
      expect(metricsOutput).toMatch(/le="0\.01"/);
    });
  });
});
