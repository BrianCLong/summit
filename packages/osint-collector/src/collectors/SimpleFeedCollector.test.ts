import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { SimpleFeedCollector } from './SimpleFeedCollector.js';
import { CollectionType, TaskStatus, type CollectionTask } from '../types/index.js';

/**
 * Creates a collector instance for focused unit tests.
 */
function createCollector(): SimpleFeedCollector {
  return new SimpleFeedCollector({
    name: 'test-feed-collector',
    type: CollectionType.WEB_SCRAPING,
    enabled: true
  });
}

/**
 * Creates a minimal collection task with a caller-provided URL.
 */
function createTask(url: string): CollectionTask {
  return {
    id: 'task-1',
    type: CollectionType.WEB_SCRAPING,
    source: 'unit-test',
    target: 'feed',
    priority: 1,
    scheduledAt: new Date(),
    status: TaskStatus.PENDING,
    config: { url }
  };
}

/**
 * Builds a lightweight fetch Response mock for deterministic tests.
 */
function makeResponse(
  status: number,
  body: string,
  headers: Record<string, string> = {},
): Response {
  const normalized = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );

  return {
    status,
    ok: status >= 200 && status < 300,
    statusText: '',
    headers: {
      get(name: string): string | null {
        return normalized[name.toLowerCase()] ?? null;
      }
    },
    async text(): Promise<string> {
      return body;
    }
  } as unknown as Response;
}

describe('SimpleFeedCollector', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('preserves host header port/brackets when pinning HTTP to resolved IP', () => {
    const collector = createCollector() as unknown as {
      buildFetchTarget: (
        url: string,
        resolvedIp: string,
      ) => { fetchUrl: string; headers: Record<string, string> };
    };

    const target = collector.buildFetchTarget(
      'http://[2001:4860:4860::8844]:8080/feed',
      '93.184.216.34',
    );

    expect(target.headers.Host).toBe('[2001:4860:4860::8844]:8080');
    expect(target.fetchUrl).toBe('http://93.184.216.34:8080/feed');
  });

  it('blocks redirects to unsafe destinations', async () => {
    const collector = createCollector() as unknown as {
      performCollection: (task: CollectionTask) => Promise<unknown>;
    };
    const task = createTask('http://93.184.216.34/feed');

    global.fetch = (jest.fn(async () =>
      makeResponse(302, '', { Location: 'http://127.0.0.1/internal' })) as unknown) as typeof fetch;

    await expect(collector.performCollection(task)).rejects.toThrow('Unsafe IP address blocked');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('follows validated redirects and returns parsed IOC lines', async () => {
    const collector = createCollector() as unknown as {
      performCollection: (task: CollectionTask) => Promise<
        Array<{ type: string; value: string; source: string; timestamp: string }>
      >;
    };
    const task = createTask('http://93.184.216.34/feed');

    let callCount = 0;
    global.fetch = (jest.fn(async () => {
      callCount += 1;
      if (callCount === 1) {
        return makeResponse(302, '', { Location: '/next' });
      }
      return makeResponse(200, '8.8.8.8\n# comment\n1.1.1.1\n');
    }) as unknown) as typeof fetch;

    const data = await collector.performCollection(task);

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(data).toHaveLength(2);
    expect(data[0].value).toBe('8.8.8.8');
    expect(data[1].value).toBe('1.1.1.1');
    expect(data[0].source).toBe('http://93.184.216.34/next');
  });
});
