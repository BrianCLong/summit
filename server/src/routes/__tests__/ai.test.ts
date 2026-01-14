import { Queue, Worker } from 'bullmq';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { rateLimiter } from '../../services/RateLimiter';

// Mock BullMQ
const queueInstance = {
  add: jest.fn(),
  getJob: jest.fn(),
};
jest.mock('bullmq', () => ({
  Queue: jest.fn(() => ({
    add: queueInstance.add,
    getJob: queueInstance.getJob,
  })),
  Worker: jest.fn(() => ({
    on: jest.fn(),
  })),
  QueueScheduler: jest.fn(),
}));

// Mock ExtractionEngine
jest.mock('../../ai/ExtractionEngine', () => ({
  ExtractionEngine: jest.fn(() => ({
    processExtraction: jest.fn(),
  })),
}));

// Mock getRedisClient and getNeo4jDriver (used by ai.ts)
jest.mock('../../db/redis', () => ({
  getRedisClient: jest.fn(() => ({
    on: jest.fn(),
    ping: jest.fn(),
  })),
}));
jest.mock('../../db/neo4j', () => ({
  getNeo4jDriver: jest.fn(() => ({
    session: jest.fn(() => ({
      run: jest.fn(),
      close: jest.fn(),
    })),
  })),
}));

jest.mock('../../middleware/auth', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../middleware/rateLimit', () => ({
  createRateLimiter: () => (_req: any, _res: any, next: any) => next(),
  EndpointClass: { AI: 'AI' },
}));

// Import the router after mocks are set up
import aiRouter from '../ai';
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

describe('AI Routes - Video Analysis', () => {
  let mockQueueAdd: any;
  let mockQueueGetJob: any;

  beforeEach(() => {
    mockQueueAdd = queueInstance.add;
    mockQueueGetJob = queueInstance.getJob;
    mockQueueAdd.mockClear();
    mockQueueGetJob.mockClear();
    (rateLimiter as any).consume = jest.fn(async () => ({
      allowed: true,
      total: 1,
      remaining: 1,
      reset: Date.now(),
    }));
  });

  describe('POST /api/ai/extract-video', () => {
    it('should submit a video extraction job successfully', async () => {
      mockQueueAdd.mockResolvedValueOnce({ id: 'test-job-id' });

      const req: any = {
        method: 'POST',
        url: '/extract-video',
        body: {
          mediaPath: '/path/to/video.mp4',
          mediaType: 'VIDEO',
          extractionMethods: ['video_analysis'],
          options: { frameRate: 1 },
        },
        ip: '127.0.0.1',
        user: { id: 'user-1' },
      };
      const res = buildRes();
      const handlers = getRouteHandlers('/extract-video');
      expect(handlers.length).toBeGreaterThan(1);
      await runHandlers(handlers, req, res);

      expect(res.statusCode).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('jobId');
      expect(res.body.message).toContain('job submitted successfully');
      expect(mockQueueAdd).toHaveBeenCalledTimes(1);
      expect(mockQueueAdd).toHaveBeenCalledWith(
        'video-analysis-job',
        expect.objectContaining({ mediaPath: '/path/to/video.mp4' }),
        expect.objectContaining({ jobId: expect.any(String) }),
      );
    });

    it('should return 400 if mediaPath is missing', async () => {
      const req: any = {
        method: 'POST',
        url: '/extract-video',
        body: {
          mediaType: 'VIDEO',
          extractionMethods: ['video_analysis'],
        },
        ip: '127.0.0.1',
        user: { id: 'user-1' },
      };
      const res = buildRes();
      const handlers = getRouteHandlers('/extract-video');
      await runHandlers(handlers, req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details[0].msg).toMatch(
        /mediaPath is required|Invalid value/,
      );
    });

    it('should return 400 if mediaType is not VIDEO', async () => {
      const req: any = {
        method: 'POST',
        url: '/extract-video',
        body: {
          mediaPath: '/path/to/image.jpg',
          mediaType: 'IMAGE',
          extractionMethods: ['video_analysis'],
        },
        ip: '127.0.0.1',
        user: { id: 'user-1' },
      };
      const res = buildRes();
      const handlers = getRouteHandlers('/extract-video');
      await runHandlers(handlers, req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details[0].msg).toBe('mediaType must be VIDEO');
    });
  });

  describe('GET /api/ai/job-status/:jobId', () => {
    it('should return job status for a completed job', async () => {
      mockQueueGetJob.mockResolvedValueOnce({
        id: 'completed-job',
        getState: (jest.fn(async () => 'completed') as unknown) as () => Promise<string>,
        returnvalue: { status: 'completed', results: [] },
        progress: 100,
        timestamp: Date.now() - 10000,
        finishedOn: Date.now(),
      });

      const req: any = {
        method: 'GET',
        url: '/job-status/completed-job',
        params: { jobId: 'completed-job' },
        ip: '127.0.0.1',
        user: { id: 'user-1' },
      };
      const res = buildRes();
      const handlers = getRouteHandlers('/job-status/:jobId');
      const handler = handlers[0];
      await handler(req, res);

      expect(mockQueueGetJob).toHaveBeenCalledWith('completed-job');
      expect(res.statusCode).toBe(200);
      expect(res.json).toHaveBeenCalled();
      const payload =
        res.json.mock.calls.find((call: any[]) => call[0])?.[0];
      expect(payload).toBeDefined();
      expect(payload.success).toBe(true);
      expect(payload.jobId).toBe('completed-job');
      expect(payload.status).toBe('completed');
      expect(payload).toHaveProperty('result');
      expect(payload.error).toBeUndefined();
    });

    it('should return job status for a failed job', async () => {
      mockQueueGetJob.mockResolvedValueOnce({
        id: 'failed-job',
        getState: (jest.fn(async () => 'failed') as unknown) as () => Promise<string>,
        returnvalue: undefined,
        progress: 50,
        failedReason: 'Something went wrong',
        timestamp: Date.now() - 5000,
        finishedOn: Date.now(),
      });

      const req: any = {
        method: 'GET',
        url: '/job-status/failed-job',
        params: { jobId: 'failed-job' },
        ip: '127.0.0.1',
        user: { id: 'user-1' },
      };
      const res = buildRes();
      const handlers = getRouteHandlers('/job-status/:jobId');
      const handler = handlers[0];
      await handler(req, res);

      expect(mockQueueGetJob).toHaveBeenCalledWith('failed-job');
      expect(res.statusCode).toBe(200);
      expect(res.json).toHaveBeenCalled();
      const payload =
        res.json.mock.calls.find((call: any[]) => call[0])?.[0];
      expect(payload).toBeDefined();
      expect(payload.success).toBe(true);
      expect(payload.jobId).toBe('failed-job');
      expect(payload.status).toBe('failed');
      expect(payload.result).toBeUndefined();
      expect(payload.error).toBe('Something went wrong');
    });

    it('should return 404 if job is not found', async () => {
      mockQueueGetJob.mockResolvedValueOnce(null);

      const req: any = {
        method: 'GET',
        url: '/job-status/non-existent-job',
        params: { jobId: 'non-existent-job' },
        ip: '127.0.0.1',
        user: { id: 'user-1' },
      };
      const res = buildRes();
      const handlers = getRouteHandlers('/job-status/:jobId');
      const handler = handlers[0];
      await handler(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Job not found');
    });
  });
});
