import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import searchRouter from '../search';

const mockSearch = vi.fn();
vi.mock('../../lib/typesense', () => ({
  typesenseClient: {
    collections: vi.fn().mockImplementation(() => ({
      documents: vi.fn().mockImplementation(() => ({
        search: mockSearch,
      })),
    })),
  },
}));

describe('Search Router', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());

    app.use((req: any, res, next) => {
      const roles = req.headers['x-mock-user-roles'];
      const clearance = req.headers['x-mock-clearance'];
      const tenantId = req.headers['x-mock-tenant'];

      req.user = {};

      if (roles) {
        req.user.roles = roles.split(',');
      }
      if (clearance) {
        req.user.clearance = parseInt(clearance, 10);
      }
      if (tenantId) {
        req.user.tenantId = tenantId;
      }
      next();
    });

    app.use(searchRouter);
  });

  describe('POST /v1/search', () => {
    it('returns 400 when missing collection', async () => {
      const response = await request(app)
        .post('/v1/search')
        .send({ q: 'query' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Missing collection' });
    });

    it('performs search with correct tenant and security filters', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: [{ document: { id: '1', title: 'Test doc' } }]
      });

      const response = await request(app)
        .post('/v1/search')
        .set('x-mock-tenant', 'tenant-1')
        .set('x-mock-clearance', '3')
        .send({
          q: 'query',
          collection: 'reports',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        hits: [{ document: { id: '1', title: 'Test doc' } }]
      });

      expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({
        q: 'query',
        filter_by: 'tenant:=tenant-1 && classification:<= 3'
      }));
    });

    it('appends user filter_by to the base filters', async () => {
      mockSearch.mockResolvedValueOnce({ hits: [] });

      await request(app)
        .post('/v1/search')
        .set('x-mock-tenant', 'tenant-1')
        .set('x-mock-clearance', '1')
        .send({
          q: 'query',
          collection: 'reports',
          filter_by: 'status:active'
        });

      expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({
        filter_by: 'tenant:=tenant-1 && classification:<= 1 && (status:active)'
      }));
    });

    it('handles typesense errors', async () => {
      mockSearch.mockRejectedValueOnce(new Error('Typesense connection failed'));

      const response = await request(app)
        .post('/v1/search')
        .send({
          q: 'query',
          collection: 'reports'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Typesense connection failed');
    });
  });

  describe('POST /v1/search/suggest', () => {
    it('returns 400 when missing collection', async () => {
      const response = await request(app)
        .post('/v1/search/suggest')
        .send({ q: 'query' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Missing collection' });
    });

    it('performs suggest with correct tenant and security filters', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: [{ document: { id: '1', title: 'Test suggest' } }]
      });

      const response = await request(app)
        .post('/v1/search/suggest')
        .set('x-mock-tenant', 'tenant-2')
        .set('x-mock-clearance', '2')
        .send({
          q: 'test',
          collection: 'reports',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        hits: [{ document: { id: '1', title: 'Test suggest' } }]
      });

      expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({
        q: 'test',
        filter_by: 'tenant:=tenant-2 && classification:<= 2',
        per_page: 5
      }));
    });
  });

  describe('POST /v1/search/admin/reindex', () => {
    it('blocks unauthorized access (no roles)', async () => {
      const res = await request(app)
        .post('/v1/search/admin/reindex')
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Forbidden');
    });

    it('allows authorized access (admin role)', async () => {
      const res = await request(app)
        .post('/v1/search/admin/reindex')
        .set('x-mock-user-roles', 'admin')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('triggered');
    });

    it('blocks access for wrong role', async () => {
      const res = await request(app)
        .post('/v1/search/admin/reindex')
        .set('x-mock-user-roles', 'user,editor')
        .send({});

      expect(res.status).toBe(403);
    });
  });
});
