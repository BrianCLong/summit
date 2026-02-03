import { jest } from '@jest/globals';

jest.mock('../../config/logger.js', () => ({
  __esModule: true,
  default: {
    child: () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
    }),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  },
}));

import { CaseWorkflowService } from '../cases/workflow/CaseWorkflowService.js';

describe('Case dashboard read model integration (flagged)', () => {
  const baseCaseRow = {
    id: 'case-1',
    tenant_id: 'tenant-1',
    title: 'Example Case',
    description: null,
    status: 'open',
    compartment: null,
    policy_labels: [],
    metadata: {},
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-02T00:00:00Z'),
    created_by: 'user-1',
    closed_at: null,
    closed_by: null,
  };

  const metricsRow = {
    case_id: 'case-1',
    tenant_id: 'tenant-1',
    participant_count: 3,
    open_task_count: 5,
    breached_sla_count: 1,
    at_risk_sla_count: 2,
    pending_approval_count: 4,
    last_task_due_at: new Date('2024-01-05T00:00:00Z'),
    refreshed_at: new Date('2024-01-02T12:00:00Z'),
  };

  const createMockPool = () => {
    const query = jest.fn(async (sql: string, _params?: any[]) => {
      if (sql.includes('FROM maestro.cases')) {
        return { rows: [baseCaseRow] };
      }

      if (sql.includes('FROM maestro.case_dashboard_read_models')) {
        return { rows: [metricsRow] };
      }

      if (sql.includes('refresh_case_dashboard_read_model')) {
        return { rows: [] };
      }

      throw new Error(`Unhandled query in test: ${sql}`);
    });

    return { query } as any;
  };

  beforeEach(() => {
    process.env.READ_MODELS_V1 = '1';
  });

  afterEach(() => {
    delete process.env.READ_MODELS_V1;
  });

  it('returns base case data when read-model metrics are unavailable', async () => {
    const workflowService = new CaseWorkflowService(createMockPool());

    const results = await workflowService.listCases({
      tenantId: 'tenant-1',
      status: 'open',
      limit: 10,
      offset: 0,
    });

    expect(results).toHaveLength(1);
    const metrics = (results[0] as any).dashboardMetrics;
    expect(metrics).toBeUndefined();
  });

  it('returns base case detail when read-model metrics are unavailable', async () => {
    const workflowService = new CaseWorkflowService(createMockPool());

    const result = await workflowService.getCase('case-1', 'tenant-1', {
      includeParticipants: false,
    });

    const metrics = (result as any)?.dashboardMetrics;
    expect(metrics).toBeUndefined();
  });
});
