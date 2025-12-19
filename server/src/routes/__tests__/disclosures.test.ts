import request from 'supertest';
import express from 'express';
import fs from 'fs';
import path from 'path';

jest.mock('../../disclosure/export-service.js', () => ({
  disclosureExportService: {
    createJob: jest.fn(),
    listJobsForTenant: jest.fn(),
    getJob: jest.fn(),
    getDownload: jest.fn(),
  },
}));

jest.mock('../../metrics/disclosureMetrics.js', () => ({
  disclosureMetrics: {
    uiEvent: jest.fn(),
  },
}));

jest.mock('../../governance/governance-bundle.js', () => ({
  generateGovernanceBundle: jest.fn(),
}));

const { disclosureExportService } = jest.requireMock(
  '../../disclosure/export-service.js',
);
const { disclosureMetrics } = jest.requireMock(
  '../../metrics/disclosureMetrics.js',
);
const { generateGovernanceBundle } = jest.requireMock(
  '../../governance/governance-bundle.js',
);

import disclosuresRouter from '../disclosures.js';
import { jest, describe, it, test, expect, beforeEach } from '@jest/globals';

const app = express();
app.use('/disclosures', disclosuresRouter);

describe('Disclosures routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /disclosures/governance-bundle', () => {
    it('generates a governance bundle and returns download links', async () => {
      const tempDir = fs.mkdtempSync(path.join(process.cwd(), 'tmp-gov-'));
      const tarPath = path.join(tempDir, 'bundle.tar.gz');
      const manifestPath = path.join(tempDir, 'manifest.json');
      const checksumsPath = path.join(tempDir, 'checksums.txt');
      fs.writeFileSync(tarPath, 'bundle');
      fs.writeFileSync(manifestPath, '{}');
      fs.writeFileSync(checksumsPath, 'sha');

      generateGovernanceBundle.mockResolvedValueOnce({
        id: 'gov-1',
        tarPath,
        manifestPath,
        checksumsPath,
        sha256: 'abc123',
        counts: {
          auditEvents: 2,
          policyDecisions: 1,
          sbomRefs: 1,
          provenanceRefs: 1,
        },
        warnings: [],
        files: [],
        workspace: tempDir,
      });

      const response = await request(app)
        .post('/disclosures/governance-bundle')
        .set('x-tenant-id', 'tenant-a')
        .send({
          tenantId: 'tenant-a',
          startTime: '2024-01-01T00:00:00Z',
          endTime: '2024-01-02T00:00:00Z',
        });

      expect(response.status).toBe(201);
      expect(response.body.bundle.id).toEqual('gov-1');
      expect(response.body.bundle.downloadUrl).toContain('gov-1');
      expect(response.body.bundle.manifestUrl).toContain('gov-1');
      expect(response.body.bundle.checksumsUrl).toContain('gov-1');
    });
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
      disclosureExportService.createJob.mockResolvedValueOnce(job);

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
      disclosureExportService.getJob.mockReturnValueOnce(job);

      const response = await request(app)
        .get('/disclosures/export/job-1')
        .set('x-tenant-id', 'tenant-a');

      expect(response.status).toBe(200);
      expect(response.body.job).toEqual(job);
    });

    it('returns 404 when job is missing', async () => {
      disclosureExportService.getJob.mockReturnValueOnce(undefined);

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

      disclosureExportService.getDownload.mockReturnValueOnce({
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

  describe('Governance bundle downloads', () => {
    it('streams governance tarball when bundle exists and tenant matches', async () => {
      const tempDir = fs.mkdtempSync(path.join(process.cwd(), 'tmp-gov-'));
      const tarPath = path.join(tempDir, 'bundle.tar.gz');
      const manifestPath = path.join(tempDir, 'manifest.json');
      const checksumsPath = path.join(tempDir, 'checksums.txt');
      fs.writeFileSync(tarPath, 'bundle-data');
      fs.writeFileSync(manifestPath, '{}');
      fs.writeFileSync(checksumsPath, 'sha');

      generateGovernanceBundle.mockResolvedValueOnce({
        id: 'gov-2',
        tarPath,
        manifestPath,
        checksumsPath,
        sha256: 'abc123',
        counts: {
          auditEvents: 1,
          policyDecisions: 1,
          sbomRefs: 1,
          provenanceRefs: 1,
        },
        warnings: [],
        files: [],
        workspace: tempDir,
      });

      await request(app)
        .post('/disclosures/governance-bundle')
        .set('x-tenant-id', 'tenant-a')
        .send({
          tenantId: 'tenant-a',
          startTime: '2024-01-01T00:00:00Z',
          endTime: '2024-01-02T00:00:00Z',
        });

      const download = await request(app)
        .get('/disclosures/governance-bundle/gov-2/download')
        .set('x-tenant-id', 'tenant-a');

      expect(download.status).toBe(200);
      expect(download.headers['content-disposition']).toContain('attachment');

      const manifest = await request(app)
        .get('/disclosures/governance-bundle/gov-2/manifest')
        .set('x-tenant-id', 'tenant-a');

      expect(manifest.status).toBe(200);

      const checksums = await request(app)
        .get('/disclosures/governance-bundle/gov-2/checksums')
        .set('x-tenant-id', 'tenant-a');

      expect(checksums.status).toBe(200);

      fs.rmSync(tempDir, { recursive: true, force: true });
    });
  });
});
