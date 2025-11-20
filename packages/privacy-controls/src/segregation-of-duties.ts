/**
 * Segregation of Duties (SoD) Enforcement
 * Prevents conflicts of interest and ensures dual control
 */

import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { SoDConflict } from '@intelgraph/compliance';
import { AuditLogger } from '@intelgraph/audit-logging';

/**
 * Incompatible role pairs
 */
const INCOMPATIBLE_ROLES: Array<[string, string]> = [
  ['ADMIN', 'AUDITOR'],
  ['DEVELOPER', 'APPROVER'],
  ['REQUESTER', 'APPROVER'],
  ['SECURITY_ADMIN', 'DEVELOPER'],
  ['FINANCE_PROCESSOR', 'FINANCE_APPROVER'],
];

/**
 * Dual control requirements
 */
const DUAL_CONTROL_ACTIONS = [
  'user.delete',
  'security.policy.change',
  'encryption.key.export',
  'data.classify.downgrade',
  'audit.log.access',
  'payment.approve',
];

export class SegregationOfDutiesManager {
  private pool: Pool;
  private auditLogger?: AuditLogger;

  constructor(pool: Pool, auditLogger?: AuditLogger) {
    this.pool = pool;
    this.auditLogger = auditLogger;
  }

  /**
   * Initialize SoD tables
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS sod_conflicts (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          role1 VARCHAR(255) NOT NULL,
          role2 VARCHAR(255) NOT NULL,
          conflict_type VARCHAR(50) NOT NULL,
          description TEXT NOT NULL,
          detected_at TIMESTAMPTZ NOT NULL,
          severity VARCHAR(20) NOT NULL,
          status VARCHAR(20) NOT NULL,
          resolution_notes TEXT,
          exception_approved_by VARCHAR(255),
          exception_expiry TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS approval_workflows (
          id VARCHAR(255) PRIMARY KEY,
          action VARCHAR(255) NOT NULL,
          requested_by VARCHAR(255) NOT NULL,
          requested_at TIMESTAMPTZ NOT NULL,
          approved_by VARCHAR(255),
          approved_at TIMESTAMPTZ,
          rejected_by VARCHAR(255),
          rejected_at TIMESTAMPTZ,
          status VARCHAR(20) NOT NULL,
          justification TEXT,
          approval_notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS role_assignments (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          role VARCHAR(255) NOT NULL,
          assigned_by VARCHAR(255) NOT NULL,
          assigned_at TIMESTAMPTZ NOT NULL,
          expires_at TIMESTAMPTZ,
          active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id, role)
        );

        CREATE INDEX IF NOT EXISTS idx_sod_conflicts_user ON sod_conflicts(user_id);
        CREATE INDEX IF NOT EXISTS idx_sod_conflicts_status ON sod_conflicts(status);
        CREATE INDEX IF NOT EXISTS idx_approval_workflows_status ON approval_workflows(status);
      `);
    } finally {
      client.release();
    }
  }

  /**
   * Check for SoD conflicts when assigning a role
   */
  async checkRoleConflict(userId: string, newRole: string): Promise<SoDConflict[]> {
    const conflicts: SoDConflict[] = [];

    // Get user's current roles
    const currentRoles = await this.getUserRoles(userId);

    // Check for incompatible role combinations
    for (const [role1, role2] of INCOMPATIBLE_ROLES) {
      if (
        (currentRoles.includes(role1) && newRole === role2) ||
        (currentRoles.includes(role2) && newRole === role1)
      ) {
        const conflict: SoDConflict = {
          id: randomUUID(),
          userId,
          role1,
          role2,
          conflictType: 'incompatible_roles',
          description: `User cannot have both ${role1} and ${role2} roles simultaneously`,
          detectedAt: new Date(),
          severity: 'high',
          status: 'active',
        };

        conflicts.push(conflict);

        // Record conflict
        await this.recordConflict(conflict);
      }
    }

    return conflicts;
  }

  /**
   * Enforce dual control for sensitive actions
   */
  async requireApproval(
    action: string,
    requestedBy: string,
    justification: string
  ): Promise<{
    requiresApproval: boolean;
    workflowId?: string;
  }> {
    const requiresApproval = DUAL_CONTROL_ACTIONS.includes(action);

    if (!requiresApproval) {
      return { requiresApproval: false };
    }

    // Create approval workflow
    const workflowId = randomUUID();

    await this.pool.query(
      `INSERT INTO approval_workflows
       (id, action, requested_by, requested_at, status, justification)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [workflowId, action, requestedBy, new Date(), 'pending', justification]
    );

    // Audit log
    if (this.auditLogger) {
      await this.auditLogger.log({
        userId: requestedBy,
        userName: requestedBy,
        action: 'approval.requested',
        resource: 'approval_workflow',
        resourceId: workflowId,
        outcome: 'success',
        details: { action, justification },
      });
    }

    return { requiresApproval: true, workflowId };
  }

  /**
   * Approve an action
   */
  async approveAction(
    workflowId: string,
    approvedBy: string,
    notes?: string
  ): Promise<{ approved: boolean; error?: string }> {
    const client = await this.pool.connect();
    try {
      // Get workflow
      const result = await client.query(
        'SELECT * FROM approval_workflows WHERE id = $1',
        [workflowId]
      );

      if (result.rows.length === 0) {
        return { approved: false, error: 'Workflow not found' };
      }

      const workflow = result.rows[0];

      // Ensure approver is different from requester
      if (workflow.requested_by === approvedBy) {
        return { approved: false, error: 'Cannot approve own request (SoD violation)' };
      }

      // Update workflow
      await client.query(
        `UPDATE approval_workflows
         SET approved_by = $1, approved_at = $2, status = $3, approval_notes = $4
         WHERE id = $5`,
        [approvedBy, new Date(), 'approved', notes, workflowId]
      );

      // Audit log
      if (this.auditLogger) {
        await this.auditLogger.log({
          userId: approvedBy,
          userName: approvedBy,
          action: 'approval.granted',
          resource: 'approval_workflow',
          resourceId: workflowId,
          outcome: 'success',
          details: { requestedBy: workflow.requested_by, action: workflow.action },
        });
      }

      return { approved: true };
    } finally {
      client.release();
    }
  }

  /**
   * Get user's current roles
   */
  private async getUserRoles(userId: string): Promise<string[]> {
    const result = await this.pool.query(
      `SELECT role FROM role_assignments
       WHERE user_id = $1 AND active = TRUE
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [userId]
    );

    return result.rows.map(row => row.role);
  }

  /**
   * Record SoD conflict
   */
  private async recordConflict(conflict: SoDConflict): Promise<void> {
    await this.pool.query(
      `INSERT INTO sod_conflicts
       (id, user_id, role1, role2, conflict_type, description, detected_at, severity, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        conflict.id,
        conflict.userId,
        conflict.role1,
        conflict.role2,
        conflict.conflictType,
        conflict.description,
        conflict.detectedAt,
        conflict.severity,
        conflict.status,
      ]
    );

    // Audit log
    if (this.auditLogger) {
      await this.auditLogger.log({
        userId: 'SYSTEM',
        userName: 'SYSTEM',
        action: 'sod.conflict.detected',
        resource: 'sod_conflict',
        resourceId: conflict.id,
        outcome: 'success',
        details: { userId: conflict.userId, role1: conflict.role1, role2: conflict.role2 },
      });
    }
  }
}
