import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/index';

describe('Supply Chain Service API', () => {
  let app: any;

  beforeAll(async () => {
    app = await createApp();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('supply-chain-service');
    });
  });

  describe('Network Topology', () => {
    it('should return network topology analysis', async () => {
      const response = await request(app).get('/api/network/topology');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalNodes');
      expect(response.body).toHaveProperty('totalRelationships');
      expect(response.body).toHaveProperty('networkDensity');
    });
  });

  describe('Nodes', () => {
    it('should create a new node', async () => {
      const nodeData = {
        type: 'supplier',
        name: 'Test Supplier',
        tier: 1,
        status: 'active',
        criticality: 'medium',
      };

      const response = await request(app)
        .post('/api/nodes')
        .send(nodeData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Supplier');
    });

    it('should get all nodes', async () => {
      const response = await request(app).get('/api/nodes');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('nodes');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.nodes)).toBe(true);
    });

    it('should search nodes by name', async () => {
      const response = await request(app)
        .get('/api/search/nodes')
        .query({ q: 'test' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('results');
      expect(Array.isArray(response.body.results)).toBe(true);
    });
  });

  describe('Dashboard', () => {
    it('should return dashboard data', async () => {
      const response = await request(app).get('/api/dashboard');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('overview');
      expect(response.body).toHaveProperty('criticality');
      expect(response.body).toHaveProperty('network');
    });
  });
});
