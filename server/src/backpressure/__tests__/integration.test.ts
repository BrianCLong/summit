
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import ingestionRouter from '../../routes/ingestion.js';
import { BackpressureGuard } from '../guard.js';

// Mock dependencies
jest.mock('../../middleware/auth', () => ({
  ensureAuthenticated: (req: any, res: any, next: any) => {
    req.user = { tenantId: 'test-tenant' };
    next();
  },
}));

jest.mock('../../ingestion/QueueService', () => {
  return {
    QueueService: jest.fn().mockImplementation(() => ({
      enqueueIngestion: jest.fn().mockResolvedValue('job-123'),
      getJobStatus: jest.fn(),
    })),
  };
});

// Mock database pool
jest.mock('pg', () => {
  return {
    Pool: jest.fn().mockImplementation(() => ({
      connect: jest.fn(),
      query: jest.fn(),
    })),
  };
});

describe('Ingestion Route Backpressure', () => {
  let app: express.Express;
  let guard: BackpressureGuard;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/', ingestionRouter);
  });

  beforeEach(() => {
    guard = BackpressureGuard.getInstance();
    guard.setEnabledOverride(null);
    guard.setMockQueueDepth(0);
    process.env.BACKPRESSURE_ENABLED = 'false';
  });

  afterEach(() => {
    delete process.env.BACKPRESSURE_ENABLED;
  });

  it('should return 503 when backpressure is triggered', async () => {
    // Enable backpressure
    guard.setEnabledOverride(true);
    guard.setMockQueueDepth(200); // Above threshold

    const response = await request(app)
      .post('/start')
      .send({
        tenantId: 'test-tenant',
        source: 'test-source',
        config: {}
      });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: 'Service Unavailable: Backpressure applied'
    });
  });

  it('should return 200 when backpressure is not triggered', async () => {
    // Disable backpressure
    guard.setEnabledOverride(false);

    const response = await request(app)
      .post('/start')
      .send({
        tenantId: 'test-tenant',
        source: 'test-source',
        config: {}
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      jobId: 'job-123',
      status: 'queued'
    });
  });
});
