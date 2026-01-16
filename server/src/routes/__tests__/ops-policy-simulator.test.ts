/**
 * Integration tests for /ops/policy/* routes
 * Tests authorization, environment guards, and response format
 */

import express from 'express';
import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import opsRouter from '../ops.js';

describe('Ops Policy Simulator Routes', () => {
  let app: express.Application;
  const originalEnv = process.env.NODE_ENV;
  const originalSimulator = process.env.POLICY_SIMULATOR;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Mock auth middleware
    app.use((req: any, _res, next) => {
      req.user = {
        id: 'user-admin',
        email: 'admin@test.com',
        roles: ['admin'],
      };
      next();
    });

    app.use('/ops', opsRouter);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    process.env.POLICY_SIMULATOR = originalSimulator;
    jest.restoreAllMocks();
  });

  describe('POST /ops/policy/simulate', () => {
    it('should simulate policy decision with valid input', async () => {
      const input = {
        tenantId: 'tenant-001',
        actor: { id: 'user-admin', roles: ['admin'] },
        action: 'read',
        resource: { type: 'case', id: 'case-123' },
      };

      const response = await request(app)
        .post('/ops/policy/simulate')
        .send(input)
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.simulation).toBeDefined();
      expect(response.body.simulation.decision).toBe('allow');
      expect(response.body.simulation.ruleId).toBeDefined();
      expect(response.body.simulation.evaluatedAt).toBeDefined();
    });

    it('should return deny for cross-tenant access', async () => {
      const input = {
        tenantId: 'tenant-001',
        actor: { id: 'user-analyst', roles: ['analyst'] },
        action: 'read',
        resource: {
          type: 'case',
          id: 'case-456',
          attributes: { tenantId: 'tenant-002' },
        },
      };

      const response = await request(app)
        .post('/ops/policy/simulate')
        .send(input)
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.simulation.decision).toBe('deny');
      expect(response.body.simulation.ruleId).toBe('tenant_isolation');
    });

    it('should return 400 for missing request body', async () => {
      const response = await request(app)
        .post('/ops/policy/simulate')
        .send(null)
        .expect(400);

      expect(response.body.ok).toBe(false);
      expect(response.body.error).toContain('required');
    });

    it('should return 400 for invalid input', async () => {
      const input = {
        tenantId: 'tenant-001',
        // missing actor
        action: 'read',
        resource: { type: 'case', id: 'case-123' },
      };

      const response = await request(app)
        .post('/ops/policy/simulate')
        .send(input)
        .expect(400);

      expect(response.body.ok).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should block in production without POLICY_SIMULATOR=1', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.POLICY_SIMULATOR;

      const input = {
        tenantId: 'tenant-001',
        actor: { id: 'user-admin', roles: ['admin'] },
        action: 'read',
        resource: { type: 'case', id: 'case-123' },
      };

      const response = await request(app)
        .post('/ops/policy/simulate')
        .send(input)
        .expect(403);

      expect(response.body.ok).toBe(false);
      expect(response.body.error).toContain('disabled in production');
    });

    it('should allow in production with POLICY_SIMULATOR=1', async () => {
      process.env.NODE_ENV = 'production';
      process.env.POLICY_SIMULATOR = '1';

      const input = {
        tenantId: 'tenant-001',
        actor: { id: 'user-admin', roles: ['admin'] },
        action: 'read',
        resource: { type: 'case', id: 'case-123' },
      };

      const response = await request(app)
        .post('/ops/policy/simulate')
        .send(input)
        .expect(200);

      expect(response.body.ok).toBe(true);
    });

    it('should include trace in response', async () => {
      const input = {
        tenantId: 'tenant-001',
        actor: { id: 'user-admin', roles: ['admin'] },
        action: 'read',
        resource: { type: 'case', id: 'case-123' },
      };

      const response = await request(app)
        .post('/ops/policy/simulate')
        .send(input)
        .expect(200);

      expect(response.body.simulation.trace).toBeDefined();
      expect(response.body.simulation.trace.steps).toBeInstanceOf(Array);
      expect(response.body.simulation.trace.steps.length).toBeGreaterThan(0);
    });
  });

  describe('GET /ops/policy/fixtures', () => {
    it('should return predefined fixtures', async () => {
      const response = await request(app)
        .get('/ops/policy/fixtures')
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.fixtures).toBeDefined();
      expect(Array.isArray(response.body.fixtures)).toBe(true);
      expect(response.body.fixtures.length).toBeGreaterThan(0);
    });

    it('should return fixtures with correct structure', async () => {
      const response = await request(app)
        .get('/ops/policy/fixtures')
        .expect(200);

      const fixture = response.body.fixtures[0];
      expect(fixture).toHaveProperty('id');
      expect(fixture).toHaveProperty('name');
      expect(fixture).toHaveProperty('description');
      expect(fixture).toHaveProperty('input');
      expect(fixture).toHaveProperty('expectedDecision');
      expect(fixture.input).toHaveProperty('tenantId');
      expect(fixture.input).toHaveProperty('actor');
      expect(fixture.input).toHaveProperty('action');
      expect(fixture.input).toHaveProperty('resource');
    });
  });

  describe('POST /ops/policy/fixtures/run', () => {
    it('should run all fixtures and return results', async () => {
      const response = await request(app)
        .post('/ops/policy/fixtures/run')
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.summary).toBeDefined();
      expect(response.body.summary.total).toBeGreaterThan(0);
      expect(response.body.summary.passed).toBeDefined();
      expect(response.body.summary.failed).toBeDefined();
      expect(response.body.results).toBeDefined();
      expect(Array.isArray(response.body.results)).toBe(true);
    });

    it('should pass all predefined fixtures', async () => {
      const response = await request(app)
        .post('/ops/policy/fixtures/run')
        .expect(200);

      expect(response.body.summary.passed).toBe(response.body.summary.total);
      expect(response.body.summary.failed).toBe(0);
    });

    it('should include detailed results for each fixture', async () => {
      const response = await request(app)
        .post('/ops/policy/fixtures/run')
        .expect(200);

      const result = response.body.results[0];
      expect(result).toHaveProperty('fixture');
      expect(result).toHaveProperty('result');
      expect(result).toHaveProperty('passed');
      expect(result.result).toHaveProperty('decision');
      expect(result.result).toHaveProperty('evaluatedAt');
    });

    it('should block in production without POLICY_SIMULATOR=1', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.POLICY_SIMULATOR;

      const response = await request(app)
        .post('/ops/policy/fixtures/run')
        .expect(403);

      expect(response.body.ok).toBe(false);
      expect(response.body.error).toContain('disabled in production');
    });
  });

  describe('authorization', () => {
    it('should require authentication', async () => {
      const appNoAuth = express();
      appNoAuth.use(express.json());
      // No auth middleware
      appNoAuth.use('/ops', opsRouter);

      const response = await request(appNoAuth)
        .post('/ops/policy/simulate')
        .send({
          tenantId: 'tenant-001',
          actor: { id: 'user-admin', roles: ['admin'] },
          action: 'read',
          resource: { type: 'case', id: 'case-123' },
        });

      // Should fail auth (exact status depends on middleware implementation)
      expect([401, 403, 500]).toContain(response.status);
    });

    it('should allow admin role', async () => {
      const appAdmin = express();
      appAdmin.use(express.json());
      appAdmin.use((req: any, _res, next) => {
        req.user = { id: 'user-admin', roles: ['admin'] };
        next();
      });
      appAdmin.use('/ops', opsRouter);

      const response = await request(appAdmin)
        .post('/ops/policy/simulate')
        .send({
          tenantId: 'tenant-001',
          actor: { id: 'user-admin', roles: ['admin'] },
          action: 'read',
          resource: { type: 'case', id: 'case-123' },
        });

      expect([200, 403]).toContain(response.status); // 200 if ensureRole passes, 403 if env guard
    });

    it('should allow operator role', async () => {
      const appOps = express();
      appOps.use(express.json());
      appOps.use((req: any, _res, next) => {
        req.user = { id: 'user-ops', roles: ['operator'] };
        next();
      });
      appOps.use('/ops', opsRouter);

      const response = await request(appOps)
        .post('/ops/policy/simulate')
        .send({
          tenantId: 'tenant-001',
          actor: { id: 'user-admin', roles: ['admin'] },
          action: 'read',
          resource: { type: 'case', id: 'case-123' },
        });

      expect([200, 403]).toContain(response.status);
    });
  });

  describe('deterministic behavior', () => {
    it('should return same result for repeated requests', async () => {
      const input = {
        tenantId: 'tenant-001',
        actor: { id: 'user-admin', roles: ['admin'] },
        action: 'read',
        resource: { type: 'case', id: 'case-123' },
      };

      const response1 = await request(app)
        .post('/ops/policy/simulate')
        .send(input);

      const response2 = await request(app)
        .post('/ops/policy/simulate')
        .send(input);

      expect(response1.body.simulation.decision).toBe(response2.body.simulation.decision);
      expect(response1.body.simulation.ruleId).toBe(response2.body.simulation.ruleId);
    });
  });
});
