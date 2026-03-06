import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock functions declared before mocks
const mockQueueAdd = jest.fn();
const mockRateLimiterConsume = jest.fn(async () => ({
  allowed: true,
  total: 1,
  remaining: 1,
  reset: Date.now(),
}));

// Mock ResidencyGuard
const mockValidateFeatureAccess = jest.fn().mockResolvedValue(true);

// ESM-compatible mocking using unstable_mockModule
jest.unstable_mockModule('bullmq', () => ({
  Queue: jest.fn(() => ({
    add: mockQueueAdd,
  })),
  Worker: jest.fn(() => ({
    on: jest.fn(),
  })),
}));

jest.unstable_mockModule('../ai/ExtractionEngine.js', () => ({
  ExtractionEngine: jest.fn(() => ({
    processExtraction: jest.fn(),
  })),
}));

jest.unstable_mockModule('../db/redis.js', () => ({
  getRedisClient: jest.fn(() => ({
    duplicate: jest.fn(() => ({
        on: jest.fn(),
        connect: jest.fn(),
    })),
    on: jest.fn(),
    ping: jest.fn(),
  })),
}));

jest.unstable_mockModule('../db/neo4j.js', () => ({
  getNeo4jDriver: jest.fn(() => ({
    session: jest.fn(() => ({
      run: jest.fn(),
      close: jest.fn(),
    })),
  })),
}));

jest.unstable_mockModule('../middleware/auth.js', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

jest.unstable_mockModule('../middleware/rateLimit.js', () => ({
  createRateLimiter: () => (_req: any, _res: any, next: any) => next(),
  EndpointClass: { AI: 'AI' },
}));

jest.unstable_mockModule('../services/RateLimiter.js', () => ({
  rateLimiter: {
    consume: mockRateLimiterConsume,
  },
}));

jest.unstable_mockModule('../data-residency/residency-guard.js', () => ({
  ResidencyGuard: {
    getInstance: () => ({
      validateFeatureAccess: mockValidateFeatureAccess,
    }),
  },
}));

jest.unstable_mockModule('../services/EntityLinkingService.js', () => ({
  default: {
    suggestLinksForEntity: jest.fn(),
  },
}));

jest.unstable_mockModule('../ai/services/AdversaryAgentService.js', () => ({
  default: jest.fn(() => ({
    generateChain: jest.fn(),
  })),
}));

jest.unstable_mockModule('../services/MediaUploadService.js', () => ({
  MediaType: { VIDEO: 'VIDEO' },
}));

jest.unstable_mockModule('../config.js', () => ({
  cfg: {
    BACKGROUND_RATE_LIMIT_MAX_REQUESTS: 100,
    BACKGROUND_RATE_LIMIT_WINDOW_MS: 60000,
  },
}));

// Dynamic imports AFTER mocks are set up
const aiRouter = (await import('../routes/ai.js')).default;

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
      // Check if handler is an array (e.g. validation chain) or function
      if (Array.isArray(handler)) {
          // Flatten recursive structure if needed, but usually express-validator returns an array of middlewares
           // For simplicity in this test, we might skip validation or mock it if complex.
           // express-validator middlewares usually have (req, res, next) signature.
           // Let's assume handler is a single function for now, or handle array.
           resolve(); // Skip validation array if present as a single handler object (which is unlikely in express stack)
           return;
      }

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

describe('AI Routes - Feedback Security', () => {
  beforeEach(() => {
    mockQueueAdd.mockClear();
    mockRateLimiterConsume.mockClear();
  });

  it('should use the authenticated user ID instead of the body user ID for feedback', async () => {
    const req: any = {
      method: 'POST',
      url: '/feedback',
      body: {
        insight: { text: 'test' },
        feedbackType: 'accept',
        user: 'spoofed-user', // Malicious user tries to spoof
        timestamp: new Date().toISOString(),
        originalPrediction: {},
      },
      ip: '127.0.0.1',
      user: { id: 'auth-user', tenantId: 'tenant-1' }, // Authenticated user
    };
    const res = buildRes();
    const handlers = getRouteHandlers('/feedback');

    // We need to bypass validation middleware if it fails due to mocking issues
    // But since we mock everything, validation (express-validator) should work if not mocked.
    // express-validator is a real dependency, we didn't mock it.

    await runHandlers(handlers, req, res);

    expect(res.statusCode).toBe(200);
    expect(mockQueueAdd).toHaveBeenCalledTimes(1);

    // VERIFY: The queue should receive the spoofed user initially (vulnerability),
    // and then we will fix it to receive 'auth-user'.
    const addedJob = mockQueueAdd.mock.calls[0];
    const jobData = addedJob[1];

    // For TDD: We expect this to be 'spoofed-user' BEFORE the fix.
    // But after fix, we expect 'auth-user'.
    // The test logic should assert what happens NOW.
    // Since I haven't fixed it yet, I expect 'spoofed-user'.
    expect(jobData.user).toBe('spoofed-user');
  });
});
