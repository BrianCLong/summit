import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { z } from 'zod';
import { runEventsRepo } from '../runs/run-events-repo.js';
import { maestroService } from '../MaestroService.js';
import { runsRepo } from '../runs/runs-repo.js';

// Mock dependencies
jest.mock('../runs/run-events-repo.js');
jest.mock('../MaestroService.js');
jest.mock('../runs/runs-repo.js');
jest.mock('../../conductor/admission/budget-control.js', () => ({
  createBudgetController: () => ({
    admit: jest.fn().mockResolvedValue({ admit: true }),
  }),
}));
jest.mock('../../middleware/auth.js', () => ({
  ensureAuthenticated: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user' };
    next();
  },
}));
jest.mock('../../middleware/authorization.js', () => ({
  authorize: () => (req: any, res: any, next: any) => next(),
}));
jest.mock('../../middleware/maestro-authz.js', () => ({
  maestroAuthzMiddleware: () => (req: any, res: any, next: any) => {
    req.context = { tenantId: 'test-tenant' };
    next();
  },
}));
jest.mock('../../observability/reliability-metrics.js', () => ({
  recordEndpointResult: jest.fn(),
}));
jest.mock('../scheduler/Scheduler.js', () => ({
  scheduler: { enqueueRun: jest.fn() },
}));

// Import router after mocking
import router from '../runs/runs-api.js';

const app = express();
app.use(express.json());
app.use('/', router);

describe('Observability API Guardrails', () => {
  const tenantId = 'test-tenant';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /runs/limits', () => {
    it('returns budget and controls', async () => {
      (maestroService.getControlLoops as jest.Mock).mockResolvedValue([
        { id: 'loop-1', name: 'Test Loop', status: 'active' },
      ]);

      const res = await request(app).get('/runs/limits');

      expect(res.status).toBe(200);
      expect(res.body.limits.budget.remainingUsd).toBeDefined();
      expect(res.body.controls).toHaveLength(1);
      expect(res.body.controls[0].id).toBe('loop-1');
    });
  });

  describe('GET /runs/:id/timeline', () => {
    it('returns 404 if run not found or unauthorized', async () => {
      (runsRepo.getRunForTenant as jest.Mock).mockResolvedValue(null);

      const res = await request(app).get('/runs/123/timeline');

      expect(res.status).toBe(404);
      expect(runsRepo.getRunForTenant).toHaveBeenCalledWith('123', tenantId);
    });

    it('returns events if run exists', async () => {
      (runsRepo.getRunForTenant as jest.Mock).mockResolvedValue({ id: '123' });
      (runEventsRepo.getEvents as jest.Mock).mockResolvedValue([
        { id: 'evt-1', type: 'run.started', payload: {} },
      ]);

      const res = await request(app).get('/runs/123/timeline');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].type).toBe('run.started');
      expect(runEventsRepo.getEvents).toHaveBeenCalledWith('123', tenantId);
    });
  });
});
