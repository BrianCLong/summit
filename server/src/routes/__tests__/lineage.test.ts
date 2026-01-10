import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import express, { Express } from 'express';
import request from 'supertest';

const run = process.env.NO_NETWORK_LISTEN !== 'true';
const describeIf = run ? describe : describe.skip;

describeIf('lineage route', () => {
  let app: Express;
  const originalEnv = process.env;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv };
    const lineageRouter = (await import('../lineage.js')).default;
    app = express();
    app.use(express.json());
    app.use('/api/lineage', lineageRouter);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('GET /:id', () => {
    it('returns lineage graph for a known id', async () => {
      const response = await request(app).get('/api/lineage/evidence-123');
      expect(response.status).toBe(200);
      expect(response.body.targetId).toBe('evidence-123');
      expect(response.body.mode).toBe('read-only');
      expect(response.body.upstream).toHaveLength(2);
      expect(response.body.downstream).toHaveLength(2);
      expect(response.body.policyTags).toContain('PII');
    });

    it('returns restricted context without leaking upstream details', async () => {
      const response = await request(app).get('/api/lineage/case-locked');
      expect(response.status).toBe(200);
      expect(response.body.restricted).toBe(true);
      expect(response.body.restrictionReason).toMatch(/warrant/i);
      expect(response.body.upstream[0].restricted).toBe(true);
    });

    it('returns 404 for unknown ids', async () => {
      const response = await request(app).get('/api/lineage/unknown');
      expect(response.status).toBe(404);
    });
  });

  describe('GET /graph', () => {
    it('returns a 404 if the feature flag is not enabled', async () => {
      process.env.LINEAGE_UI_CONTRACT = 'false';
      const lineageRouter = (await import('../lineage.js')).default;
      const newApp = express();
      newApp.use(express.json());
      newApp.use('/api/lineage', lineageRouter);
      const response = await request(newApp).get('/api/lineage/graph?entityId=1&fieldPath=1');
      expect(response.status).toBe(404);
    });

    it('returns the lineage graph fixture when the feature flag is enabled', async () => {
      process.env.LINEAGE_UI_CONTRACT = 'true';
      const lineageRouter = (await import('../lineage.js')).default;
      const newApp = express();
      newApp.use(express.json());
      newApp.use('/api/lineage', lineageRouter);
      const response = await request(newApp).get('/api/lineage/graph?entityId=1&fieldPath=1');
      expect(response.status).toBe(200);
      expect(response.body.nodes).toBeDefined();
      expect(response.body.edges).toBeDefined();
      expect(response.body.nodes.length).toBe(5);
    });

    it('returns a bad request if entityId or fieldPath is missing', async () => {
      process.env.LINEAGE_UI_CONTRACT = 'true';
      const lineageRouter = (await import('../lineage.js')).default;
      const newApp = express();
      newApp.use(express.json());
      newApp.use('/api/lineage', lineageRouter);
      const res1 = await request(newApp).get('/api/lineage/graph?entityId=1');
      expect(res1.status).toBe(400);
      const res2 = await request(newApp).get('/api/lineage/graph?fieldPath=1');
      expect(res2.status).toBe(400);
    });

    it('collapses nodes when the collapse query param is used', async () => {
      process.env.LINEAGE_UI_CONTRACT = 'true';
      const lineageRouter = (await import('../lineage.js')).default;
      const newApp = express();
      newApp.use(express.json());
      newApp.use('/api/lineage', lineageRouter);
      const response = await request(newApp).get('/api/lineage/graph?entityId=1&fieldPath=1&collapse=evidence');
      expect(response.status).toBe(200);
      expect(response.body.nodes.length).toBe(3);
      expect(response.body.edges.length).toBe(2);
    });
  });
});
