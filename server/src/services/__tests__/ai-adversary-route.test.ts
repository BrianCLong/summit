import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock functions declared before mocks
const mockGenerateChain = jest.fn();
const mockRateLimiterConsume = jest.fn(async () => ({
  allowed: true,
  total: 1,
  remaining: 1,
  reset: Date.now(),
}));

// ESM-compatible mocking using unstable_mockModule
jest.unstable_mockModule('bullmq', () => ({
  Queue: jest.fn(() => ({
    add: jest.fn(),
    getJob: jest.fn(),
  })),
  Worker: jest.fn(() => ({
    on: jest.fn(),
  })),
  QueueScheduler: jest.fn(),
}));

jest.unstable_mockModule('../../ai/ExtractionEngine', () => ({
  ExtractionEngine: jest.fn(() => ({
    processExtraction: jest.fn(),
  })),
}));

jest.unstable_mockModule('../../db/redis', () => ({
  getRedisClient: jest.fn(() => ({
    duplicate: jest.fn(() => ({
        on: jest.fn(),
        connect: jest.fn(),
    })),
    on: jest.fn(),
    ping: jest.fn(),
  })),
}));

jest.unstable_mockModule('../../db/neo4j', () => ({
  getNeo4jDriver: jest.fn(() => ({
    session: jest.fn(() => ({
      run: jest.fn(),
      close: jest.fn(),
    })),
  })),
}));

jest.unstable_mockModule('../../middleware/auth', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

jest.unstable_mockModule('../../middleware/rateLimit', () => ({
  createRateLimiter: () => (_req: any, _res: any, next: any) => next(),
  EndpointClass: { AI: 'AI' },
}));

jest.unstable_mockModule('../../services/RateLimiter', () => ({
  rateLimiter: {
    consume: mockRateLimiterConsume,
  },
}));

jest.unstable_mockModule('../../ai/services/AdversaryAgentService.js', () => ({
  default: class {
    generateChain = mockGenerateChain;
  },
}));

// Dynamic imports AFTER mocks are set up
const aiRouter = (await import('../../routes/ai.js')).default;

// Helper to run route handlers (same as in ai.test.ts)
const getRouteHandlers = (path: string) => {
  const layer = (aiRouter as any).stack.find(
    (stack: any) => stack.route?.path === path,
  );
  if (!layer) {
    throw new Error(`Route ${path} not registered`);
  }
  return layer.route.stack.map((stack: any) => stack.handle);
};

const runHandlers = async (handlers: any[], req: any, res: any) => {
  for (const handler of handlers) {
    await new Promise<void>((resolve, reject) => {
      if (handler.length >= 3) {
        let nextCalled = false;
        const next = (err?: any) => {
          nextCalled = true;
          if (err) reject(err);
          else resolve();
        };
        const result = handler(req, res, next);
        if (result && typeof result.then === 'function') {
          result.then(resolve).catch(reject);
          return;
        }
        if (!nextCalled) resolve();
      } else {
        Promise.resolve(handler(req, res)).then(resolve).catch(reject);
      }
    });
    if (res.finished) return;
  }
};

const buildRes = () => {
  const res: any = {
    statusCode: 200,
    body: undefined,
    finished: false,
  };
  res.status = jest.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((payload: any) => {
    res.body = payload;
    res.finished = true;
    return res;
  });
  return res;
};

describe('AI Routes - Adversary Agent', () => {
  beforeEach(() => {
    mockGenerateChain.mockClear();
  });

  it('should accept valid request', async () => {
    mockGenerateChain.mockResolvedValue(['step1', 'step2']);

    const req: any = {
      method: 'POST',
      url: '/adversary/generate',
      body: {
        context: 'test context',
        temperature: 0.7,
        persistence: 3,
      },
      headers: {},
      ip: '127.0.0.1',
      user: { id: 'user-1' },
    };
    const res = buildRes();
    const handlers = getRouteHandlers('/adversary/generate');
    await runHandlers(handlers, req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.ttps).toEqual(['step1', 'step2']);
    expect(mockGenerateChain).toHaveBeenCalledWith('test context', {
      temperature: 0.7,
      persistence: 3,
    });
  });

  it('should reject invalid parameters', async () => {
    mockGenerateChain.mockResolvedValue([]);

    const req: any = {
        method: 'POST',
        url: '/adversary/generate',
        body: {
            context: 'test context',
            temperature: 'invalid', // string instead of number
            persistence: 1000, // too high
        },
        headers: {},
        ip: '127.0.0.1',
        user: { id: 'user-1' },
    };
    const res = buildRes();
    const handlers = getRouteHandlers('/adversary/generate');
    await runHandlers(handlers, req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(mockGenerateChain).not.toHaveBeenCalled();
  });
});
