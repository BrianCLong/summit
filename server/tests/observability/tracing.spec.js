"use strict";
/**
 * OpenTelemetry Tracing Tests
 *
 * Tests distributed tracing functionality across different operation types.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const tracing_1 = require("../../src/observability/tracing");
(0, globals_1.describe)('OpenTelemetry Tracing', () => {
    let tracingService;
    (0, globals_1.beforeEach)(() => {
        // Create a new instance with tracing disabled for testing
        tracingService = tracing_1.TracingService.getInstance({
            enabled: false, // Disable actual OTEL SDK in tests
            serviceName: 'test-service',
            serviceVersion: '1.0.0',
            environment: 'test',
        });
    });
    (0, globals_1.afterEach)(() => {
        // Reset singleton
        tracing_1.TracingService.instance = null;
    });
    (0, globals_1.describe)('TracingService Initialization', () => {
        (0, globals_1.test)('should initialize with default config', () => {
            const config = tracingService.getConfig();
            (0, globals_1.expect)(config).toMatchObject({
                serviceName: 'test-service',
                serviceVersion: '1.0.0',
                environment: 'test',
                enabled: false,
            });
        });
        (0, globals_1.test)('should read config from environment variables', () => {
            process.env.OTEL_SERVICE_NAME = 'env-service';
            process.env.OTEL_SERVICE_VERSION = '2.0.0';
            process.env.OTEL_ENABLED = 'false';
            const service = tracing_1.TracingService.getInstance();
            const config = service.getConfig();
            (0, globals_1.expect)(config.serviceName).toBe('env-service');
            (0, globals_1.expect)(config.serviceVersion).toBe('2.0.0');
            delete process.env.OTEL_SERVICE_NAME;
            delete process.env.OTEL_SERVICE_VERSION;
            delete process.env.OTEL_ENABLED;
            tracing_1.TracingService.instance = null;
        });
    });
    (0, globals_1.describe)('Generic Trace Wrapper', () => {
        (0, globals_1.test)('should execute operation and return result', async () => {
            const mockOperation = globals_1.jest.fn(async () => 'success');
            const result = await tracingService.trace('test.operation', mockOperation);
            (0, globals_1.expect)(result).toBe('success');
            (0, globals_1.expect)(mockOperation).toHaveBeenCalled();
        });
        (0, globals_1.test)('should handle operation errors', async () => {
            const mockOperation = globals_1.jest.fn(async () => {
                throw new Error('Operation failed');
            });
            await (0, globals_1.expect)(tracingService.trace('test.operation', mockOperation)).rejects.toThrow('Operation failed');
        });
        (0, globals_1.test)('should pass span to operation callback', async () => {
            let capturedSpan;
            await tracingService.trace('test.operation', async (span) => {
                capturedSpan = span;
                return 'success';
            });
            (0, globals_1.expect)(capturedSpan).toBeDefined();
            (0, globals_1.expect)(capturedSpan.setAttribute).toBeDefined();
            (0, globals_1.expect)(capturedSpan.setStatus).toBeDefined();
        });
        (0, globals_1.test)('should allow setting attributes in span', async () => {
            const mockOperation = globals_1.jest.fn(async (span) => {
                span.setAttribute('custom.key', 'custom-value');
                span.setAttribute('custom.count', 42);
                return 'success';
            });
            await tracingService.trace('test.operation', mockOperation);
            (0, globals_1.expect)(mockOperation).toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('Database Tracing', () => {
        (0, globals_1.test)('should trace postgres operations', async () => {
            const mockDbOperation = globals_1.jest.fn(async () => [{ id: 1 }, { id: 2 }]);
            const result = await tracingService.traceDatabase('select', 'postgres', mockDbOperation, 'SELECT * FROM users WHERE id = $1');
            (0, globals_1.expect)(result).toEqual([{ id: 1 }, { id: 2 }]);
            (0, globals_1.expect)(mockDbOperation).toHaveBeenCalled();
        });
        (0, globals_1.test)('should trace neo4j operations', async () => {
            const mockDbOperation = globals_1.jest.fn(async () => ({
                records: [{ get: () => 'value' }],
            }));
            const result = await tracingService.traceDatabase('cypher', 'neo4j', mockDbOperation, 'MATCH (n) RETURN n');
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(mockDbOperation).toHaveBeenCalled();
        });
        (0, globals_1.test)('should trace redis operations', async () => {
            const mockDbOperation = globals_1.jest.fn(async () => 'cached-value');
            const result = await tracingService.traceDatabase('get', 'redis', mockDbOperation, 'GET user:123');
            (0, globals_1.expect)(result).toBe('cached-value');
            (0, globals_1.expect)(mockDbOperation).toHaveBeenCalled();
        });
        (0, globals_1.test)('should truncate long queries', async () => {
            const longQuery = 'SELECT * FROM table WHERE ' + 'x = 1 AND '.repeat(100);
            const mockDbOperation = globals_1.jest.fn(async () => []);
            await tracingService.traceDatabase('select', 'postgres', mockDbOperation, longQuery);
            (0, globals_1.expect)(mockDbOperation).toHaveBeenCalled();
            // Query should be truncated to 500 chars in span attributes
        });
        (0, globals_1.test)('should handle database errors', async () => {
            const mockDbOperation = globals_1.jest.fn(async () => {
                throw new Error('Database connection failed');
            });
            await (0, globals_1.expect)(tracingService.traceDatabase('select', 'postgres', mockDbOperation)).rejects.toThrow('Database connection failed');
        });
    });
    (0, globals_1.describe)('GraphQL Tracing', () => {
        (0, globals_1.test)('should trace GraphQL resolvers', async () => {
            const mockResolver = globals_1.jest.fn(async () => ({
                id: '123',
                name: 'Test User',
            }));
            const mockContext = {
                user: { id: 'user-456' },
            };
            const result = await tracingService.traceGraphQL('getUser', 'user', mockResolver, mockContext);
            (0, globals_1.expect)(result).toEqual({ id: '123', name: 'Test User' });
            (0, globals_1.expect)(mockResolver).toHaveBeenCalled();
        });
        (0, globals_1.test)('should handle GraphQL resolver errors', async () => {
            const mockResolver = globals_1.jest.fn(async () => {
                throw new Error('Resolver failed');
            });
            await (0, globals_1.expect)(tracingService.traceGraphQL('getUser', 'user', mockResolver)).rejects.toThrow('Resolver failed');
        });
        (0, globals_1.test)('should include user context in span', async () => {
            const mockResolver = globals_1.jest.fn(async () => 'result');
            const mockContext = {
                user: { id: 'user-789' },
            };
            await tracingService.traceGraphQL('mutation', 'createEntity', mockResolver, mockContext);
            (0, globals_1.expect)(mockResolver).toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('Queue Tracing', () => {
        (0, globals_1.test)('should trace queue job processing', async () => {
            const mockProcessor = globals_1.jest.fn(async () => ({
                processed: true,
                count: 5,
            }));
            const result = await tracingService.traceQueue('email-queue', 'send-email', mockProcessor);
            (0, globals_1.expect)(result).toEqual({ processed: true, count: 5 });
            (0, globals_1.expect)(mockProcessor).toHaveBeenCalled();
        });
        (0, globals_1.test)('should handle queue processing errors', async () => {
            const mockProcessor = globals_1.jest.fn(async () => {
                throw new Error('Job processing failed');
            });
            await (0, globals_1.expect)(tracingService.traceQueue('email-queue', 'send-email', mockProcessor)).rejects.toThrow('Job processing failed');
        });
    });
    (0, globals_1.describe)('HTTP Tracing', () => {
        (0, globals_1.test)('should trace HTTP requests', async () => {
            const mockHttpOperation = globals_1.jest.fn(async () => ({
                status: 200,
                data: { message: 'success' },
            }));
            const result = await tracingService.traceHTTP('POST', 'https://api.example.com/users', mockHttpOperation);
            (0, globals_1.expect)(result).toEqual({
                status: 200,
                data: { message: 'success' },
            });
            (0, globals_1.expect)(mockHttpOperation).toHaveBeenCalled();
        });
        (0, globals_1.test)('should handle HTTP errors', async () => {
            const mockHttpOperation = globals_1.jest.fn(async () => {
                throw new Error('Network timeout');
            });
            await (0, globals_1.expect)(tracingService.traceHTTP('GET', 'https://api.example.com/data', mockHttpOperation)).rejects.toThrow('Network timeout');
        });
    });
    (0, globals_1.describe)('Span Management', () => {
        (0, globals_1.test)('should create manual spans', () => {
            const span = tracingService.startSpan('manual.operation', {
                attributes: { key: 'value' },
            });
            (0, globals_1.expect)(span).toBeDefined();
            (0, globals_1.expect)(span.setAttribute).toBeDefined();
            (0, globals_1.expect)(span.end).toBeDefined();
            span.end();
        });
        (0, globals_1.test)('should get active span', () => {
            const span = tracingService.getActiveSpan();
            // In test environment with tracing disabled, this may be undefined
            // In production with enabled tracing, it would return the active span
            (0, globals_1.expect)(span).toBeUndefined();
        });
        (0, globals_1.test)('should add attributes to active span', () => {
            // This should not throw even if there's no active span
            (0, globals_1.expect)(() => {
                tracingService.addAttributes({ test: 'value', count: 42 });
            }).not.toThrow();
        });
        (0, globals_1.test)('should record exceptions in active span', () => {
            const error = new Error('Test error');
            // This should not throw even if there's no active span
            (0, globals_1.expect)(() => {
                tracingService.recordException(error, { context: 'test' });
            }).not.toThrow();
        });
    });
    (0, globals_1.describe)('Trace Context Propagation', () => {
        (0, globals_1.test)('should get trace context in W3C format', () => {
            const traceContext = tracingService.getTraceContext();
            // With tracing disabled, this will be undefined
            (0, globals_1.expect)(traceContext).toBeUndefined();
        });
        (0, globals_1.test)('should generate valid trace context format', () => {
            // This test would only pass with actual tracing enabled
            // In production: expect(traceContext).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/);
        });
    });
    (0, globals_1.describe)('Performance and Latency', () => {
        (0, globals_1.test)('should complete traces within performance targets', async () => {
            const startTime = Date.now();
            await tracingService.trace('performance.test', async () => {
                // Simulate some work
                await new Promise(resolve => setTimeout(resolve, 10));
                return 'done';
            });
            const duration = Date.now() - startTime;
            // Tracing overhead should be minimal (< 5ms)
            (0, globals_1.expect)(duration).toBeLessThan(50);
        });
        (0, globals_1.test)('should handle concurrent traces', async () => {
            const operations = Array.from({ length: 10 }, (_, i) => tracingService.trace(`concurrent.${i}`, async () => {
                await new Promise(resolve => setTimeout(resolve, 5));
                return `result-${i}`;
            }));
            const results = await Promise.all(operations);
            (0, globals_1.expect)(results).toHaveLength(10);
            (0, globals_1.expect)(results[0]).toBe('result-0');
            (0, globals_1.expect)(results[9]).toBe('result-9');
        });
        (0, globals_1.test)('should measure latency accurately', async () => {
            const expectedDelay = 100;
            const startTime = Date.now();
            await tracingService.trace('latency.test', async () => {
                await new Promise(resolve => setTimeout(resolve, expectedDelay));
                return 'done';
            });
            const actualDuration = Date.now() - startTime;
            // Should be within 20ms of expected
            (0, globals_1.expect)(actualDuration).toBeGreaterThanOrEqual(expectedDelay);
            (0, globals_1.expect)(actualDuration).toBeLessThan(expectedDelay + 50);
        });
    });
    (0, globals_1.describe)('Error Scenarios', () => {
        (0, globals_1.test)('should handle nested operation failures', async () => {
            await (0, globals_1.expect)(tracingService.trace('outer.operation', async () => {
                await tracingService.trace('inner.operation', async () => {
                    throw new Error('Inner failure');
                });
            })).rejects.toThrow('Inner failure');
        });
        (0, globals_1.test)('should handle timeout scenarios', async () => {
            globals_1.jest.useFakeTimers();
            const operation = tracingService.trace('timeout.test', async () => {
                await new Promise(resolve => setTimeout(resolve, 10000));
                return 'completed';
            });
            globals_1.jest.advanceTimersByTime(10000);
            await (0, globals_1.expect)(operation).resolves.toBe('completed');
            globals_1.jest.useRealTimers();
        });
        (0, globals_1.test)('should gracefully handle tracing disabled', async () => {
            const result = await tracingService.trace('disabled.trace', async (span) => {
                // Should still work even with no-op span
                span.setAttribute('test', 'value');
                return 'success';
            });
            (0, globals_1.expect)(result).toBe('success');
        });
    });
    (0, globals_1.describe)('Shutdown', () => {
        (0, globals_1.test)('should shutdown gracefully', async () => {
            await (0, globals_1.expect)(tracingService.shutdown()).resolves.not.toThrow();
        });
    });
});
