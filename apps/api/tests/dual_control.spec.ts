// @ts-nocheck
import express from 'express';
import request from 'supertest';
import exportRouter from '../../../server/src/routes/export-api.js';
import { opaClient } from '../../../server/src/services/opa-client.js';
import { costGuard } from '../../../server/src/services/cost-guard.js';

jest.mock('../../../server/src/services/opa-client.js', () => ({
  opaClient: {
    evaluateExportPolicy: jest.fn(),
  },
}));

jest.mock('../../../server/src/services/cost-guard.js', () => ({
  costGuard: {
    checkCostAllowance: jest.fn(),
    recordActualCost: jest.fn(),
  },
}));

jest.mock('../../../server/src/observability/telemetry', () => ({
  businessMetrics: {
    exportBlocks: { add: jest.fn() },
    exportRequests: { add: jest.fn() },
  },
  addSpanAttributes: jest.fn(),
}));

jest.mock('../../../server/src/db/models/approvals.js', () => {
  const approvalsMemory: any[] = [];

  return {
    upsertDualControlApproval: jest.fn(async (record) => {
      approvalsMemory.push(record);
      return { ...record, createdAt: new Date() };
    }),
    getDualControlState: jest.fn(async (runId: string, stepId: string) => {
      const rows = approvalsMemory.filter(
        (entry) => entry.runId === runId && entry.stepId === stepId,
      );
      return {
        approvals: rows.map((r) => ({
          runId: r.runId,
          stepId: r.stepId,
          userId: r.userId,
          verdict: r.verdict,
          role: r.role,
          attributes: r.attributes,
        })),
        approvalsCount: rows.length,
        distinctApprovers: new Set(rows.map((r) => r.userId)).size,
        declinations: rows.filter((r) => r.verdict === 'declined').length,
      };
    }),
    __approvalsMemory: approvalsMemory,
  };
});

const approvalsModule = jest.requireMock(
  '../../../server/src/db/models/approvals.js',
) as {
  __approvalsMemory: any[];
};

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(exportRouter);
  return app;
};

const baseRequestBody = {
  action: 'export' as const,
  dataset: {
    sources: [
      {
        id: 'src-1',
        license: 'PROPRIETARY',
        owner: 'tenant-a',
        classification: 'restricted',
      },
    ],
  },
  context: {
    user_id: 'requester-1',
    user_role: 'investigator' as const,
    tenant_id: 'tenant-a',
    purpose: 'investigation' as const,
    export_type: 'dataset' as const,
    approvals: [],
  },
};

const dualControlDecision = {
  action: 'allow' as const,
  allow: true,
  violations: [],
  risk_assessment: {
    level: 'high' as const,
    factors: ['sensitive export'],
    requires_approval: false,
    requires_dual_control: true,
    requires_step_up: false,
  },
  required_approvals: ['dual-control'],
  appeal_available: false,
  next_steps: [],
  obligations: [
    {
      type: 'dual_control',
      required_approvals: 2,
      allowed_roles: ['compliance-officer', 'admin'],
    },
  ],
};

describe('Dual control execution path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    approvalsModule.__approvalsMemory.length = 0;
    (costGuard.checkCostAllowance as jest.Mock).mockResolvedValue({
      allowed: true,
      estimatedCost: 1,
      budgetRemaining: 99,
      budgetUtilization: 0.1,
    });
    (costGuard.recordActualCost as jest.Mock).mockResolvedValue(undefined);
  });

  it('surfaces dual-control obligations and allows when approvals are valid', async () => {
    (opaClient.evaluateExportPolicy as jest.Mock).mockResolvedValue(
      dualControlDecision,
    );
    const app = buildApp();
    const response = await request(app)
      .post('/export')
      .send({
        ...baseRequestBody,
        context: {
          ...baseRequestBody.context,
          approvals: [
            { user_id: 'approver-1', role: 'compliance-officer' },
            { user_id: 'approver-2', role: 'admin' },
          ],
        },
      })
      .expect(200);

    expect(response.body.decision.obligations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'dual_control' }),
      ]),
    );
    expect(response.body.decision.effect).toBe('allow');
    expect(approvalsModule.__approvalsMemory).toHaveLength(2);
  });

  it('blocks execution when approvals overlap or violate constraints', async () => {
    (opaClient.evaluateExportPolicy as jest.Mock).mockResolvedValue(
      dualControlDecision,
    );
    const app = buildApp();
    const response = await request(app)
      .post('/export')
      .send({
        ...baseRequestBody,
        context: {
          ...baseRequestBody.context,
          approvals: [
            { user_id: 'requester-1', role: 'compliance-officer' },
            { user_id: 'requester-1', role: 'admin' },
          ],
        },
      })
      .expect(403);

    expect(response.body.decision.effect).toBe('review');
    expect(response.body.decision.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'DUAL_CONTROL_NOT_SATISFIED',
        }),
      ]),
    );
    expect(approvalsModule.__approvalsMemory).toHaveLength(0);
  });

  it('returns dual-control obligations in simulation results', async () => {
    (opaClient.evaluateExportPolicy as jest.Mock).mockResolvedValue(
      dualControlDecision,
    );
    const app = buildApp();
    const response = await request(app)
      .post('/export/simulate')
      .send({
        ...baseRequestBody,
        simulation: {
          what_if_scenarios: [{ name: 'base', changes: {} }],
        },
        context: {
          ...baseRequestBody.context,
          approvals: [
            { user_id: 'approver-1', role: 'compliance-officer' },
            { user_id: 'approver-2', role: 'admin' },
          ],
        },
      })
      .expect(200);

    expect(response.body.decision.obligations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'dual_control' }),
      ]),
    );
    expect(
      response.body.simulation_results.scenarios[0].decision.obligations,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'dual_control' }),
      ]),
    );
  });
});
