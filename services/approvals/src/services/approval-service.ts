import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
import { opaClient } from './opa-client.js';
import { provenanceClient } from './provenance-client.js';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';
import {
  approvalRequestsTotal,
  approvalRequestsActive,
  approvalRequestDuration,
  approvalDecisionsTotal,
  approvalDecisionLatency,
  provenanceReceiptsTotal,
} from '../utils/metrics.js';
import {
  NotFoundError,
  ConflictError,
  PolicyDenialError,
} from '../types.js';
import type {
  ApprovalRequest,
  CreateApprovalRequest,
  ApprovalDecisionInput,
  CancelRequestInput,
  ListRequestsQuery,
  PaginatedResponse,
  DecisionRecord,
  PolicyEvaluation,
  Actor,
  Resource,
  AppError,
} from '../types.js';

const log = logger.child({ component: 'approval-service' });

export class ApprovalService {
  /**
   * Create a new approval request
   */
  async createRequest(
    tenantId: string,
    input: CreateApprovalRequest,
    idempotencyKey?: string,
  ): Promise<ApprovalRequest> {
    // Check for existing request with same idempotency key
    if (idempotencyKey) {
      const existing = await this.findByIdempotencyKey(tenantId, idempotencyKey);
      if (existing) {
        log.info({ idempotencyKey, requestId: existing.id }, 'Returning existing request (idempotency)');
        return existing;
      }
    }

    // Evaluate policy to determine approval requirements
    const policyResult = await opaClient.evaluateApprovalRequest({
      tenant_id: tenantId,
      actor: input.requestor,
      resource: input.resource,
      action: input.action,
      attributes: input.attributes || {},
      context: input.context || {},
    });

    // If policy allows without approval, we still create a record but mark it approved
    const initialStatus = policyResult.allow ? 'approved' : 'pending';

    const requestId = uuidv4();
    const now = new Date();
    const expiresAt = input.expires_at
      ? new Date(input.expires_at)
      : new Date(now.getTime() + config.features.approvals.defaultExpirationHours * 60 * 60 * 1000);

    const policyEvaluation: PolicyEvaluation = {
      policy_version: policyResult.policy_version,
      decision: policyResult.allow ? 'allow' : policyResult.require_approval ? 'require_approval' : 'deny',
      required_approvals: policyResult.required_approvals,
      allowed_approver_roles: policyResult.allowed_approver_roles,
      conditions: policyResult.conditions,
      violations: policyResult.violations,
    };

    // Insert the request
    await db.query(
      `INSERT INTO approval_requests (
        id, tenant_id, resource_type, resource_id, resource_data,
        action, requestor_id, requestor_data, status, attributes,
        context, justification, policy_evaluation, idempotency_key,
        expires_at, finalized_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        requestId,
        tenantId,
        input.resource.type,
        input.resource.id,
        JSON.stringify(input.resource),
        input.action,
        input.requestor.id,
        JSON.stringify(input.requestor),
        initialStatus,
        JSON.stringify(input.attributes || {}),
        JSON.stringify(input.context || {}),
        input.justification || null,
        JSON.stringify(policyEvaluation),
        idempotencyKey || null,
        expiresAt,
        initialStatus === 'approved' ? now : null,
      ],
    );

    // Create provenance receipt for request creation
    const receipt = await provenanceClient.createReceipt({
      approval_id: requestId,
      tenant_id: tenantId,
      actor: input.requestor,
      action_type: 'created',
      policy_version: policyResult.policy_version,
      input_data: {
        resource: input.resource,
        action: input.action,
        attributes: input.attributes,
        justification: input.justification,
      },
    });

    // Update metrics
    approvalRequestsTotal.inc({
      tenant_id: tenantId,
      action: input.action,
      resource_type: input.resource.type,
    });

    if (initialStatus === 'pending') {
      approvalRequestsActive.inc({ tenant_id: tenantId });
    }

    provenanceReceiptsTotal.inc({ tenant_id: tenantId, action_type: 'created' });

    // Log audit event
    await this.logAuditEvent(tenantId, requestId, 'request_created', input.requestor.id, {
      resource: input.resource,
      action: input.action,
      policy_evaluation: policyEvaluation,
      receipt_id: receipt.id,
    });

    log.info(
      {
        requestId,
        tenantId,
        action: input.action,
        resourceType: input.resource.type,
        status: initialStatus,
        requiredApprovals: policyResult.required_approvals,
      },
      'Approval request created',
    );

    return this.getRequest(tenantId, requestId) as Promise<ApprovalRequest>;
  }

  /**
   * Get a single approval request by ID
   */
  async getRequest(tenantId: string, requestId: string): Promise<ApprovalRequest | null> {
    const result = await db.query<{
      id: string;
      tenant_id: string;
      resource_type: string;
      resource_id: string;
      resource_data: Record<string, unknown>;
      action: string;
      requestor_id: string;
      requestor_data: Actor;
      status: string;
      attributes: Record<string, unknown>;
      context: Record<string, unknown>;
      justification: string | null;
      policy_evaluation: PolicyEvaluation | null;
      receipt_id: string | null;
      idempotency_key: string | null;
      created_at: Date;
      updated_at: Date;
      expires_at: Date | null;
      finalized_at: Date | null;
    }>(
      `SELECT * FROM approval_requests WHERE id = $1 AND tenant_id = $2`,
      [requestId, tenantId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const decisions = await this.getDecisions(requestId);

    return this.mapRowToRequest(row, decisions);
  }

  /**
   * List approval requests with filtering and pagination
   */
  async listRequests(
    tenantId: string,
    query: ListRequestsQuery,
  ): Promise<PaginatedResponse<ApprovalRequest>> {
    const conditions: string[] = ['tenant_id = $1'];
    const params: unknown[] = [tenantId];
    let paramIndex = 2;

    if (query.status && query.status.length > 0) {
      conditions.push(`status = ANY($${paramIndex})`);
      params.push(query.status);
      paramIndex++;
    }

    if (query.actor) {
      conditions.push(`(requestor_id = $${paramIndex} OR id IN (SELECT request_id FROM approval_decisions WHERE actor_id = $${paramIndex}))`);
      params.push(query.actor);
      paramIndex++;
    }

    if (query.resource_type) {
      conditions.push(`resource_type = $${paramIndex}`);
      params.push(query.resource_type);
      paramIndex++;
    }

    if (query.action) {
      conditions.push(`action = $${paramIndex}`);
      params.push(query.action);
      paramIndex++;
    }

    if (query.from) {
      conditions.push(`created_at >= $${paramIndex}`);
      params.push(query.from);
      paramIndex++;
    }

    if (query.to) {
      conditions.push(`created_at <= $${paramIndex}`);
      params.push(query.to);
      paramIndex++;
    }

    if (query.cursor) {
      const [timestamp, id] = Buffer.from(query.cursor, 'base64').toString().split(':');
      conditions.push(`(created_at, id) < ($${paramIndex}, $${paramIndex + 1})`);
      params.push(timestamp, id);
      paramIndex += 2;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM approval_requests WHERE ${whereClause}`,
      params.slice(0, paramIndex - (query.cursor ? 2 : 0)),
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    params.push(query.limit + 1); // Fetch one extra to determine has_more
    const result = await db.query<{
      id: string;
      tenant_id: string;
      resource_type: string;
      resource_id: string;
      resource_data: Record<string, unknown>;
      action: string;
      requestor_id: string;
      requestor_data: Actor;
      status: string;
      attributes: Record<string, unknown>;
      context: Record<string, unknown>;
      justification: string | null;
      policy_evaluation: PolicyEvaluation | null;
      receipt_id: string | null;
      idempotency_key: string | null;
      created_at: Date;
      updated_at: Date;
      expires_at: Date | null;
      finalized_at: Date | null;
    }>(
      `SELECT * FROM approval_requests
       WHERE ${whereClause}
       ORDER BY created_at DESC, id DESC
       LIMIT $${paramIndex}`,
      params,
    );

    const hasMore = result.rows.length > query.limit;
    const rows = hasMore ? result.rows.slice(0, -1) : result.rows;

    // Fetch decisions for all requests
    const requestIds = rows.map((r) => r.id);
    const decisionsMap = await this.getDecisionsForRequests(requestIds);

    const items = rows.map((row) =>
      this.mapRowToRequest(row, decisionsMap.get(row.id) || []),
    );

    let cursor: string | undefined;
    if (hasMore && rows.length > 0) {
      const lastRow = rows[rows.length - 1];
      cursor = Buffer.from(`${lastRow.created_at.toISOString()}:${lastRow.id}`).toString('base64');
    }

    return {
      items,
      pagination: {
        total,
        limit: query.limit,
        cursor,
        has_more: hasMore,
      },
    };
  }

  /**
   * Submit a decision on an approval request
   */
  async submitDecision(
    tenantId: string,
    requestId: string,
    input: ApprovalDecisionInput,
  ): Promise<ApprovalRequest> {
    const startTime = Date.now();

    // Get the current request
    const request = await this.getRequest(tenantId, requestId);
    if (!request) {
      throw new NotFoundError('ApprovalRequest', requestId);
    }

    // Check if request is still pending
    if (request.status !== 'pending') {
      throw new ConflictError(`Request is already ${request.status}`);
    }

    // Check if actor has already submitted a decision
    const existingDecision = request.decisions.find((d) => d.actor.id === input.actor.id);
    if (existingDecision) {
      throw new ConflictError('Actor has already submitted a decision on this request');
    }

    // Evaluate policy to check if actor can approve
    const policyResult = await opaClient.evaluateDecision({
      tenant_id: tenantId,
      actor: input.actor,
      resource: request.resource,
      action: request.action,
      decision_type: input.decision,
      existing_decisions: request.decisions,
      required_approvals: request.policy_evaluation?.required_approvals || 2,
      allowed_approver_roles: request.policy_evaluation?.allowed_approver_roles || [],
    });

    if (!policyResult.allow) {
      throw new PolicyDenialError('Actor is not authorized to submit this decision', {
        version: policyResult.policy_version,
        violations: policyResult.violations,
        required_roles: request.policy_evaluation?.allowed_approver_roles,
      });
    }

    // Create the decision record
    const decisionId = uuidv4();
    const now = new Date();

    await db.query(
      `INSERT INTO approval_decisions (
        id, request_id, tenant_id, actor_id, actor_data,
        decision, reason, conditions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        decisionId,
        requestId,
        tenantId,
        input.actor.id,
        JSON.stringify(input.actor),
        input.decision,
        input.reason || null,
        JSON.stringify(input.conditions || []),
      ],
    );

    // Create provenance receipt for this decision
    const receipt = await provenanceClient.createReceipt({
      approval_id: requestId,
      decision_id: decisionId,
      tenant_id: tenantId,
      actor: input.actor,
      action_type: input.decision,
      policy_version: policyResult.policy_version,
      input_data: {
        request_id: requestId,
        decision: input.decision,
        reason: input.reason,
        conditions: input.conditions,
      },
    });

    // Update decision with receipt ID
    await db.query(
      `UPDATE approval_decisions SET receipt_id = $1 WHERE id = $2`,
      [receipt.id, decisionId],
    );

    // Check if request should be finalized
    let newStatus: ApprovalRequest['status'] = request.status;
    let finalReceiptId: string | undefined;

    if (input.decision === 'reject') {
      // Any rejection finalizes the request
      newStatus = 'rejected';
    } else if (policyResult.is_final) {
      // Policy says we have enough approvals
      newStatus = 'approved';
    }

    if (newStatus !== 'pending') {
      await db.query(
        `UPDATE approval_requests SET status = $1, finalized_at = $2, receipt_id = $3 WHERE id = $4`,
        [newStatus, now, receipt.id, requestId],
      );
      finalReceiptId = receipt.id;

      approvalRequestsActive.dec({ tenant_id: tenantId });
      approvalRequestDuration.observe(
        { tenant_id: tenantId, action: request.action, final_status: newStatus },
        (now.getTime() - new Date(request.created_at).getTime()) / 1000,
      );
    }

    // Update metrics
    approvalDecisionsTotal.inc({
      tenant_id: tenantId,
      decision: input.decision,
      action: request.action,
    });
    approvalDecisionLatency.observe(
      { tenant_id: tenantId, decision: input.decision },
      (Date.now() - startTime) / 1000,
    );
    provenanceReceiptsTotal.inc({ tenant_id: tenantId, action_type: input.decision });

    // Log audit event
    await this.logAuditEvent(tenantId, requestId, 'decision_submitted', input.actor.id, {
      decision_id: decisionId,
      decision: input.decision,
      reason: input.reason,
      new_status: newStatus,
      receipt_id: receipt.id,
    });

    log.info(
      {
        requestId,
        decisionId,
        actor: input.actor.id,
        decision: input.decision,
        newStatus,
        isFinal: newStatus !== 'pending',
      },
      'Decision submitted',
    );

    return this.getRequest(tenantId, requestId) as Promise<ApprovalRequest>;
  }

  /**
   * Cancel an approval request
   */
  async cancelRequest(
    tenantId: string,
    requestId: string,
    input: CancelRequestInput,
  ): Promise<ApprovalRequest> {
    const request = await this.getRequest(tenantId, requestId);
    if (!request) {
      throw new NotFoundError('ApprovalRequest', requestId);
    }

    if (request.status !== 'pending') {
      throw new ConflictError(`Request is already ${request.status}`);
    }

    // Only the requestor or an admin can cancel
    const isRequestor = request.requestor.id === input.actor.id;
    const isAdmin = input.actor.roles?.includes('admin') || input.actor.roles?.includes('tenant-admin');

    if (!isRequestor && !isAdmin) {
      throw new PolicyDenialError('Only the requestor or an admin can cancel this request', {
        version: 'authorization',
        violations: ['Not authorized to cancel'],
      });
    }

    const now = new Date();

    await db.query(
      `UPDATE approval_requests SET status = 'cancelled', finalized_at = $1 WHERE id = $2`,
      [now, requestId],
    );

    // Create provenance receipt
    const receipt = await provenanceClient.createReceipt({
      approval_id: requestId,
      tenant_id: tenantId,
      actor: input.actor,
      action_type: 'cancelled',
      policy_version: 'n/a',
      input_data: {
        request_id: requestId,
        reason: input.reason,
      },
    });

    approvalRequestsActive.dec({ tenant_id: tenantId });
    provenanceReceiptsTotal.inc({ tenant_id: tenantId, action_type: 'cancelled' });

    await this.logAuditEvent(tenantId, requestId, 'request_cancelled', input.actor.id, {
      reason: input.reason,
      receipt_id: receipt.id,
    });

    log.info({ requestId, actor: input.actor.id }, 'Request cancelled');

    return this.getRequest(tenantId, requestId) as Promise<ApprovalRequest>;
  }

  /**
   * Expire stale pending requests
   */
  async expireStaleRequests(): Promise<number> {
    const result = await db.query<{ id: string; tenant_id: string; action: string }>(
      `UPDATE approval_requests
       SET status = 'expired', finalized_at = NOW()
       WHERE status = 'pending' AND expires_at < NOW()
       RETURNING id, tenant_id, action`,
    );

    for (const row of result.rows) {
      approvalRequestsActive.dec({ tenant_id: row.tenant_id });
      await this.logAuditEvent(row.tenant_id, row.id, 'request_expired', 'system', {});
    }

    if (result.rowCount && result.rowCount > 0) {
      log.info({ count: result.rowCount }, 'Expired stale requests');
    }

    return result.rowCount || 0;
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private async findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
  ): Promise<ApprovalRequest | null> {
    const result = await db.query<{ id: string }>(
      `SELECT id FROM approval_requests WHERE tenant_id = $1 AND idempotency_key = $2`,
      [tenantId, idempotencyKey],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.getRequest(tenantId, result.rows[0].id);
  }

  private async getDecisions(requestId: string): Promise<DecisionRecord[]> {
    const result = await db.query<{
      id: string;
      actor_id: string;
      actor_data: Actor;
      decision: string;
      reason: string | null;
      conditions: unknown[];
      receipt_id: string | null;
      created_at: Date;
    }>(
      `SELECT * FROM approval_decisions WHERE request_id = $1 ORDER BY created_at ASC`,
      [requestId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      actor: row.actor_data,
      decision: row.decision as 'approve' | 'reject',
      reason: row.reason || undefined,
      conditions: row.conditions as DecisionRecord['conditions'],
      timestamp: row.created_at.toISOString(),
      receipt_id: row.receipt_id || undefined,
    }));
  }

  private async getDecisionsForRequests(
    requestIds: string[],
  ): Promise<Map<string, DecisionRecord[]>> {
    if (requestIds.length === 0) {
      return new Map();
    }

    const result = await db.query<{
      id: string;
      request_id: string;
      actor_id: string;
      actor_data: Actor;
      decision: string;
      reason: string | null;
      conditions: unknown[];
      receipt_id: string | null;
      created_at: Date;
    }>(
      `SELECT * FROM approval_decisions WHERE request_id = ANY($1) ORDER BY created_at ASC`,
      [requestIds],
    );

    const map = new Map<string, DecisionRecord[]>();
    for (const row of result.rows) {
      const decisions = map.get(row.request_id) || [];
      decisions.push({
        id: row.id,
        actor: row.actor_data,
        decision: row.decision as 'approve' | 'reject',
        reason: row.reason || undefined,
        conditions: row.conditions as DecisionRecord['conditions'],
        timestamp: row.created_at.toISOString(),
        receipt_id: row.receipt_id || undefined,
      });
      map.set(row.request_id, decisions);
    }

    return map;
  }

  private mapRowToRequest(
    row: {
      id: string;
      tenant_id: string;
      resource_type: string;
      resource_id: string;
      resource_data: Record<string, unknown>;
      action: string;
      requestor_id: string;
      requestor_data: Actor;
      status: string;
      attributes: Record<string, unknown>;
      context: Record<string, unknown>;
      justification: string | null;
      policy_evaluation: PolicyEvaluation | null;
      receipt_id: string | null;
      idempotency_key: string | null;
      created_at: Date;
      updated_at: Date;
      expires_at: Date | null;
      finalized_at: Date | null;
    },
    decisions: DecisionRecord[],
  ): ApprovalRequest {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      resource: row.resource_data as Resource,
      action: row.action,
      requestor: row.requestor_data,
      status: row.status as ApprovalRequest['status'],
      attributes: row.attributes,
      context: row.context,
      justification: row.justification || undefined,
      policy_evaluation: row.policy_evaluation || undefined,
      decisions,
      receipt_id: row.receipt_id || undefined,
      idempotency_key: row.idempotency_key || undefined,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
      expires_at: row.expires_at?.toISOString(),
      finalized_at: row.finalized_at?.toISOString(),
    };
  }

  private async logAuditEvent(
    tenantId: string,
    requestId: string,
    eventType: string,
    actorId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await db.query(
      `INSERT INTO approval_audit_log (tenant_id, request_id, event_type, actor_id, data)
       VALUES ($1, $2, $3, $4, $5)`,
      [tenantId, requestId, eventType, actorId, JSON.stringify(data)],
    );
  }
}

export const approvalService = new ApprovalService();
