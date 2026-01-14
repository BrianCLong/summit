// @ts-nocheck
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { provenanceRoutes } from '../provenance-routes.js';
import { getPostgresPool } from '../../../db/postgres.js';

// Mock dependencies
vi.mock('../../../db/postgres.js', () => ({
  getPostgresPool: vi.fn(),
}));

vi.mock('../../../usage/usage-ledger.js', () => ({
  usageLedger: {
    recordUsage: vi.fn(),
  },
}));

vi.mock('../../../config/logger.js', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Provenance Routes', () => {
  let app: express.Application;
  let mockPool: any;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Mock authentication middleware
    app.use((req, res, next) => {
      (req as any).user = {
        userId: 'test-user',
        sub: 'test-user',
        email: 'test@example.com',
        tenantId: 'test-tenant',
        roles: ['operator'],
      };
      next();
    });

    app.use('/api/ops/provenance', provenanceRoutes);
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockPool = {
      query: vi.fn(),
    };
    (getPostgresPool as any).mockReturnValue(mockPool);
  });

  describe('GET /api/ops/provenance/summary', () => {
    it('should return provenance summary successfully', async () => {
      const mockRuns = [
        {
          id: 'run-1',
          runbook: 'test-runbook',
          status: 'success',
          started_at: new Date('2026-01-01T00:00:00Z'),
          ended_at: new Date('2026-01-01T00:05:00Z'),
          tenant_id: 'test-tenant',
          created_by: 'user-1',
          artifact_count: '2',
          artifact_types: ['receipt', 'log'],
        },
      ];

      mockPool.query.mockResolvedValue({ rows: mockRuns });

      const response = await request(app)
        .get('/api/ops/provenance/summary')
        .query({ limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe('run-1');
      expect(response.body.data[0].type).toBe('run');
      expect(response.body.data[0].integrity.verified).toBe(true);
      expect(response.body.pagination).toMatchObject({
        limit: 10,
        offset: 0,
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/ops/provenance/summary');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to load provenance summary');
    });

    it('should respect limit and offset parameters', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await request(app)
        .get('/api/ops/provenance/summary')
        .query({ limit: 25, offset: 50 });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [25, 50]
      );
    });

    it('should cap limit at 200', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await request(app)
        .get('/api/ops/provenance/summary')
        .query({ limit: 500 });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [200, 0]
      );
    });
  });

  describe('GET /api/ops/provenance/item/:id', () => {
    it('should return full provenance details successfully', async () => {
      const mockRun = {
        id: 'run-1',
        runbook: 'test-runbook',
        status: 'success',
        started_at: new Date('2026-01-01T00:00:00Z'),
        ended_at: new Date('2026-01-01T00:05:00Z'),
        tenant_id: 'test-tenant',
        created_by: 'user-1',
      };

      const mockEvents = [
        {
          kind: 'started',
          ts: new Date('2026-01-01T00:00:00Z').toISOString(),
        },
        {
          kind: 'completed',
          ts: new Date('2026-01-01T00:05:00Z').toISOString(),
        },
      ];

      const mockArtifacts = [
        {
          id: 'artifact-1',
          artifact_type: 'receipt',
          sha256_hash: 'abc123',
          s3_key: 's3://bucket/key',
        },
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockRun] })
        .mockResolvedValueOnce({ rows: mockEvents })
        .mockResolvedValueOnce({ rows: mockArtifacts });

      const response = await request(app)
        .get('/api/ops/provenance/item/run-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('run-1');
      expect(response.body.data.inputs).toBeDefined();
      expect(response.body.data.outputs).toHaveLength(1);
      expect(response.body.data.steps).toHaveLength(2);
      expect(response.body.data.integrity.verified).toBe(true);
    });

    it('should return 404 for non-existent item', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/ops/provenance/item/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Provenance item not found');
    });

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValue(new Error('Query failed'));

      const response = await request(app)
        .get('/api/ops/provenance/item/run-1');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/ops/provenance/search', () => {
    it('should search with query parameter', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await request(app)
        .get('/api/ops/provenance/search')
        .query({ q: 'test-query' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining(['%test-query%'])
      );
    });

    it('should filter by date range', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await request(app)
        .get('/api/ops/provenance/search')
        .query({
          from: '2026-01-01',
          to: '2026-01-31',
        });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('started_at >='),
        expect.arrayContaining(['2026-01-01', '2026-01-31'])
      );
    });

    it('should filter by status', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await request(app)
        .get('/api/ops/provenance/search')
        .query({ status: 'failed' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('status ='),
        expect.arrayContaining(['failed'])
      );
    });

    it('should combine multiple filters', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await request(app)
        .get('/api/ops/provenance/search')
        .query({
          q: 'test',
          status: 'success',
          from: '2026-01-01',
        });

      const callArgs = mockPool.query.mock.calls[0];
      expect(callArgs[0]).toContain('ILIKE');
      expect(callArgs[0]).toContain('status =');
      expect(callArgs[0]).toContain('started_at >=');
    });
  });

  describe('POST /api/ops/provenance/evidence-pack', () => {
    it('should generate evidence pack successfully', async () => {
      const mockRun = {
        id: 'run-1',
        runbook: 'test-runbook',
        status: 'success',
        started_at: new Date('2026-01-01T00:00:00Z'),
        ended_at: new Date('2026-01-01T00:05:00Z'),
        tenant_id: 'test-tenant',
        created_by: 'user-1',
        artifacts: [
          {
            id: 'artifact-1',
            type: 'receipt',
            hash: 'abc123',
            size: 1024,
            createdAt: new Date('2026-01-01T00:05:00Z'),
          },
        ],
      };

      mockPool.query.mockResolvedValue({ rows: [mockRun] });

      const response = await request(app)
        .post('/api/ops/provenance/evidence-pack')
        .send({ ids: ['run-1'], format: 'json' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.payload).toBeDefined();
      expect(response.body.data.payload.version).toBe('1.0.0');
      expect(response.body.data.payload.items).toHaveLength(1);
      expect(response.body.data.payload.metadata.itemCount).toBe(1);
    });

    it('should reject request without ids', async () => {
      const response = await request(app)
        .post('/api/ops/provenance/evidence-pack')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ids array is required');
    });

    it('should reject request with empty ids array', async () => {
      const response = await request(app)
        .post('/api/ops/provenance/evidence-pack')
        .send({ ids: [] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ids array is required');
    });

    it('should reject request with too many ids', async () => {
      const ids = Array.from({ length: 101 }, (_, i) => `run-${i}`);

      const response = await request(app)
        .post('/api/ops/provenance/evidence-pack')
        .send({ ids });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Maximum 100 items per evidence pack');
    });

    it('should return 404 when no items found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post('/api/ops/provenance/evidence-pack')
        .send({ ids: ['non-existent'] });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('No matching items found');
    });

    it('should support download format', async () => {
      const mockRun = {
        id: 'run-1',
        runbook: 'test-runbook',
        status: 'success',
        started_at: new Date(),
        ended_at: new Date(),
        tenant_id: 'test-tenant',
        created_by: 'user-1',
        artifacts: [],
      };

      mockPool.query.mockResolvedValue({ rows: [mockRun] });

      const response = await request(app)
        .post('/api/ops/provenance/evidence-pack')
        .send({ ids: ['run-1'], format: 'download' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.body.version).toBe('1.0.0');
    });
  });

  describe('GET /api/ops/provenance/health', () => {
    it('should return healthy status', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ count: '42' }] });

      const response = await request(app)
        .get('/api/ops/provenance/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.database).toBe('connected');
      expect(response.body.runCount).toBe(42);
    });

    it('should return unhealthy status on database error', async () => {
      mockPool.query.mockRejectedValue(new Error('Connection refused'));

      const response = await request(app)
        .get('/api/ops/provenance/health');

      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unhealthy');
      expect(response.body.error).toBe('Connection refused');
    });
  });

  describe('Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      const appNoAuth = express();
      appNoAuth.use(express.json());
      appNoAuth.use('/api/ops/provenance', provenanceRoutes);

      // Test without authentication
      const response = await request(appNoAuth)
        .get('/api/ops/provenance/summary');

      // Should fail without authentication
      expect(response.status).toBe(401);
    });
  });
});
