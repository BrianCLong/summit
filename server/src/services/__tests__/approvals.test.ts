import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';

const approvalsStore: any[] = [];

// Mock metrics - declared before mocks
const createMetric = () => {
  let value = 0;
  return {
    inc: (amount: number = 1) => { value += amount; },
    dec: (amount: number = 1) => { value -= amount; },
    set: (amount: number) => { value = amount; },
    reset: () => { value = 0; },
    get: () => ({ values: [{ value }] }),
  };
};

const mockApprovalsPending = createMetric();
const mockApprovalsApprovedTotal = createMetric();
const mockApprovalsRejectedTotal = createMetric();

// ESM-compatible mocking using unstable_mockModule
jest.unstable_mockModule('../../monitoring/metrics.js', () => ({
  approvalsPending: mockApprovalsPending,
  approvalsApprovedTotal: mockApprovalsApprovedTotal,
  approvalsRejectedTotal: mockApprovalsRejectedTotal,
}));

jest.unstable_mockModule('../../db/postgres.js', () => {
  const buildResponse = (rows: any[]): { rows: any[] } => ({ rows });

  return {
    getPostgresPool: () => ({
      query: jest.fn(async (text: string, params: any[] = []) => {
        if (text.startsWith('INSERT INTO approvals')) {
          const approval = {
            id: `app-${approvalsStore.length + 1}`,
            requester_id: params[0],
            status: params[1],
            action: params[2],
            payload: JSON.parse(params[3] || '{}'),
            reason: params[4],
            run_id: params[5],
            created_at: new Date(),
            updated_at: new Date(),
            approver_id: null,
            decision_reason: null,
            resolved_at: null,
          };
          approvalsStore.push(approval);
          return buildResponse([approval]);
        }

        if (text.startsWith('SELECT * FROM approvals WHERE id =')) {
          const found = approvalsStore.filter((item) => item.id === params[0]);
          return buildResponse(found);
        }

        if (text.startsWith('SELECT * FROM approvals')) {
          const filtered = text.includes('status = $1')
            ? approvalsStore.filter((item) => item.status === params[0])
            : approvalsStore;
          return buildResponse(filtered.sort((a, b) => b.created_at - a.created_at));
        }

        if (text.includes("SET status = 'approved'")) {
          const approval = approvalsStore.find(
            (item) => item.id === params[0] && item.status === 'pending',
          );
          if (!approval) return buildResponse([]);
          approval.status = 'approved';
          approval.approver_id = params[1];
          approval.decision_reason = params[2];
          approval.resolved_at = new Date();
          approval.updated_at = approval.resolved_at;
          return buildResponse([approval]);
        }

        if (text.includes("SET status = 'rejected'")) {
          const approval = approvalsStore.find(
            (item) => item.id === params[0] && item.status === 'pending',
          );
          if (!approval) return buildResponse([]);
          approval.status = 'rejected';
          approval.approver_id = params[1];
          approval.decision_reason = params[2];
          approval.resolved_at = new Date();
          approval.updated_at = approval.resolved_at;
          return buildResponse([approval]);
        }

        return buildResponse([]);
      }),
    }),
  };
});

// Dynamic imports AFTER mocks are set up
const {
  approveApproval,
  createApproval,
  listApprovals,
  rejectApproval,
} = await import('../approvals.js');

describe('Approvals service', () => {
  beforeEach(() => {
    approvalsStore.splice(0, approvalsStore.length);
    mockApprovalsPending.set(0);
    mockApprovalsApprovedTotal.reset();
    mockApprovalsRejectedTotal.reset();
  });

  it('creates and lists pending approvals', async () => {
    const created = await createApproval({
      requesterId: 'user-1',
      action: 'maestro_run',
      payload: { requestText: 'do something risky' },
      reason: 'external side effects',
    });

    expect(created.status).toBe('pending');
    expect(mockApprovalsPending.get().values[0].value).toBe(1);

    const pending = await listApprovals({ status: 'pending' });
    expect(pending).toHaveLength(1);
    expect(pending[0].requester_id).toBe('user-1');
  });

  it('approves a pending request and updates metrics', async () => {
    const approval = await createApproval({ requesterId: 'user-2' });

    const approved = await approveApproval(approval.id, 'approver-1', 'looks safe');
    expect(approved?.status).toBe('approved');
    expect(approved?.approver_id).toBe('approver-1');
    expect(mockApprovalsPending.get().values[0].value).toBe(0);
    expect(mockApprovalsApprovedTotal.get().values[0].value).toBe(1);
  });

  it('rejects a pending request and prevents double decisions', async () => {
    const approval = await createApproval({ requesterId: 'user-3' });

    const rejected = await rejectApproval(approval.id, 'approver-2', 'too risky');
    expect(rejected?.status).toBe('rejected');
    expect(mockApprovalsRejectedTotal.get().values[0].value).toBe(1);

    const secondDecision = await approveApproval(approval.id, 'approver-3');
    expect(secondDecision).toBeNull();
  });
});
