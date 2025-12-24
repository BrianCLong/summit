import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../../governance/opa-integration.js', () => ({
  opaPolicyEngine: {
    evaluatePolicy: jest.fn(),
  },
}));

jest.mock('../../../config/logger.js', () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnThis(),
  };

  return {
    __esModule: true,
    default: mockLogger,
    logger: mockLogger,
  };
});

jest.mock('../../router/policy-explainer', () => ({
  policyExplainer: {
    getPolicyExplanationAPI: jest.fn(),
    simulateWhatIfAPI: jest.fn(),
  },
}));

jest.mock('../../observability/prometheus', () => ({
  prometheusConductorMetrics: {},
}));

import { policyRoutes } from '../policy-routes.js';
import { opaPolicyEngine } from '../../governance/opa-integration.js';
import logger from '../../../config/logger.js';

const evaluatePolicyMock = opaPolicyEngine
  .evaluatePolicy as jest.MockedFunction<
  typeof opaPolicyEngine.evaluatePolicy
>;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).user = {
      userId: 'user-123',
      tenantId: 'tenant-abc',
      roles: ['analyst'],
    };
    (req as any).traceId = 'trace-app-trace';
    next();
  });
  app.use(policyRoutes);
  return app;
}

describe('Maestro routing OPA guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    evaluatePolicyMock.mockReset();
  });

  it('allows routing fetch when OPA returns allow and logs decision context', async () => {
    evaluatePolicyMock.mockResolvedValue({
      allow: true,
      reason: 'permitted',
    } as any);

    const app = buildApp();
    const response = await request(app).get(
      '/runs/run-123/nodes/node-9/routing',
    );

    expect(response.status).toBe(200);
    expect(response.body.runId).toBe('run-123');
    expect(evaluatePolicyMock).toHaveBeenCalledWith(
      'maestro/authz',
      expect.objectContaining({
        action: 'read',
        tenantId: 'tenant-abc',
        userId: 'user-123',
        resourceAttributes: { runId: 'run-123', nodeId: 'node-9' },
      }),
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        allow: true,
        traceId: 'trace-app-trace',
        principalId: 'user-123',
        resourceAttributes: { runId: 'run-123', nodeId: 'node-9' },
      }),
      'OPA evaluated maestro routing access',
    );
  });

  it('denies routing fetch when OPA blocks access and returns policy context', async () => {
    evaluatePolicyMock.mockResolvedValue({
      allow: false,
      reason: 'blocked by policy',
    } as any);

    const app = buildApp();
    const response = await request(app).get(
      '/runs/run-999/nodes/node-1/routing',
    );

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      code: 'OPA_DENY',
      reason: 'blocked by policy',
      traceId: 'trace-app-trace',
      resource: 'maestro.routing.decision',
    });
    expect(evaluatePolicyMock).toHaveBeenCalledWith(
      'maestro/authz',
      expect.objectContaining({
        resourceAttributes: { runId: 'run-999', nodeId: 'node-1' },
      }),
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        allow: false,
        traceId: 'trace-app-trace',
        principalId: 'user-123',
        resourceAttributes: { runId: 'run-999', nodeId: 'node-1' },
      }),
      'OPA evaluated maestro routing access',
    );
  });
});
