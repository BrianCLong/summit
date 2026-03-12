import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import reportsRouter from '../reports';

vi.mock('bullmq', () => {
  return {
    Queue: vi.fn().mockImplementation(() => {
      return {
        add: (...args: any[]) => (global as any).__mockAdd(...args),
        getJob: (...args: any[]) => (global as any).__mockGetJob(...args),
      };
    }),
  };
});

describe('Reports Router', () => {
  let app: express.Application;
  let mockAdd: any;
  let mockGetJob: any;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use(reportsRouter);

    mockAdd = vi.fn();
    mockGetJob = vi.fn();
    (global as any).__mockAdd = mockAdd;
    (global as any).__mockGetJob = mockGetJob;
  });

  describe('POST /v1/reports/render', () => {
    it('queues a new report job successfully', async () => {
      mockAdd.mockResolvedValueOnce({ id: 'job-123' });

      const response = await request(app)
        .post('/v1/reports/render')
        .send({
          templateId: 'tpl-1',
          version: '1.0',
          data: { foo: 'bar' },
          options: { format: 'pdf' },
          classification: 'secret',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ jobId: 'job-123', status: 'queued' });
      expect(mockAdd).toHaveBeenCalledWith('render', {
        templateId: 'tpl-1',
        version: '1.0',
        data: { foo: 'bar' },
        options: { format: 'pdf' },
        classification: 'secret',
      });
    });

    it('returns 403 when simulated policy denies request', async () => {
      const response = await request(app)
        .post('/v1/reports/render')
        .set('x-simulate-policy-deny', 'true')
        .send({
          templateId: 'tpl-1',
        });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'Policy denied' });
      expect(mockAdd).not.toHaveBeenCalled();
    });

    it('returns 500 when queue addition fails', async () => {
      mockAdd.mockRejectedValueOnce(new Error('Queue connection failed'));

      const response = await request(app)
        .post('/v1/reports/render')
        .send({
          templateId: 'tpl-1',
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Queue connection failed' });
    });
  });

  describe('GET /v1/reports/jobs/:id', () => {
    it('returns 404 for unknown job', async () => {
      mockGetJob.mockResolvedValueOnce(null);

      const response = await request(app).get('/v1/reports/jobs/unknown-123');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Job not found' });
    });

    it('returns completed job status with results', async () => {
      mockGetJob.mockResolvedValueOnce({
        id: 'job-123',
        getState: vi.fn().mockResolvedValue('completed'),
        returnvalue: {
          url: 'https://example.com/report.pdf',
          provenance: 'trusted',
          size: 1024,
        },
      });

      const response = await request(app).get('/v1/reports/jobs/job-123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: 'job-123',
        state: 'completed',
        result: {
          url: 'https://example.com/report.pdf',
          provenance: 'trusted',
          size: 1024,
        },
      });
    });

    it('returns failed job status with error reason', async () => {
      mockGetJob.mockResolvedValueOnce({
        id: 'job-123',
        getState: vi.fn().mockResolvedValue('failed'),
        failedReason: 'Template rendering timeout',
      });

      const response = await request(app).get('/v1/reports/jobs/job-123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: 'job-123',
        state: 'failed',
        error: 'Template rendering timeout',
      });
    });

    it('returns pending job status with progress', async () => {
      mockGetJob.mockResolvedValueOnce({
        id: 'job-123',
        getState: vi.fn().mockResolvedValue('active'),
        progress: 50,
      });

      const response = await request(app).get('/v1/reports/jobs/job-123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: 'job-123',
        state: 'active',
        progress: 50,
      });
    });
  });
});
