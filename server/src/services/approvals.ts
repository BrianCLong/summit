import { getPostgresPool } from '../db/postgres.js';
import logger from '../config/logger.js';
import {
  approvalsApprovedTotal,
  approvalsPending,
  approvalsRejectedTotal,
} from '../monitoring/metrics.js';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Approval {
  id: string;
  requester_id: string;
  approver_id?: string | null;
  status: ApprovalStatus;
  action?: string | null;
  payload?: Record<string, unknown> | null;
  reason?: string | null;
  decision_reason?: string | null;
  run_id?: string | null;
  created_at: Date;
  updated_at: Date;
  resolved_at?: Date | null;
}

export interface CreateApprovalInput {
  requesterId: string;
  action?: string;
  payload?: Record<string, unknown>;
  reason?: string;
  runId?: string;
}

const APPROVER_ROLES = new Set([
  'ADMIN',
  'SECURITY_ADMIN',
  'OPERATIONS',
  'SAFETY',
]);

const approvalsLogger = logger.child({ name: 'ApprovalsService' });

const safeRows = <T = unknown>(result: unknown): T[] =>
  Array.isArray((result as { rows?: unknown[] })?.rows)
    ? ((result as { rows: T[] }).rows as T[])
    : [];

export const canApprove = (role?: string | null): boolean => {
  if (!role) return false;
  return APPROVER_ROLES.has(role.toUpperCase());
};

export async function createApproval(input: CreateApprovalInput): Promise<Approval> {
  const pool = getPostgresPool();
  const result = await pool.query(
    `INSERT INTO approvals (requester_id, status, action, payload, reason, run_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.requesterId,
      'pending',
      input.action || null,
      JSON.stringify(input.payload || {}),
      input.reason || null,
      input.runId || null,
    ],
  );

  approvalsPending.inc();

  const approval = safeRows<Approval>(result)[0];
  approvalsLogger.info(
    {
      approval_id: approval?.id,
      action: approval?.action,
      requester: input.requesterId,
      run_id: input.runId,
    },
    'Approval requested',
  );

  return approval;
}

export async function listApprovals(
  options: { status?: ApprovalStatus } = {},
): Promise<Approval[]> {
  const pool = getPostgresPool();
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (options.status) {
    conditions.push(`status = $${paramIdx++}`);
    params.push(options.status);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT * FROM approvals ${whereClause} ORDER BY created_at DESC`,
    params,
  );

  return safeRows<Approval>(result);
}

export async function getApprovalById(id: string): Promise<Approval | null> {
  const pool = getPostgresPool();
  const result = await pool.query('SELECT * FROM approvals WHERE id = $1', [id]);
  const approvals = safeRows<Approval>(result);
  return approvals[0] || null;
}

export async function approveApproval(
  id: string,
  approverId: string,
  decisionReason?: string,
): Promise<Approval | null> {
  const pool = getPostgresPool();
  const result = await pool.query(
    `UPDATE approvals
       SET status = 'approved',
           approver_id = $2,
           decision_reason = $3,
           resolved_at = NOW(),
           updated_at = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [id, approverId, decisionReason || null],
  );

  const approval = safeRows<Approval>(result)[0];
  if (!approval) return null;

  approvalsPending.dec();
  approvalsApprovedTotal.inc();

  approvalsLogger.info(
    {
      approval_id: approval.id,
      action: approval.action,
      approver: approverId,
      run_id: approval.run_id,
      decision_reason: decisionReason,
    },
    'Approval granted',
  );

  return approval;
}

export async function rejectApproval(
  id: string,
  approverId: string,
  decisionReason?: string,
): Promise<Approval | null> {
  const pool = getPostgresPool();
  const result = await pool.query(
    `UPDATE approvals
       SET status = 'rejected',
           approver_id = $2,
           decision_reason = $3,
           resolved_at = NOW(),
           updated_at = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [id, approverId, decisionReason || null],
  );

  const approval = safeRows<Approval>(result)[0];
  if (!approval) return null;

  approvalsPending.dec();
  approvalsRejectedTotal.inc();

  approvalsLogger.info(
    {
      approval_id: approval.id,
      action: approval.action,
      approver: approverId,
      run_id: approval.run_id,
      decision_reason: decisionReason,
    },
    'Approval rejected',
  );

  return approval;
}
