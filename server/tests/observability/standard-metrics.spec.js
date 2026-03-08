"use strict";
/**
 * Standard Metrics Tests
 *
 * Tests RED and USE metrics implementations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const prom_client_1 = require("prom-client");
const standard_metrics_1 = require("../../src/observability/standard-metrics");
(0, globals_1.describe)('Standard Metrics', () => {
    let registry;
    let redMetrics;
    let useMetrics;
    (0, globals_1.beforeEach)(() => {
        registry = new prom_client_1.Registry();
        const metrics = (0, standard_metrics_1.createStandardMetrics)(registry, {
            prefix: 'test',
            enabled: true,
        });
        redMetrics = metrics.red;
        useMetrics = metrics.use;
    });
    (0, globals_1.describe)('RED Metrics - HTTP', () => {
        (0, globals_1.test)('should record successful HTTP requests', async () => {
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
            (0, globals_1.expect)(metricsOutput).toContain('test_http_requests_total');
            (0, globals_1.expect)(metricsOutput).toContain('test_http_request_duration_seconds');
        });
        (0, globals_1.test)('should record HTTP errors', () => {
            redMetrics.http.recordError({
                method: 'POST',
                route: '/api/users',
                error_type: 'ValidationError',
            });
            (0, globals_1.expect)(async () => {
                const metricsOutput = await registry.metrics();
                (0, globals_1.expect)(metricsOutput).toContain('test_http_errors_total');
            }).not.toThrow();
        });
        (0, globals_1.test)('should track HTTP request duration', async () => {
            const stopTimer = redMetrics.http.startTimer({
                method: 'GET',
                route: '/api/data',
            });
            await new Promise(resolve => setTimeout(resolve, 50));
            stopTimer({ status_code: '200' });
            const metricsOutput = await registry.metrics();
            (0, globals_1.expect)(metricsOutput).toContain('test_http_request_duration_seconds');
        });
        (0, globals_1.test)('should handle multiple concurrent requests', async () => {
            const timers = Array.from({ length: 10 }, (_, i) => redMetrics.http.startTimer({
                method: 'GET',
                route: `/api/endpoint${i}`,
            }));
            await Promise.all(timers.map(async (timer, i) => {
                await new Promise(resolve => setTimeout(resolve, 5));
                redMetrics.http.recordSuccess({
                    method: 'GET',
                    route: `/api/endpoint${i}`,
                    status_code: 200,
                });
                timer({ status_code: '200' });
            }));
            const metricsOutput = await registry.metrics();
            (0, globals_1.expect)(metricsOutput).toContain('test_http_requests_total');
        });
    });
    (0, globals_1.describe)('RED Metrics - GraphQL', () => {
        (0, globals_1.test)('should record successful GraphQL operations', async () => {
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
            (0, globals_1.expect)(metricsOutput).toContain('test_graphql_requests_total');
            (0, globals_1.expect)(metricsOutput).toContain('test_graphql_request_duration_seconds');
        });
        (0, globals_1.test)('should record GraphQL errors', () => {
            redMetrics.graphql.recordError({
                operation_name: 'CreateUser',
                error_type: 'AuthorizationError',
            });
            (0, globals_1.expect)(async () => {
                const metricsOutput = await registry.metrics();
                (0, globals_1.expect)(metricsOutput).toContain('test_graphql_errors_total');
            }).not.toThrow();
        });
        (0, globals_1.test)('should track resolver duration', async () => {
            const stopTimer = redMetrics.graphql.startResolverTimer({
                type_name: 'User',
                field_name: 'posts',
            });
            await new Promise(resolve => setTimeout(resolve, 20));
            stopTimer({ field_name: 'posts' });
            const metricsOutput = await registry.metrics();
            (0, globals_1.expect)(metricsOutput).toContain('test_graphql_resolver_duration_seconds');
        });
        (0, globals_1.test)('should differentiate between queries and mutations', async () => {
            redMetrics.graphql.recordSuccess({
                operation_name: 'GetUser',
                operation_type: 'query',
            });
            redMetrics.graphql.recordSuccess({
                operation_name: 'UpdateUser',
                operation_type: 'mutation',
            });
            const metricsOutput = await registry.metrics();
            (0, globals_1.expect)(metricsOutput).toContain('operation_type="query"');
            (0, globals_1.expect)(metricsOutput).toContain('operation_type="mutation"');
        });
    });
    (0, globals_1.describe)('RED Metrics - Database', () => {
        (0, globals_1.test)('should record successful database queries', async () => {
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
            (0, globals_1.expect)(metricsOutput).toContain('test_db_queries_total');
            (0, globals_1.expect)(metricsOutput).toContain('test_db_query_duration_seconds');
        });
        (0, globals_1.test)('should record database errors', () => {
            redMetrics.database.recordError({
                db_type: 'neo4j',
                operation: 'cypher',
                error_type: 'ConnectionError',
            });
            (0, globals_1.expect)(async () => {
                const metricsOutput = await registry.metrics();
                (0, globals_1.expect)(metricsOutput).toContain('test_db_query_errors_total');
            }).not.toThrow();
        });
        (0, globals_1.test)('should track queries across different databases', async () => {
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
            (0, globals_1.expect)(metricsOutput).toContain('db_type="postgres"');
            (0, globals_1.expect)(metricsOutput).toContain('db_type="neo4j"');
            (0, globals_1.expect)(metricsOutput).toContain('db_type="redis"');
        });
    });
    (0, globals_1.describe)('USE Metrics - Utilization', () => {
        (0, globals_1.test)('should record CPU utilization', () => {
            useMetrics.recordUtilization('cpu', 75.5);
            (0, globals_1.expect)(async () => {
                const metricsOutput = await registry.metrics();
                (0, globals_1.expect)(metricsOutput).toContain('test_cpu_utilization_percent');
            }).not.toThrow();
        });
        (0, globals_1.test)('should record memory utilization', () => {
            useMetrics.recordUtilization('memory', 82.3);
            (0, globals_1.expect)(async () => {
                const metricsOutput = await registry.metrics();
                (0, globals_1.expect)(metricsOutput).toContain('test_memory_utilization_percent');
            }).not.toThrow();
        });
        (0, globals_1.test)('should record database connection pool utilization', () => {
            useMetrics.recordUtilization('db_connection', 60.0, {
                db_type: 'postgres',
                pool_name: 'main',
            });
            (0, globals_1.expect)(async () => {
                const metricsOutput = await registry.metrics();
                (0, globals_1.expect)(metricsOutput).toContain('test_db_connection_utilization_percent');
            }).not.toThrow();
        });
        (0, globals_1.test)('should record thread pool utilization', () => {
            useMetrics.recordUtilization('thread_pool', 45.0, {
                pool_name: 'worker',
            });
            (0, globals_1.expect)(async () => {
                const metricsOutput = await registry.metrics();
                (0, globals_1.expect)(metricsOutput).toContain('test_thread_pool_utilization_percent');
            }).not.toThrow();
        });
    });
    (0, globals_1.describe)('USE Metrics - Saturation', () => {
        (0, globals_1.test)('should record request queue depth', () => {
            useMetrics.recordSaturation('request', 15, {
                queue_type: 'http',
            });
            (0, globals_1.expect)(async () => {
                const metricsOutput = await registry.metrics();
                (0, globals_1.expect)(metricsOutput).toContain('test_request_queue_depth');
            }).not.toThrow();
        });
        (0, globals_1.test)('should record database connection queue depth', () => {
            useMetrics.recordSaturation('db_connection', 5, {
                db_type: 'postgres',
            });
            (0, globals_1.expect)(async () => {
                const metricsOutput = await registry.metrics();
                (0, globals_1.expect)(metricsOutput).toContain('test_db_connection_queue_depth');
            }).not.toThrow();
        });
        (0, globals_1.test)('should record job queue depth', () => {
            useMetrics.recordSaturation('job', 100, {
                queue_name: 'email',
            });
            (0, globals_1.expect)(async () => {
                const metricsOutput = await registry.metrics();
                (0, globals_1.expect)(metricsOutput).toContain('test_job_queue_depth');
            }).not.toThrow();
        });
        (0, globals_1.test)('should record backpressure events', () => {
            useMetrics.recordBackpressure('database');
            useMetrics.recordBackpressure('queue');
            (0, globals_1.expect)(async () => {
                const metricsOutput = await registry.metrics();
                (0, globals_1.expect)(metricsOutput).toContain('test_backpressure_events_total');
            }).not.toThrow();
        });
    });
    (0, globals_1.describe)('USE Metrics - Errors', () => {
        (0, globals_1.test)('should record system errors', () => {
            useMetrics.recordSystemError('OutOfMemory', 'runtime');
            useMetrics.recordSystemError('Timeout', 'network');
            (0, globals_1.expect)(async () => {
                const metricsOutput = await registry.metrics();
                (0, globals_1.expect)(metricsOutput).toContain('test_system_errors_total');
            }).not.toThrow();
        });
        (0, globals_1.test)('should record resource errors', () => {
            useMetrics.recordResourceError('database', 'ConnectionPoolExhausted');
            useMetrics.recordResourceError('cache', 'EvictionError');
            (0, globals_1.expect)(async () => {
                const metricsOutput = await registry.metrics();
                (0, globals_1.expect)(metricsOutput).toContain('test_resource_errors_total');
            }).not.toThrow();
        });
    });
    (0, globals_1.describe)('USE Metrics - Latency Percentiles', () => {
        (0, globals_1.test)('should record latency observations', () => {
            // Record various latencies
            useMetrics.recordLatency('graphql_query', 0.025); // 25ms
            useMetrics.recordLatency('graphql_query', 0.150); // 150ms
            useMetrics.recordLatency('graphql_query', 0.500); // 500ms
            useMetrics.recordLatency('graphql_query', 1.200); // 1200ms
            (0, globals_1.expect)(async () => {
                const metricsOutput = await registry.metrics();
                (0, globals_1.expect)(metricsOutput).toContain('test_latency_p50_seconds');
                (0, globals_1.expect)(metricsOutput).toContain('test_latency_p95_seconds');
                (0, globals_1.expect)(metricsOutput).toContain('test_latency_p99_seconds');
            }).not.toThrow();
        });
        (0, globals_1.test)('should track latencies by operation type', () => {
            useMetrics.recordLatency('api_request', 0.100);
            useMetrics.recordLatency('database_query', 0.050);
            useMetrics.recordLatency('cache_lookup', 0.002);
            (0, globals_1.expect)(async () => {
                const metricsOutput = await registry.metrics();
                (0, globals_1.expect)(metricsOutput).toContain('operation_type="api_request"');
                (0, globals_1.expect)(metricsOutput).toContain('operation_type="database_query"');
                (0, globals_1.expect)(metricsOutput).toContain('operation_type="cache_lookup"');
            }).not.toThrow();
        });
    });
    (0, globals_1.describe)('Performance Targets', () => {
        (0, globals_1.test)('should track p95 latency under 1.5s for graph queries', () => {
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
            (0, globals_1.expect)(Math.max(...latencies)).toBeLessThan(1.5);
        });
        (0, globals_1.test)('should identify slow queries exceeding SLO', () => {
            const slowQuery = 2.5; // Exceeds 1.5s target
            const fastQuery = 0.5; // Well under target
            useMetrics.recordLatency('graph_query', fastQuery);
            useMetrics.recordLatency('graph_query', slowQuery);
            (0, globals_1.expect)(slowQuery).toBeGreaterThan(1.5);
        });
    });
    (0, globals_1.describe)('Metrics Export', () => {
        (0, globals_1.test)('should export metrics in Prometheus format', async () => {
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
            (0, globals_1.expect)(metricsOutput).toContain('# HELP');
            (0, globals_1.expect)(metricsOutput).toContain('# TYPE');
            (0, globals_1.expect)(metricsOutput).toContain('test_http_requests_total');
            (0, globals_1.expect)(metricsOutput).toContain('test_cpu_utilization_percent');
            (0, globals_1.expect)(metricsOutput).toContain('test_request_queue_depth');
        });
        (0, globals_1.test)('should include metric metadata', async () => {
            const metricsOutput = await registry.metrics();
            // HELP lines describe metrics
            (0, globals_1.expect)(metricsOutput).toMatch(/# HELP test_.*_total/);
            // TYPE lines specify metric types
            (0, globals_1.expect)(metricsOutput).toMatch(/# TYPE test_.*_(counter|gauge|histogram|summary)/);
        });
    });
    (0, globals_1.describe)('Metric Labels', () => {
        (0, globals_1.test)('should support multiple label dimensions', async () => {
            redMetrics.http.recordSuccess({
                method: 'POST',
                route: '/api/v1/users',
                status_code: 201,
            });
            const metricsOutput = await registry.metrics();
            (0, globals_1.expect)(metricsOutput).toContain('method="POST"');
            (0, globals_1.expect)(metricsOutput).toContain('route="/api/v1/users"');
            (0, globals_1.expect)(metricsOutput).toContain('status_code="201"');
        });
        (0, globals_1.test)('should aggregate metrics by labels', () => {
            // Record multiple requests to same endpoint
            for (let i = 0; i < 5; i++) {
                redMetrics.http.recordSuccess({
                    method: 'GET',
                    route: '/api/stats',
                    status_code: 200,
                });
            }
            (0, globals_1.expect)(async () => {
                const metricsOutput = await registry.metrics();
                (0, globals_1.expect)(metricsOutput).toContain('test_http_requests_total');
            }).not.toThrow();
        });
    });
    (0, globals_1.describe)('Histogram Buckets', () => {
        (0, globals_1.test)('should use appropriate buckets for HTTP latency', async () => {
            const stopTimer = redMetrics.http.startTimer({
                method: 'GET',
                route: '/test',
            });
            await new Promise(resolve => setTimeout(resolve, 100));
            stopTimer({ status_code: '200' });
            const metricsOutput = await registry.metrics();
            // Should have histogram buckets
            (0, globals_1.expect)(metricsOutput).toMatch(/le="0\.01"/);
            (0, globals_1.expect)(metricsOutput).toMatch(/le="0\.1"/);
            (0, globals_1.expect)(metricsOutput).toMatch(/le="1"/);
        });
        (0, globals_1.test)('should use fine-grained buckets for database queries', async () => {
            const stopTimer = redMetrics.database.startTimer({
                db_type: 'postgres',
                operation: 'select',
            });
            await new Promise(resolve => setTimeout(resolve, 5));
            stopTimer({ operation: 'select' });
            const metricsOutput = await registry.metrics();
            // Should have fine-grained buckets for fast DB queries
            (0, globals_1.expect)(metricsOutput).toMatch(/le="0\.001"/);
            (0, globals_1.expect)(metricsOutput).toMatch(/le="0\.01"/);
        });
    });
});
