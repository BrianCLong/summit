import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { createMaestroOPAEnforcer } from '../maestro_routes.js';
import { logger } from '../../utils/logger.js';

const describeIf =
  process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;

describeIf('createMaestroOPAEnforcer', () => {
  const buildApp = (evaluateQuery: jest.Mock) => {
    const app = express();
    app.use(express.json());
    app.use((req: any, _res, next) => {
      req.user = {
        id: 'user-123',
        role: 'analyst',
        tenant_id: 'tenant-55',
      };
      req.correlationId = 'corr-123';
      req.traceId = 'trace-abc';
      next();
    });

    const enforceRunReadPolicy = createMaestroOPAEnforcer(
      { evaluateQuery },
      'maestro/authz/allow',
      {
        action: 'maestro.run.read',
        resourceType: 'maestro/run',
        resolveResourceId: (req) => req.params.runId,
      },
    );

    app.get(
      '/api/maestro/runs/:runId',
      enforceRunReadPolicy,
      (_req, res) => {
        res.json({ ok: true });
      },
    );

    return app;
  };

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('allows requests when OPA approves and logs decision details', async () => {
    const evaluateQuery = jest.fn().mockResolvedValue({
      allow: true,
      reason: 'permitted',
    });
    const app = buildApp(evaluateQuery);
    const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => undefined as any);
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => undefined as any);

    const response = await request(app).get('/api/maestro/runs/run-789');

    expect(response.status).toBe(200);
    expect(evaluateQuery).toHaveBeenCalledWith(
      'maestro/authz/allow',
      expect.objectContaining({
        action: 'maestro.run.read',
        principal: expect.objectContaining({
          id: 'user-123',
          tenantId: 'tenant-55',
        }),
        resource: expect.objectContaining({
          type: 'maestro/run',
          id: 'run-789',
          attributes: expect.objectContaining({
            runId: 'run-789',
            method: 'get',
            path: '/api/maestro/runs/run-789',
          }),
        }),
        traceId: 'trace-abc',
        correlationId: 'corr-123',
      }),
    );

    expect(warnSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: 'trace-abc',
        correlationId: 'corr-123',
        principalId: 'user-123',
        principalRole: 'analyst',
        tenantId: 'tenant-55',
        resourceType: 'maestro/run',
        resourceId: 'run-789',
        decision: 'allow',
        allow: true,
        reason: 'permitted',
        resourceAttributes: expect.objectContaining({
          runId: 'run-789',
          method: 'get',
          path: '/api/maestro/runs/run-789',
        }),
      }),
      'Maestro OPA decision evaluated',
    );
  });

  it('denies requests when OPA blocks access and logs the denial context', async () => {
    const evaluateQuery = jest.fn().mockResolvedValue({
      allow: false,
      reason: 'policy_blocked',
    });
    const app = buildApp(evaluateQuery);
    const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => undefined as any);
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => undefined as any);

    const response = await request(app).get('/api/maestro/runs/run-789');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: 'Forbidden',
      reason: 'policy_blocked',
    });

    expect(evaluateQuery).toHaveBeenCalledWith(
      'maestro/authz/allow',
      expect.objectContaining({
        action: 'maestro.run.read',
        resource: expect.objectContaining({
          id: 'run-789',
        }),
        traceId: 'trace-abc',
      }),
    );

    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: 'trace-abc',
        correlationId: 'corr-123',
        principalId: 'user-123',
        principalRole: 'analyst',
        resourceId: 'run-789',
        decision: 'deny',
        allow: false,
        reason: 'policy_blocked',
        resourceAttributes: expect.objectContaining({
          runId: 'run-789',
          method: 'get',
          path: '/api/maestro/runs/run-789',
        }),
      }),
      'Maestro OPA decision evaluated',
    );
  });
});
