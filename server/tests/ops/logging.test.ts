import request from 'supertest';
import express from 'express';
import { randomUUID } from 'crypto';

// Mock tracer before importing middleware
jest.mock('../../src/observability/tracer.js', () => ({
  getTracer: () => ({
    getTraceId: () => 'mock-trace-id',
    getSpanId: () => 'mock-span-id',
    setAttribute: jest.fn(),
  }),
}));

// Mock logger
jest.mock('../../src/config/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
  correlationStorage: {
    run: (store: any, fn: any) => fn(),
  }
}));

// Import after mocking
import { correlationIdMiddleware } from '../../src/middleware/correlation-id.js';

describe('Structured Logging & Correlation', () => {
  let app: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Mock correlation ID middleware
    app.use(correlationIdMiddleware);

    app.get('/test', (_req: any, res: any) => {
      res.json({ ok: true });
    });
  });

  it('should generate and return x-correlation-id', async () => {
    const res = await request(app).get('/test');
    expect(res.headers['x-correlation-id']).toBeDefined();
    expect(res.body.ok).toBe(true);
  });

  it('should accept incoming x-correlation-id', async () => {
    const testId = randomUUID();
    const res = await request(app).get('/test').set('x-correlation-id', testId);
    expect(res.headers['x-correlation-id']).toBe(testId);
  });
});
