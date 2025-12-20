import { getPostgresPool } from '../postgres.js';

export type DualControlVerdict = 'approved' | 'declined';

export interface DualControlApprovalRecord {
  runId: string;
  stepId: string;
  userId: string;
  verdict: DualControlVerdict;
  reason?: string;
  role?: string;
  attributes?: Record<string, unknown>;
  createdAt?: Date;
}

const safeRows = <T = unknown>(result: unknown): T[] =>
  Array.isArray((result as { rows?: unknown[] })?.rows)
    ? ((result as { rows: T[] }).rows as T[])
    : [];

const serializeReason = (input: DualControlApprovalRecord): string | null => {
  if (!input.reason && !input.role && !input.attributes) {
    return null;
  }

  return JSON.stringify({
    reason: input.reason,
    role: input.role,
    attributes: input.attributes || {},
  });
};

const parseReason = (
  reason: string | null,
): Pick<DualControlApprovalRecord, 'reason' | 'role' | 'attributes'> => {
  if (!reason) return {};

  try {
    const parsed = JSON.parse(reason);
    return {
      reason: parsed.reason,
      role: parsed.role,
      attributes: parsed.attributes,
    };
  } catch {
    return { reason };
  }
};

const mapRow = (row: any): DualControlApprovalRecord => {
  const parsed = parseReason(row.reason);

  return {
    runId: row.run_id,
    stepId: row.step_id,
    userId: row.user_id,
    verdict: row.verdict,
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    ...parsed,
  };
};

export async function upsertDualControlApproval(
  approval: DualControlApprovalRecord,
): Promise<DualControlApprovalRecord> {
  const pool = getPostgresPool();

  const result = await pool.query(
    `INSERT INTO approvals (run_id, step_id, user_id, verdict, reason)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (run_id, step_id, user_id)
     DO UPDATE SET verdict = EXCLUDED.verdict, reason = EXCLUDED.reason
     RETURNING run_id, step_id, user_id, verdict, reason, created_at`,
    [
      approval.runId,
      approval.stepId,
      approval.userId,
      approval.verdict,
      serializeReason(approval),
    ],
  );

  const row = safeRows(result)[0];
  return mapRow(row);
}

export async function getDualControlState(
  runId: string,
  stepId: string,
): Promise<{
  approvals: DualControlApprovalRecord[];
  approvalsCount: number;
  distinctApprovers: number;
  declinations: number;
}> {
  const pool = getPostgresPool();
  const result = await pool.query(
    `SELECT run_id, step_id, user_id, verdict, reason, created_at
     FROM approvals
     WHERE run_id = $1 AND step_id = $2`,
    [runId, stepId],
  );

  const approvals = safeRows(result).map(mapRow);

  return {
    approvals,
    approvalsCount: approvals.length,
    distinctApprovers: new Set(approvals.map((a) => a.userId)).size,
    declinations: approvals.filter((a) => a.verdict === 'declined').length,
  };
}
