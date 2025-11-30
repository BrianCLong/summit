import { jest } from '@jest/globals';
import { mockEsmModule } from '../../../tests/utils/esmMock.js';

describe('cacheWarmupWorker', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('skips starting queue and enqueuing when Redis is mocked', async () => {
    const queueAdd = jest.fn();
    const workerConstructor = jest.fn();

    await mockEsmModule('../../db/redis.js', () => ({
      getRedisClient: () => ({ __isMock: true }),
      getRedisConnectionOptions: () => ({}),
      isRedisMock: () => true,
    }));

    await mockEsmModule('bullmq', () => ({
      Queue: jest.fn(() => ({ add: queueAdd })),
      Worker: jest.fn((...args: any[]) => {
        workerConstructor(...args);
        return {};
      }),
      Job: class {},
    }));

    const { startCacheWarmupWorker, enqueueCacheWarmup } = await import(
      '../cacheWarmupWorker.js'
    );

    await startCacheWarmupWorker();
    await enqueueCacheWarmup({ query: 'foo', limit: 5 });

    expect(workerConstructor).not.toHaveBeenCalled();
    expect(queueAdd).not.toHaveBeenCalled();
  });
});
