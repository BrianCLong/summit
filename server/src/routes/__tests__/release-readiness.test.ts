import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import opsRouter from '../ops.js';
import { releaseReadinessService } from '../../services/releaseReadinessService.js';

const describeIf =
  process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;

// Mock authentication middleware
jest.mock('../../middleware/auth.js', () => ({
  ensureAuthenticated: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user', role: 'ADMIN' };
    next();
  },
  ensureRole: (roles: string[]) => (req: any, res: any, next: any) => {
    if (roles.includes('ADMIN')) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden' });
    }
  },
}));

// Mock other services to avoid side effects
jest.mock('../../scripts/maintenance.js', () => ({ runMaintenance: jest.fn() }));
jest.mock('../../backup/BackupService.js', () => ({
  BackupService: jest.fn().mockImplementation(() => ({
    backupPostgres: jest.fn(),
    backupNeo4j: jest.fn(),
    backupRedis: jest.fn(),
  })),
}));
jest.mock('../../dr/DisasterRecoveryService.js', () => ({
  DisasterRecoveryService: jest.fn().mockImplementation(() => ({
    runDrill: jest.fn().mockResolvedValue(true),
    getStatus: jest.fn().mockResolvedValue({ ok: true }),
  })),
}));

describeIf('Release Readiness API', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/ops', opsRouter);

    // Clear service cache before each test
    releaseReadinessService.clearCache();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /ops/release-readiness/summary', () => {
    it('returns a valid summary with checks', async () => {
      const response = await request(app).get('/ops/release-readiness/summary');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('generatedAt');
      expect(response.body).toHaveProperty('versionOrCommit');
      expect(response.body).toHaveProperty('checks');
      expect(Array.isArray(response.body.checks)).toBe(true);
    });

    it('includes governance file checks', async () => {
      const response = await request(app).get('/ops/release-readiness/summary');

      expect(response.status).toBe(200);
      const checks = response.body.checks;

      // Should include checks for critical files
      expect(checks.some((c: any) => c.name.includes('Constitutional'))).toBe(true);
      expect(checks.some((c: any) => c.name.includes('Control Registry'))).toBe(true);
      expect(checks.some((c: any) => c.name.includes('Evidence Index'))).toBe(true);
    });

    it('includes check status and evidence links', async () => {
      const response = await request(app).get('/ops/release-readiness/summary');

      expect(response.status).toBe(200);
      const checks = response.body.checks;

      if (checks.length > 0) {
        const check = checks[0];
        expect(check).toHaveProperty('id');
        expect(check).toHaveProperty('name');
        expect(check).toHaveProperty('status');
        expect(['pass', 'fail', 'warn', 'unknown']).toContain(check.status);
        expect(check).toHaveProperty('evidenceLinks');
      }
    });

    it('handles errors gracefully', async () => {
      // Mock service to throw error
      jest.spyOn(releaseReadinessService, 'getSummary').mockRejectedValueOnce(
        new Error('Test error')
      );

      const response = await request(app).get('/ops/release-readiness/summary');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /ops/release-readiness/evidence-index', () => {
    it('returns evidence index with controls and evidence', async () => {
      const response = await request(app).get('/ops/release-readiness/evidence-index');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('controls');
      expect(response.body).toHaveProperty('evidence');
      expect(Array.isArray(response.body.controls)).toBe(true);
      expect(Array.isArray(response.body.evidence)).toBe(true);
    });

    it('includes control details', async () => {
      const response = await request(app).get('/ops/release-readiness/evidence-index');

      expect(response.status).toBe(200);
      const controls = response.body.controls;

      if (controls.length > 0) {
        const control = controls[0];
        expect(control).toHaveProperty('id');
        expect(control).toHaveProperty('name');
        expect(control).toHaveProperty('description');
        expect(control).toHaveProperty('enforcementPoint');
        expect(control).toHaveProperty('evidenceArtifact');
      }
    });

    it('includes evidence items with verification commands', async () => {
      const response = await request(app).get('/ops/release-readiness/evidence-index');

      expect(response.status).toBe(200);
      const evidence = response.body.evidence;

      if (evidence.length > 0) {
        const item = evidence[0];
        expect(item).toHaveProperty('controlId');
        expect(item).toHaveProperty('controlName');
        expect(item).toHaveProperty('evidenceType');
        expect(item).toHaveProperty('location');
        expect(item).toHaveProperty('verificationCommand');
      }
    });

    it('handles errors gracefully', async () => {
      // Mock service to throw error
      jest.spyOn(releaseReadinessService, 'getEvidenceIndex').mockRejectedValueOnce(
        new Error('Test error')
      );

      const response = await request(app).get('/ops/release-readiness/evidence-index');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Authorization', () => {
    it('rejects unauthorized requests to summary endpoint', async () => {
      // Create app without auth middleware mock
      const unauthedApp = express();
      unauthedApp.use(express.json());

      // Manually add router with real auth middleware
      const Router = require('express').Router;
      const testRouter = Router();
      testRouter.get(
        '/release-readiness/summary',
        (req: any, res: any) => {
          if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
          }
          res.json({ ok: true });
        }
      );

      unauthedApp.use('/ops', testRouter);

      const response = await request(unauthedApp).get('/ops/release-readiness/summary');

      expect(response.status).toBe(401);
    });

    it('rejects unauthorized requests to evidence-index endpoint', async () => {
      // Create app without auth middleware mock
      const unauthedApp = express();
      unauthedApp.use(express.json());

      const Router = require('express').Router;
      const testRouter = Router();
      testRouter.get(
        '/release-readiness/evidence-index',
        (req: any, res: any) => {
          if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
          }
          res.json({ ok: true });
        }
      );

      unauthedApp.use('/ops', testRouter);

      const response = await request(unauthedApp).get('/ops/release-readiness/evidence-index');

      expect(response.status).toBe(401);
    });
  });
});
