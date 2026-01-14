import request from 'supertest';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';

// Mock functions declared before mocks
const mockCreateJob = jest.fn();
const mockListJobsForTenant = jest.fn();
const mockGetJob = jest.fn();
const mockGetDownload = jest.fn();
const mockUiEvent = jest.fn();

// ESM-compatible mocking using unstable_mockModule
jest.unstable_mockModule('../../disclosure/export-service.js', () => ({
  disclosureExportService: {
    createJob: mockCreateJob,
    listJobsForTenant: mockListJobsForTenant,
    getJob: mockGetJob,
    getDownload: mockGetDownload,
  },
}));

jest.unstable_mockModule('../../metrics/disclosureMetrics.js', () => ({
  disclosureMetrics: {
    uiEvent: mockUiEvent,
  },
}));

// Dynamic imports AFTER mocks are set up
const disclosuresRouter = (await import('../disclosures.js')).default;
const { disclosureExportService } = await import('../../disclosure/export-service.js');
const { disclosureMetrics } = await import('../../metrics/disclosureMetrics.js');

const app = express();
app.use('/disclosures', disclosuresRouter);

const describeIf =
  process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;

describeIf('Disclosures routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /disclosures/export', () => {
    it('creates a disclosure export job when tenant matches header', async () => {
      const job = {
        id: 'job-1',
        tenantId: 'tenant-a',
        status: 'pending',
        createdAt: new Date().toISOString(),
        warnings: [],
        artifactStats: {},
      };
      mockCreateJob.mockResolvedValueOnce(job);

      const response = await request(app)
        .post('/disclosures/export')
        .set('x-tenant-id', 'tenant-a')
        .send({
          tenantId: 'tenant-a',
          startTime: '2024-01-01T00:00:00Z',
          endTime: '2024-01-02T00:00:00Z',
        });

      expect(response.status).toBe(202);
      expect(response.body.job).toEqual(job);
      expect(disclosureExportService.createJob).toHaveBeenCalledWith({
        tenantId: 'tenant-a',
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-02T00:00:00Z',
      });
    });

    it('rejects mismatched tenant headers', async () => {
      const response = await request(app)
        .post('/disclosures/export')
        .set('x-tenant-id', 'tenant-a')
        .send({
          tenantId: 'tenant-b',
          startTime: '2024-01-01T00:00:00Z',
          endTime: '2024-01-02T00:00:00Z',
        });

      expect(response.status).toBe(403);
      expect(disclosureExportService.createJob).not.toHaveBeenCalled();
    });
  });

  describe('GET /disclosures/export/:jobId', () => {
    it('returns job status when tenant is authorized', async () => {
      const job = {
        id: 'job-1',
        tenantId: 'tenant-a',
        status: 'completed',
        createdAt: new Date().toISOString(),
        warnings: [],
        artifactStats: {},
      };
      mockGetJob.mockReturnValueOnce(job);

      const response = await request(app)
        .get('/disclosures/export/job-1')
        .set('x-tenant-id', 'tenant-a');

      expect(response.status).toBe(200);
      expect(response.body.job).toEqual(job);
    });

    it('returns 404 when job is missing', async () => {
      mockGetJob.mockReturnValueOnce(undefined);

      const response = await request(app)
        .get('/disclosures/export/missing')
        .set('x-tenant-id', 'tenant-a');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /disclosures/export/:jobId/download', () => {
    it('streams the zip when export completed', async () => {
      const tempDir = fs.mkdtempSync(path.join(process.cwd(), 'tmp-test-'));
      const filePath = path.join(tempDir, 'bundle.zip');
      fs.writeFileSync(filePath, 'zip-data');

      const job = {
        id: 'job-1',
        tenantId: 'tenant-a',
        status: 'completed',
        createdAt: new Date().toISOString(),
        warnings: [],
        artifactStats: {},
      };

      mockGetDownload.mockReturnValueOnce({
        job,
        filePath,
      });

      const response = await request(app)
        .get('/disclosures/export/job-1/download')
        .set('x-tenant-id', 'tenant-a');

      expect(response.status).toBe(200);
      expect(response.headers['content-disposition']).toContain('attachment');

      fs.rmSync(tempDir, { recursive: true, force: true });
    });
  });

  describe('POST /disclosures/analytics', () => {
    it('records analytics events when payload valid', async () => {
      const response = await request(app)
        .post('/disclosures/analytics')
        .set('x-tenant-id', 'tenant-a')
        .send({ event: 'view', tenantId: 'tenant-a' });

      expect(response.status).toBe(202);
      expect(disclosureMetrics.uiEvent).toHaveBeenCalledWith(
        'view',
        'tenant-a',
      );
    });
  });
});
