import { ConcurrentRequestHandler } from '../concurrent-request-handler';
import Redis from 'ioredis';
import { mock, MockProxy } from 'jest-mock-extended';
import { Logger } from 'pino';

// Mock dependencies
const mockRedis: MockProxy<Redis> = mock<Redis>();
const mockLogger: MockProxy<Logger> = mock<Logger>();

describe('ConcurrentRequestHandler', () => {
  let handler: ConcurrentRequestHandler;

  beforeEach(() => {
    handler = new ConcurrentRequestHandler(
      mockRedis,
      mockLogger,
      {
        minWorkers: 1,
        maxWorkers: 1,
        idleTimeout: 1000,
        maxQueueSize: 100,
        maxConcurrentPerWorker: 1,
      },
      {
        algorithm: 'round-robin',
        healthCheckInterval: 1000,
        failureThreshold: 3,
        recoveryThreshold: 1,
      },
    );
  });

  it('should execute a simple processor function in a sandbox', async () => {
    const context = {
      id: 'test-request',
      tenantId: 'test-tenant',
      userId: 'test-user',
      priority: 5,
      timeout: 5000,
      retries: 0,
      metadata: {},
    };

    const processor = (ctx: any) => {
      return ctx.id + '-processed';
    };

    const requestId = await handler.submitRequest(context, processor);
    const result = await handler.getResult(requestId);

    expect(result.success).toBe(true);
    expect(result.data).toBe('test-request-processed');
  });
});
