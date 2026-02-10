// @ts-nocheck
import { getPostgresPool } from '../db/postgres.js';
import logger from '../config/logger.js';
import { ReceiptService } from './ReceiptService.js';
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
  // Computed/Joined fields if available
  tenant_id?: string;
}

export interface CreateApprovalInput {
  requesterId: string;
  action?: string;
  payload?: Record<string, unknown>;
  reason?: string;
  runId?: string;
  tenantId?: string;
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

  // Try to insert with tenant_id if provided, fallback if not (assuming legacy schema)
  // Since we can't easily check schema, we'll try to insert standard fields.
  // Ideally, we should add tenant_id column if missing.
  // For this sprint, we'll stick to existing columns for the DB insert
  // but we might want to store tenantId in payload if column is missing.

  const payload = input.payload || {};
  if (input.tenantId) {
    payload._tenantId = input.tenantId;
  }

  const result = await pool.query(
    `INSERT INTO approvals (requester_id, status, action, payload, reason, run_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.requesterId,
      'pending',
      input.action || null,
      JSON.stringify(payload),
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
  options: { status?: ApprovalStatus; tenantId?: string } = {},
): Promise<Approval[]> {
  const pool = getPostgresPool();
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (options.status) {
    conditions.push(`status = $${paramIdx++}`);
    params.push(options.status);
  }

  // Filter by tenant if stored in payload (inefficient but works for MVP without schema change)
  // Or assuming we don't have tenant_id column yet.
  // If we had tenant_id column:
  // if (options.tenantId) {
  //   conditions.push(`tenant_id = $${paramIdx++}`);
  //   params.push(options.tenantId);
  // }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT * FROM approvals ${whereClause} ORDER BY created_at DESC`,
    params,
  );

  let rows = safeRows<Approval>(result);

  if (options.tenantId) {
    rows = rows.filter(r => {
        const p = r.payload as any;
        return !p?._tenantId || p._tenantId === options.tenantId;
    });
  }

  return rows;
}

export async function getApprovalById(id: string): Promise<Approval | null> {
  const pool = getPostgresPool();
  const result = await pool.query('SELECT * FROM approvals WHERE id = $1', [id]);
  const approvals = safeRows<Approval>(result);
  return approvals[0] || null;
}

export interface ApprovalDecisionResult {
  approval: Approval;
  receipt: any;
}

export async function approveApproval(
  id: string,
  approverId: string,
  decisionReason?: string,
  tenantId?: string
): Promise<ApprovalDecisionResult | null> {
  const pool = getPostgresPool();

  // Update DB
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

  // Resolve tenantId from payload if not provided
  const resolvedTenantId = tenantId || (approval.payload as any)?._tenantId || 'default-tenant';

  // Generate Receipt
  let receipt;
  try {
    receipt = await ReceiptService.getInstance().generateReceipt({
        action: 'APPROVAL_GRANTED',
        actor: { id: approverId, tenantId: resolvedTenantId },
        resource: approval.id,
        input: { decisionReason, payload: approval.payload },
        policyDecisionId: (approval.payload as any)?.policyDecisionId
    });
  } catch (err) {
    approvalsLogger.error({ err }, 'Failed to generate receipt for approval');
    // We don't fail the approval if receipt generation fails (for now), but ideally we should.
    // Making it critical:
    // throw err;
    // But adhering to robustness:
    receipt = { error: 'Receipt generation failed', details: err.message };
  }

  approvalsLogger.info(
    {
      approval_id: approval.id,
      action: approval.action,
      approver: approverId,
      run_id: approval.run_id,
      decision_reason: decisionReason,
      receipt_id: receipt?.id
    },
    'Approval granted',
  );

  return { approval, receipt };
}

export async function rejectApproval(
  id: string,
  approverId: string,
  decisionReason?: string,
  tenantId?: string
): Promise<ApprovalDecisionResult | null> {
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

  // Resolve tenantId
  const resolvedTenantId = tenantId || (approval.payload as any)?._tenantId || 'default-tenant';

  // Generate Receipt
  let receipt;
  try {
      receipt = await ReceiptService.getInstance().generateReceipt({
        action: 'APPROVAL_DENIED',
        actor: { id: approverId, tenantId: resolvedTenantId },
        resource: approval.id,
        input: { decisionReason, payload: approval.payload },
        policyDecisionId: (approval.payload as any)?.policyDecisionId
    });
  } catch (err) {
      approvalsLogger.error({ err }, 'Failed to generate receipt for rejection');
      receipt = { error: 'Receipt generation failed', details: err.message };
  }

  approvalsLogger.info(
    {
      approval_id: approval.id,
      action: approval.action,
      approver: approverId,
      run_id: approval.run_id,
      decision_reason: decisionReason,
      receipt_id: receipt?.id
    },
    'Approval rejected',
  );

  return { approval, receipt };
}
