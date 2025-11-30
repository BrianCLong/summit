/**
 * API Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../server.js';
import { resetRepository } from '../repository.js';

describe('Threat Library API', () => {
  beforeEach(() => {
    resetRepository();
  });

  afterEach(() => {
    resetRepository();
  });

  describe('Health Endpoints', () => {
    it('GET /health should return healthy status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('threat-library-service');
    });

    it('GET /health/ready should return ready status', async () => {
      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ready');
      expect(response.body.statistics).toBeDefined();
    });
  });

  describe('Threat Archetype Endpoints', () => {
    const validThreat = {
      name: 'Test APT',
      description: 'Test description',
      summary: 'Test summary',
      sophistication: 'ADVANCED',
      motivation: ['ESPIONAGE'],
      targetSectors: ['GOVERNMENT'],
      typicalTTPs: [],
      patternTemplates: [],
      indicators: [],
      countermeasures: [
        { id: 'c1', name: 'Counter', description: 'Test', effectiveness: 'HIGH' },
      ],
      riskScore: 75,
      prevalence: 'COMMON',
      active: true,
      status: 'ACTIVE',
    };

    it('POST /api/v1/threats should create a threat', async () => {
      const response = await request(app)
        .post('/api/v1/threats')
        .set('x-author', 'test-user')
        .send(validThreat);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test APT');
      expect(response.body.data.id).toBeDefined();
    });

    it('GET /api/v1/threats should list threats', async () => {
      // Create a threat first
      await request(app)
        .post('/api/v1/threats')
        .set('x-author', 'test')
        .send(validThreat);

      const response = await request(app).get('/api/v1/threats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items.length).toBe(1);
    });

    it('GET /api/v1/threats/:id should get a specific threat', async () => {
      const createResponse = await request(app)
        .post('/api/v1/threats')
        .set('x-author', 'test')
        .send(validThreat);

      const threatId = createResponse.body.data.id;

      const response = await request(app).get(`/api/v1/threats/${threatId}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(threatId);
    });

    it('GET /api/v1/threats/:id should return 404 for non-existent threat', async () => {
      const response = await request(app).get('/api/v1/threats/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('PUT /api/v1/threats/:id should update a threat', async () => {
      const createResponse = await request(app)
        .post('/api/v1/threats')
        .set('x-author', 'test')
        .send(validThreat);

      const threatId = createResponse.body.data.id;

      const response = await request(app)
        .put(`/api/v1/threats/${threatId}`)
        .set('x-author', 'updater')
        .set('x-change-description', 'Updated name')
        .send({ name: 'Updated APT' });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Updated APT');
      expect(response.body.data.metadata.version).toBe(2);
    });

    it('POST /api/v1/threats/:id/deprecate should deprecate a threat', async () => {
      const createResponse = await request(app)
        .post('/api/v1/threats')
        .set('x-author', 'test')
        .send(validThreat);

      const threatId = createResponse.body.data.id;

      const response = await request(app)
        .post(`/api/v1/threats/${threatId}/deprecate`)
        .set('x-author', 'deprecator');

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('DEPRECATED');
    });

    it('DELETE /api/v1/threats/:id should archive a threat', async () => {
      const createResponse = await request(app)
        .post('/api/v1/threats')
        .set('x-author', 'test')
        .send(validThreat);

      const threatId = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/v1/threats/${threatId}`)
        .set('x-author', 'archiver');

      expect(response.status).toBe(204);

      // Verify it's archived
      const getResponse = await request(app).get(`/api/v1/threats/${threatId}`);
      expect(getResponse.body.data.status).toBe('ARCHIVED');
    });

    it('GET /api/v1/threats should filter by status', async () => {
      await request(app)
        .post('/api/v1/threats')
        .set('x-author', 'test')
        .send(validThreat);

      await request(app)
        .post('/api/v1/threats')
        .set('x-author', 'test')
        .send({ ...validThreat, name: 'Deprecated', status: 'DEPRECATED' });

      const response = await request(app).get('/api/v1/threats?status=ACTIVE');

      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.items[0].name).toBe('Test APT');
    });

    it('GET /api/v1/threats should support pagination', async () => {
      // Create 5 threats
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/threats')
          .set('x-author', 'test')
          .send({ ...validThreat, name: `Threat ${i}` });
      }

      const response = await request(app).get('/api/v1/threats?page=1&limit=2');

      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(2);
      expect(response.body.data.pagination.total).toBe(5);
      expect(response.body.data.pagination.totalPages).toBe(3);
    });
  });

  describe('TTP Endpoints', () => {
    const validTTP = {
      name: 'Test TTP',
      description: 'Test TTP description',
      tactic: 'INITIAL_ACCESS',
      techniqueId: 'T1566',
      techniqueName: 'Phishing',
      procedures: [],
      platforms: ['WINDOWS'],
      dataSources: ['Email'],
      mitreReference: {
        techniqueId: 'T1566',
        techniqueName: 'Phishing',
        tacticIds: ['TA0001'],
        mitreUrl: 'https://attack.mitre.org/techniques/T1566/',
      },
      severity: 'HIGH',
      prevalence: 'COMMON',
      status: 'ACTIVE',
    };

    it('POST /api/v1/ttps should create a TTP', async () => {
      const response = await request(app)
        .post('/api/v1/ttps')
        .set('x-author', 'test')
        .send(validTTP);

      expect(response.status).toBe(201);
      expect(response.body.data.techniqueId).toBe('T1566');
    });

    it('GET /api/v1/ttps should list TTPs', async () => {
      await request(app)
        .post('/api/v1/ttps')
        .set('x-author', 'test')
        .send(validTTP);

      const response = await request(app).get('/api/v1/ttps');

      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1);
    });

    it('GET /api/v1/ttps/technique/:techniqueId should get TTPs by technique', async () => {
      await request(app)
        .post('/api/v1/ttps')
        .set('x-author', 'test')
        .send(validTTP);

      const response = await request(app).get('/api/v1/ttps/technique/T1566');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
    });
  });

  describe('Pattern Endpoints', () => {
    const validPattern = {
      name: 'Test Pattern',
      description: 'Test pattern',
      category: 'LATERAL_MOVEMENT',
      graphMotifs: [
        {
          id: 'motif-1',
          name: 'Test Motif',
          description: 'Test',
          nodes: [{ id: 'n1', type: 'THREAT_ACTOR' }],
          edges: [],
          weight: 1,
        },
      ],
      signals: [],
      indicators: [],
      ttps: [],
      requiredMotifMatches: 1,
      requiredSignalMatches: 0,
      severity: 'HIGH',
      status: 'ACTIVE',
    };

    it('POST /api/v1/patterns should create a pattern', async () => {
      const response = await request(app)
        .post('/api/v1/patterns')
        .set('x-author', 'test')
        .send(validPattern);

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('Test Pattern');
    });

    it('GET /api/v1/patterns/:id/validate should validate pattern coverage', async () => {
      const createResponse = await request(app)
        .post('/api/v1/patterns')
        .set('x-author', 'test')
        .send(validPattern);

      const patternId = createResponse.body.data.id;

      const response = await request(app).get(`/api/v1/patterns/${patternId}/validate`);

      expect(response.status).toBe(200);
      expect(response.body.data.coverage).toBeDefined();
      expect(response.body.data.coverage.hasGraphMotifs).toBe(true);
    });
  });

  describe('Indicator Endpoints', () => {
    const validIndicator = {
      name: 'Test Indicator',
      description: 'Test indicator',
      type: 'IP_ADDRESS',
      pattern: '10.0.0.0/8',
      patternFormat: 'LITERAL',
      confidence: 'HIGH',
      severity: 'MEDIUM',
      validFrom: new Date().toISOString(),
      status: 'ACTIVE',
    };

    it('POST /api/v1/indicators should create an indicator', async () => {
      const response = await request(app)
        .post('/api/v1/indicators')
        .set('x-author', 'test')
        .send(validIndicator);

      expect(response.status).toBe(201);
      expect(response.body.data.type).toBe('IP_ADDRESS');
    });

    it('GET /api/v1/indicators should list indicators', async () => {
      await request(app)
        .post('/api/v1/indicators')
        .set('x-author', 'test')
        .send(validIndicator);

      const response = await request(app).get('/api/v1/indicators');

      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1);
    });
  });

  describe('Detection Integration Endpoints', () => {
    it('POST /api/v1/evaluate should generate pattern evaluation spec', async () => {
      // Create pattern first
      const patternResponse = await request(app)
        .post('/api/v1/patterns')
        .set('x-author', 'test')
        .send({
          name: 'Test Pattern',
          description: 'Test pattern',
          category: 'LATERAL_MOVEMENT',
          graphMotifs: [
            {
              id: 'motif-1',
              name: 'Test Motif',
              description: 'Test',
              nodes: [
                { id: 'n1', type: 'THREAT_ACTOR' },
                { id: 'n2', type: 'ASSET' },
              ],
              edges: [
                {
                  id: 'e1',
                  sourceNodeId: 'n1',
                  targetNodeId: 'n2',
                  type: 'TARGETS',
                  direction: 'OUTGOING',
                },
              ],
              weight: 1,
            },
          ],
          signals: [],
          indicators: [],
          ttps: [],
          requiredMotifMatches: 1,
          requiredSignalMatches: 0,
          severity: 'HIGH',
          status: 'ACTIVE',
        });

      const patternId = patternResponse.body.data.id;

      const response = await request(app).post('/api/v1/evaluate').send({
        patternId,
        evaluationOptions: {
          maxMatches: 50,
          minConfidence: 0.5,
          includePartialMatches: false,
          timeout: 30000,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.specId).toBeDefined();
      expect(response.body.data.cypherQueries.length).toBeGreaterThan(0);
    });
  });

  describe('Explanation Endpoints', () => {
    it('GET /api/v1/threats/:threatId/explain should generate explanation', async () => {
      const threatResponse = await request(app)
        .post('/api/v1/threats')
        .set('x-author', 'test')
        .send({
          name: 'Test APT',
          description: 'Test description',
          summary: 'Test summary',
          sophistication: 'EXPERT',
          motivation: ['ESPIONAGE'],
          targetSectors: ['GOVERNMENT'],
          typicalTTPs: [],
          patternTemplates: [],
          indicators: [],
          countermeasures: [
            { id: 'c1', name: 'Counter', description: 'Test', effectiveness: 'HIGH' },
          ],
          riskScore: 85,
          prevalence: 'COMMON',
          active: true,
          status: 'ACTIVE',
        });

      const threatId = threatResponse.body.data.id;

      const response = await request(app).get(`/api/v1/threats/${threatId}/explain`);

      expect(response.status).toBe(200);
      expect(response.body.data.threatId).toBe(threatId);
      expect(response.body.data.explanation).toBeDefined();
      expect(response.body.data.severity).toBe('CRITICAL');
    });

    it('GET /api/v1/threats/:threatId/explain/brief should generate brief explanation', async () => {
      const threatResponse = await request(app)
        .post('/api/v1/threats')
        .set('x-author', 'test')
        .send({
          name: 'Test APT',
          description: 'Test description',
          summary: 'Brief summary',
          sophistication: 'ADVANCED',
          motivation: ['FINANCIAL_GAIN'],
          targetSectors: ['FINANCIAL'],
          typicalTTPs: [],
          patternTemplates: [],
          indicators: [],
          countermeasures: [],
          riskScore: 60,
          prevalence: 'COMMON',
          active: true,
          status: 'ACTIVE',
        });

      const threatId = threatResponse.body.data.id;

      const response = await request(app).get(
        `/api/v1/threats/${threatId}/explain/brief`
      );

      expect(response.status).toBe(200);
      expect(response.body.data.summary).toBe('Brief summary');
      expect(response.body.data.severity).toBe('HIGH');
    });
  });

  describe('Statistics Endpoint', () => {
    it('GET /api/v1/statistics should return library statistics', async () => {
      const response = await request(app).get('/api/v1/statistics');

      expect(response.status).toBe(200);
      expect(response.body.data.threatArchetypes).toBeDefined();
      expect(response.body.data.ttps).toBeDefined();
      expect(response.body.data.patterns).toBeDefined();
      expect(response.body.data.indicators).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const response = await request(app).get('/api/v1/unknown');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should handle validation errors', async () => {
      const response = await request(app).post('/api/v1/evaluate').send({
        // Missing required fields
        evaluationOptions: {},
      });

      expect(response.status).toBe(400);
    });
  });
});
