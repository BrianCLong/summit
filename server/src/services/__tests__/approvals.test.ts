import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

const approvalsStore: any[] = [];

const getPostgresPoolMock = jest.fn();
const approvalsPendingIncMock = jest.fn();
const approvalsPendingDecMock = jest.fn();
const approvalsApprovedIncMock = jest.fn();
const approvalsRejectedIncMock = jest.fn();

jest.unstable_mockModule('../../db/postgres.js', () => ({
  getPostgresPool: getPostgresPoolMock,
}));

jest.unstable_mockModule('../../monitoring/metrics.js', () => ({
  approvalsPending: {
    inc: approvalsPendingIncMock,
    dec: approvalsPendingDecMock,
  },
  approvalsApprovedTotal: {
    inc: approvalsApprovedIncMock,
  },
  approvalsRejectedTotal: {
    inc: approvalsRejectedIncMock,
  },
}));

describe('Approvals service', () => {
  let createApproval: any;
  let listApprovals: any;
  let approveApproval: any;
  let rejectApproval: any;
  let pendingCount = 0;
  let approvedTotal = 0;
  let rejectedTotal = 0;

  beforeAll(async () => {
    ({
      approveApproval,
      createApproval,
      listApprovals,
      rejectApproval,
    } = await import('../approvals.js'));
  });

  beforeEach(() => {
    approvalsStore.splice(0, approvalsStore.length);
    pendingCount = 0;
    approvedTotal = 0;
    rejectedTotal = 0;

    jest.clearAllMocks();

    approvalsPendingIncMock.mockImplementation(() => {
      pendingCount += 1;
    });
    approvalsPendingDecMock.mockImplementation(() => {
      pendingCount -= 1;
    });
    approvalsApprovedIncMock.mockImplementation(() => {
      approvedTotal += 1;
    });
    approvalsRejectedIncMock.mockImplementation(() => {
      rejectedTotal += 1;
    });

    const buildResponse = (rows: any[]): { rows: any[] } => ({ rows });

    const query = jest.fn(async (text: string, params: any[] = []) => {
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
        return buildResponse(filtered.sort((a, b) => +b.created_at - +a.created_at));
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
    });

    getPostgresPoolMock.mockReturnValue({ query });
  });

  it('creates and lists pending approvals', async () => {
    const created = await createApproval({
      requesterId: 'user-1',
      action: 'maestro_run',
      payload: { requestText: 'do something risky' },
      reason: 'external side effects',
    });

    expect(created.status).toBe('pending');
    expect(pendingCount).toBe(1);

    const pending = await listApprovals({ status: 'pending' });
    expect(pending).toHaveLength(1);
    expect(pending[0].requester_id).toBe('user-1');
  });

  it('approves a pending request and updates metrics', async () => {
    const approval = await createApproval({ requesterId: 'user-2' });

    const approved = await approveApproval(approval.id, 'approver-1', 'looks safe');
    expect(approved?.status).toBe('approved');
    expect(approved?.approver_id).toBe('approver-1');
    expect(pendingCount).toBe(0);
    expect(approvedTotal).toBe(1);
  });

  it('rejects a pending request and prevents double decisions', async () => {
    const approval = await createApproval({ requesterId: 'user-3' });

    const rejected = await rejectApproval(approval.id, 'approver-2', 'too risky');
    expect(rejected?.status).toBe('rejected');
    expect(rejectedTotal).toBe(1);

    const secondDecision = await approveApproval(approval.id, 'approver-3');
    expect(secondDecision).toBeNull();
  });
});
