import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { emitEvent } from './events.js';
import { normalizeCode } from './taxonomy.js';

export interface DowngradeRequestInput {
  documentId: string;
  requestedCode: string;
  justification: string;
  actor: string;
}

export interface ApprovalInput {
  requestId: string;
  approver: string;
}

export const createDowngradeRequest = async (pool: Pool, input: DowngradeRequestInput): Promise<string> => {
  const requestedCode = normalizeCode(input.requestedCode);
  const id = uuidv4();
  await pool.query(
    `INSERT INTO downgrade_requests (id, document_id, requested_code, justification, status)
     VALUES ($1, $2, $3, $4, 'pending')`,
    [id, input.documentId, requestedCode, input.justification]
  );
  await pool.query(
    `INSERT INTO audit_receipts (id, document_id, action, actor, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [uuidv4(), input.documentId, 'downgrade_requested', input.actor, { requestedCode }]
  );
  return id;
};

export const approveDowngrade = async (pool: Pool, input: ApprovalInput): Promise<string> => {
  const result = await pool.query(
    `SELECT id, document_id, requested_code, status, approver_one, approver_two FROM downgrade_requests WHERE id = $1`,
    [input.requestId]
  );
  if (!result.rowCount) {
    throw new Error('Request not found');
  }
  const request = result.rows[0];
  if (request.status !== 'pending') {
    return request.status;
  }

  if (!request.approver_one) {
    await pool.query(
      `UPDATE downgrade_requests SET approver_one = $1, updated_at = NOW() WHERE id = $2`,
      [input.approver, input.requestId]
    );
    return 'waiting_second_approval';
  }

  if (request.approver_one === input.approver) {
    throw new Error('Dual control violation: second approver must differ');
  }

  await pool.query(
    `UPDATE documents SET classification_code = $1, updated_at = NOW() WHERE id = $2`,
    [request.requested_code, request.document_id]
  );
  await pool.query(
    `UPDATE downgrade_requests SET approver_two = $1, status = 'approved', updated_at = NOW() WHERE id = $2`,
    [input.approver, input.requestId]
  );

  emitEvent('chm.tag.downgraded', {
    documentId: request.document_id,
    actor: input.approver,
    details: { from: 'current', to: request.requested_code }
  });

  await pool.query(
    `INSERT INTO audit_receipts (id, document_id, action, actor, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [uuidv4(), request.document_id, 'downgrade_approved', input.approver, { requestedCode: request.requested_code }]
  );
  return 'approved';
};
