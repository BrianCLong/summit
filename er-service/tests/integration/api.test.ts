import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/index';
import type { Express } from 'express';

describe('ER Service API', () => {
  let app: Express;

  beforeEach(() => {
    app = createApp();
  });

  describe('POST /api/v1/candidates', () => {
    it('should find candidate matches', async () => {
      const requestBody = {
        tenantId: 'test-tenant',
        entity: {
          id: 'e1',
          type: 'person',
          name: 'John Smith',
          tenantId: 'test-tenant',
          attributes: { email: 'john@example.com' },
        },
        population: [
          {
            id: 'e2',
            type: 'person',
            name: 'Jon Smith',
            tenantId: 'test-tenant',
            attributes: { email: 'john@example.com' },
          },
          {
            id: 'e3',
            type: 'person',
            name: 'Jane Doe',
            tenantId: 'test-tenant',
            attributes: { email: 'jane@example.com' },
          },
        ],
        topK: 5,
      };

      const response = await request(app)
        .post('/api/v1/candidates')
        .send(requestBody)
        .expect(200);

      expect(response.body).toHaveProperty('requestId');
      expect(response.body).toHaveProperty('candidates');
      expect(response.body).toHaveProperty('method');
      expect(response.body).toHaveProperty('executionTimeMs');
      expect(Array.isArray(response.body.candidates)).toBe(true);
    });

    it('should reject invalid request', async () => {
      const response = await request(app)
        .post('/api/v1/candidates')
        .send({ invalid: 'data' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/merge', () => {
    it('should merge entities successfully', async () => {
      // Pre-store entities first
      await request(app)
        .post('/api/v1/entities')
        .send({
          id: 'merge-e1',
          type: 'person',
          name: 'John Smith',
          tenantId: 'test-tenant',
          attributes: { email: 'john@example.com' },
        })
        .expect(201);

      await request(app)
        .post('/api/v1/entities')
        .send({
          id: 'merge-e2',
          type: 'person',
          name: 'Jon Smith',
          tenantId: 'test-tenant',
          attributes: { email: 'john@example.com' },
        })
        .expect(201);

      const requestBody = {
        tenantId: 'test-tenant',
        entityIds: ['merge-e1', 'merge-e2'],
        actor: 'analyst@example.com',
        reason: 'Duplicate detection',
        policyTags: ['er:manual-review'],
      };

      const response = await request(app)
        .post('/api/v1/merge')
        .send(requestBody)
        .expect(201);

      expect(response.body).toHaveProperty('mergeId');
      expect(response.body).toHaveProperty('primaryId');
      expect(response.body).toHaveProperty('mergedIds');
      expect(response.body).toHaveProperty('reversible');
      expect(response.body.reversible).toBe(true);
    });

    it('should reject merge with less than 2 entities', async () => {
      const requestBody = {
        tenantId: 'test-tenant',
        entityIds: ['e1'],
        actor: 'analyst@example.com',
        reason: 'Test',
      };

      const response = await request(app)
        .post('/api/v1/merge')
        .send(requestBody)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/merge/:mergeId/revert', () => {
    it('should revert merge successfully', async () => {
      // Pre-store entities
      await request(app)
        .post('/api/v1/entities')
        .send({ id: 'revert-e1', type: 'person', name: 'Test User 1', tenantId: 'test-tenant', attributes: {} })
        .expect(201);
      await request(app)
        .post('/api/v1/entities')
        .send({ id: 'revert-e2', type: 'person', name: 'Test User 2', tenantId: 'test-tenant', attributes: {} })
        .expect(201);

      // Create a merge
      const mergeResponse = await request(app)
        .post('/api/v1/merge')
        .send({
          tenantId: 'test-tenant',
          entityIds: ['revert-e1', 'revert-e2'],
          actor: 'analyst@example.com',
          reason: 'Test merge',
        })
        .expect(201);

      const mergeId = mergeResponse.body.mergeId;

      // Then revert it
      const revertResponse = await request(app)
        .post(`/api/v1/merge/${mergeId}/revert`)
        .send({
          actor: 'supervisor@example.com',
          reason: 'False positive',
        })
        .expect(200);

      expect(revertResponse.body).toHaveProperty('success');
      expect(revertResponse.body.success).toBe(true);
    });

    it('should reject revert without required fields', async () => {
      await request(app)
        .post('/api/v1/merge/some-id/revert')
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/v1/split', () => {
    it('should split entity successfully', async () => {
      // Pre-store entity
      await request(app)
        .post('/api/v1/entities')
        .send({ id: 'split-e1', type: 'person', name: 'Combined Identity', tenantId: 'test-tenant', attributes: { context: 'mixed' } })
        .expect(201);

      const requestBody = {
        tenantId: 'test-tenant',
        entityId: 'split-e1',
        splitGroups: [
          { attributes: { context: 'work' } },
          { attributes: { context: 'personal' } },
        ],
        actor: 'analyst@example.com',
        reason: 'Separate identities',
      };

      const response = await request(app)
        .post('/api/v1/split')
        .send(requestBody)
        .expect(201);

      expect(response.body).toHaveProperty('splitId');
      expect(response.body).toHaveProperty('originalEntityId');
      expect(response.body).toHaveProperty('newEntityIds');
      expect(response.body.newEntityIds.length).toBe(2);
    });

    it('should reject split with less than 2 groups', async () => {
      const requestBody = {
        tenantId: 'test-tenant',
        entityId: 'e1',
        splitGroups: [{ attributes: {} }],
        actor: 'analyst@example.com',
        reason: 'Test',
      };

      const response = await request(app)
        .post('/api/v1/split')
        .send(requestBody)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/explain/:mergeId', () => {
    it('should explain merge decision', async () => {
      // Pre-store entities
      await request(app)
        .post('/api/v1/entities')
        .send({ id: 'explain-e1', type: 'person', name: 'John Doe', tenantId: 'test-tenant', attributes: {} })
        .expect(201);
      await request(app)
        .post('/api/v1/entities')
        .send({ id: 'explain-e2', type: 'person', name: 'Jon Doe', tenantId: 'test-tenant', attributes: {} })
        .expect(201);

      // Create a merge
      const mergeResponse = await request(app)
        .post('/api/v1/merge')
        .send({
          tenantId: 'test-tenant',
          entityIds: ['explain-e1', 'explain-e2'],
          actor: 'analyst@example.com',
          reason: 'Test merge',
        })
        .expect(201);

      const mergeId = mergeResponse.body.mergeId;

      // Get explanation
      const explainResponse = await request(app)
        .get(`/api/v1/explain/${mergeId}`)
        .expect(200);

      expect(explainResponse.body).toHaveProperty('mergeId');
      expect(explainResponse.body).toHaveProperty('features');
      expect(explainResponse.body).toHaveProperty('rationale');
      expect(explainResponse.body).toHaveProperty('featureWeights');
      expect(explainResponse.body).toHaveProperty('threshold');
      expect(Array.isArray(explainResponse.body.rationale)).toBe(true);
    });

    it('should return 500 for non-existent merge', async () => {
      await request(app)
        .get('/api/v1/explain/non-existent-id')
        .expect(500);
    });
  });

  describe('GET /api/v1/audit', () => {
    it('should retrieve audit log', async () => {
      // Create some operations
      await request(app)
        .post('/api/v1/merge')
        .send({
          tenantId: 'test-tenant',
          entityIds: ['e1', 'e2'],
          actor: 'analyst@example.com',
          reason: 'Test',
        });

      const response = await request(app)
        .get('/api/v1/audit?tenantId=test-tenant')
        .expect(200);

      expect(response.body).toHaveProperty('entries');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.entries)).toBe(true);
    });

    it('should filter audit log by event type', async () => {
      const response = await request(app)
        .get('/api/v1/audit?event=merge&limit=10')
        .expect(200);

      expect(response.body.entries.length).toBeLessThanOrEqual(10);
    });
  });

  describe('GET /api/v1/stats', () => {
    it('should return statistics', async () => {
      const response = await request(app)
        .get('/api/v1/stats')
        .expect(200);

      expect(response.body).toHaveProperty('merges');
      expect(response.body).toHaveProperty('splits');
      expect(response.body).toHaveProperty('explanations');
      expect(response.body).toHaveProperty('auditEntries');
    });
  });

  describe('GET /api/v1/health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('healthy');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});
