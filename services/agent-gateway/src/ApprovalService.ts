/**
 * Approval Service
 * AGENT-9: High-Risk Approval Workflow
 */

import type {
  AgentApproval,
  ApprovalRequest,
  ApprovalDecision,
  ApprovalStatus,
  RiskAssessment,
  RiskLevel,
} from './types.js';

export class ApprovalService {
  constructor(private db: any) {}

  /**
   * Create approval request for high-risk action
   * AGENT-9b: Approval request queue
   */
  async createApproval(request: ApprovalRequest): Promise<AgentApproval> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + request.expiresInMinutes);

    const result = await this.db.query(
      `INSERT INTO agent_approvals (
        agent_id, run_id, action_id,
        request_summary, request_details,
        risk_level, risk_assessment,
        assigned_to, assigned_roles,
        status, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        request.agentId,
        request.runId,
        request.actionId,
        request.summary,
        JSON.stringify(request.details),
        request.riskLevel,
        null, // Risk assessment computed separately
        JSON.stringify(request.assignedTo),
        JSON.stringify([]), // Assigned roles
        'pending',
        expiresAt,
      ]
    );

    return this.mapRowToApproval(result.rows[0]);
  }

  /**
   * Process approval decision
   * AGENT-9c: UI/API for approvals
   */
  async processDecision(decision: ApprovalDecision): Promise<AgentApproval> {
    // Get approval
    const approval = await this.getApproval(decision.approvalId);
    if (!approval) {
      throw new Error(`Approval not found: ${decision.approvalId}`);
    }

    // Check if already decided
    if (approval.status !== 'pending') {
      throw new Error(`Approval already ${approval.status}`);
    }

    // Check if expired
    if (approval.expiresAt < new Date()) {
      throw new Error('Approval request has expired');
    }

    // Validate user is in assigned list
    if (!approval.assignedTo.includes(decision.userId)) {
      throw new Error('User not authorized to approve this request');
    }

    // Update approval
    const result = await this.db.query(
      `UPDATE agent_approvals
       SET status = $1,
           decision_made_by = $2,
           decision_made_at = CURRENT_TIMESTAMP,
           decision_reason = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [decision.decision, decision.userId, decision.reason, decision.approvalId]
    );

    const updatedApproval = this.mapRowToApproval(result.rows[0]);

    // If approved, update the associated action
    if (decision.decision === 'approved' && approval.actionId) {
      await this.db.query(
        `UPDATE agent_actions
         SET authorization_status = 'approved',
             approved_by = $1,
             approved_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [decision.userId, approval.actionId]
      );
    }

    return updatedApproval;
  }

  /**
   * Get approval by ID
   */
  async getApproval(approvalId: string): Promise<AgentApproval | null> {
    const result = await this.db.query(
      'SELECT * FROM agent_approvals WHERE id = $1',
      [approvalId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToApproval(result.rows[0]);
  }

  /**
   * List pending approvals for a user
   */
  async listPendingApprovals(userId: string): Promise<AgentApproval[]> {
    const result = await this.db.query(
      `SELECT * FROM agent_approvals
       WHERE status = 'pending'
       AND expires_at > CURRENT_TIMESTAMP
       AND assigned_to @> $1
       ORDER BY created_at ASC`,
      [JSON.stringify([userId])]
    );

    return result.rows.map(this.mapRowToApproval);
  }

  /**
   * List all approvals for an agent
   */
  async listAgentApprovals(
    agentId: string,
    filters?: {
      status?: ApprovalStatus;
      riskLevel?: RiskLevel;
    }
  ): Promise<AgentApproval[]> {
    let query = 'SELECT * FROM agent_approvals WHERE agent_id = $1';
    const params: unknown[] = [agentId];
    let paramIndex = 2;

    if (filters?.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.riskLevel) {
      query += ` AND risk_level = $${paramIndex}`;
      params.push(filters.riskLevel);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.db.query(query, params);
    return result.rows.map(this.mapRowToApproval);
  }

  /**
   * Expire old pending approvals
   */
  async expireOldApprovals(): Promise<number> {
    const result = await this.db.query(
      `UPDATE agent_approvals
       SET status = 'expired',
           updated_at = CURRENT_TIMESTAMP
       WHERE status = 'pending'
       AND expires_at < CURRENT_TIMESTAMP
       RETURNING id`
    );

    return result.rowCount || 0;
  }

  /**
   * Compute risk assessment for an approval
   */
  computeRiskAssessment(approval: AgentApproval): RiskAssessment {
    const factors = [];
    const impact = [];
    const recommendations = [];

    // Analyze risk level
    if (approval.riskLevel === 'critical') {
      factors.push({
        factor: 'critical_risk',
        severity: 'critical' as RiskLevel,
        description: 'Action has critical risk level',
        mitigation: 'Require multiple approvers',
      });
      impact.push('Could cause severe system impact');
      recommendations.push('Consider requiring secondary approval');
      recommendations.push('Review action details carefully');
    }

    if (approval.riskLevel === 'high') {
      factors.push({
        factor: 'high_risk',
        severity: 'high' as RiskLevel,
        description: 'Action has high risk level',
        mitigation: 'Require senior approval',
      });
      impact.push('Could cause significant impact');
      recommendations.push('Verify action is necessary');
    }

    // Check if agent details are available in request
    const details = approval.requestDetails as any;
    if (details?.action?.type === 'delete') {
      impact.push('Data deletion - may be irreversible');
      recommendations.push('Verify backup exists before approving');
    }

    if (details?.action?.type === 'user:impersonate') {
      impact.push('User impersonation - security sensitive');
      recommendations.push('Verify legitimate need for impersonation');
    }

    return {
      overallRisk: approval.riskLevel,
      factors,
      impact,
      recommendations,
      autoApprovalEligible: false, // High-risk actions never auto-approve
    };
  }

  // =========================================================================
  // Mappers
  // =========================================================================

  private mapRowToApproval(row: any): AgentApproval {
    return {
      id: row.id,
      agentId: row.agent_id,
      runId: row.run_id,
      actionId: row.action_id,
      requestSummary: row.request_summary,
      requestDetails: JSON.parse(row.request_details || '{}'),
      riskLevel: row.risk_level,
      riskAssessment: row.risk_assessment ? JSON.parse(row.risk_assessment) : undefined,
      assignedTo: JSON.parse(row.assigned_to || '[]'),
      assignedRoles: JSON.parse(row.assigned_roles || '[]'),
      status: row.status,
      decisionMadeBy: row.decision_made_by,
      decisionMadeAt: row.decision_made_at,
      decisionReason: row.decision_reason,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
