/**
 * Warrant Lifecycle Service
 *
 * Manages the complete lifecycle of warrants and legal authorities:
 * - Creation and registration
 * - Validation and verification
 * - Binding to resources
 * - Expiration monitoring and alerts
 * - Approval workflows
 * - Usage tracking and audit
 */

import { Pool } from 'pg';
import pino from 'pino';
import type {
  Warrant,
  WarrantType,
  WarrantStatus,
  WarrantValidationResult,
  Action,
} from './types';
import { WarrantError } from './types';

const logger = pino({ name: 'warrant-service' });

// ============================================================================
// Interfaces
// ============================================================================

export interface CreateWarrantInput {
  tenantId: string;
  warrantNumber: string;
  warrantType: WarrantType;
  issuingAuthority: string;
  jurisdiction: string;
  legalBasis: string;
  scope: Record<string, unknown>;
  scopeDescription: string;
  permittedActions: Action[];
  issuedDate: Date;
  effectiveDate: Date;
  expiryDate?: Date;
  caseNumber?: string;
  targetSubjects?: string[];
  targetDataTypes?: string[];
  geographicScope?: string[];
  requiresApproval?: boolean;
  requiresTwoPerson?: boolean;
  documentUrl?: string;
  documentHash?: string;
  createdBy: string;
}

export interface BindWarrantInput {
  warrantId: string;
  tenantId: string;
  resourceType: string;
  resourceId: string;
  permittedUsers?: string[];
  permittedRoles?: string[];
  boundBy: string;
}

export interface ApproveWarrantInput {
  warrantId: string;
  approverUserId: string;
  approverRole: string;
  decision: 'APPROVED' | 'REJECTED';
  reason: string;
}

export interface WarrantUsageInput {
  warrantId: string;
  bindingId?: string;
  tenantId: string;
  userId: string;
  userEmail: string;
  userRoles: string[];
  action: Action;
  resourceType: string;
  resourceId: string;
  purpose: string;
  authorizationDecision: 'ALLOW' | 'DENY' | 'CHALLENGE';
  decisionReason: string;
  investigationId?: string;
  caseReference?: string;
  ip?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
}

// ============================================================================
// Service
// ============================================================================

export class WarrantService {
  private db: Pool;

  constructor(databaseUrl?: string) {
    this.db = new Pool({
      connectionString: databaseUrl || process.env.DATABASE_URL || 'postgresql://localhost:5432/intelgraph',
      max: 20,
    });
  }

  // ==========================================================================
  // Warrant Creation and Registration
  // ==========================================================================

  /**
   * Create a new warrant
   */
  async createWarrant(input: CreateWarrantInput): Promise<Warrant> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Validate warrant doesn't already exist
      const existing = await client.query(
        `SELECT warrant_id FROM warrants
         WHERE tenant_id = $1 AND warrant_number = $2`,
        [input.tenantId, input.warrantNumber]
      );

      if (existing.rows.length > 0) {
        throw new WarrantError(
          `Warrant ${input.warrantNumber} already exists for tenant ${input.tenantId}`,
          'WARRANT_ALREADY_EXISTS',
          400
        );
      }

      // Insert warrant
      const result = await client.query(
        `INSERT INTO warrants (
          tenant_id, warrant_number, warrant_type, issuing_authority,
          jurisdiction, legal_basis, scope, scope_description, permitted_actions,
          issued_date, effective_date, expiry_date, case_number,
          target_subjects, target_data_types, geographic_scope,
          requires_approval, requires_two_person,
          document_url, document_hash, created_by,
          status, approval_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        RETURNING *`,
        [
          input.tenantId,
          input.warrantNumber,
          input.warrantType,
          input.issuingAuthority,
          input.jurisdiction,
          input.legalBasis,
          JSON.stringify(input.scope),
          input.scopeDescription,
          input.permittedActions,
          input.issuedDate,
          input.effectiveDate,
          input.expiryDate || null,
          input.caseNumber || null,
          input.targetSubjects || null,
          input.targetDataTypes || null,
          input.geographicScope || null,
          input.requiresApproval || false,
          input.requiresTwoPerson || false,
          input.documentUrl || null,
          input.documentHash || null,
          input.createdBy,
          input.requiresApproval ? 'PENDING' : 'ACTIVE',
          input.requiresApproval ? 'PENDING' : null,
        ]
      );

      const warrant = this.mapRowToWarrant(result.rows[0]);

      // Create approval workflow if required
      if (input.requiresApproval) {
        await this.createApprovalWorkflow(client, warrant.warrantId, input.tenantId);
      }

      // Schedule expiration alert if expiry date exists
      if (input.expiryDate) {
        await this.scheduleExpirationAlert(client, warrant.warrantId, input.tenantId, input.expiryDate);
      }

      await client.query('COMMIT');

      logger.info(
        { warrantId: warrant.warrantId, warrantNumber: input.warrantNumber, tenantId: input.tenantId },
        'Warrant created'
      );

      return warrant;

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({ error, input }, 'Failed to create warrant');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update warrant status
   */
  async updateWarrantStatus(
    warrantId: string,
    status: WarrantStatus,
    updatedBy: string,
    reason?: string
  ): Promise<void> {
    try {
      const result = await this.db.query(
        `UPDATE warrants
         SET status = $1, updated_by = $2, updated_at = NOW()
         WHERE warrant_id = $3`,
        [status, updatedBy, warrantId]
      );

      if (result.rowCount === 0) {
        throw new WarrantError('Warrant not found', 'WARRANT_NOT_FOUND', 404);
      }

      logger.info(
        { warrantId, status, updatedBy, reason },
        'Warrant status updated'
      );

    } catch (error) {
      logger.error({ error, warrantId, status }, 'Failed to update warrant status');
      throw error;
    }
  }

  // ==========================================================================
  // Warrant Binding
  // ==========================================================================

  /**
   * Bind warrant to a resource
   */
  async bindWarrant(input: BindWarrantInput): Promise<string> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Validate warrant exists and is active
      const warrantResult = await client.query(
        `SELECT status, expiry_date FROM warrants WHERE warrant_id = $1`,
        [input.warrantId]
      );

      if (warrantResult.rows.length === 0) {
        throw new WarrantError('Warrant not found', 'WARRANT_NOT_FOUND', 404);
      }

      const warrant = warrantResult.rows[0];
      if (warrant.status !== 'ACTIVE') {
        throw new WarrantError(
          `Cannot bind warrant with status ${warrant.status}`,
          'WARRANT_NOT_ACTIVE',
          400
        );
      }

      if (warrant.expiry_date && new Date(warrant.expiry_date) < new Date()) {
        throw new WarrantError('Warrant has expired', 'WARRANT_EXPIRED', 400);
      }

      // Check for existing active binding
      const existingBinding = await client.query(
        `SELECT binding_id FROM warrant_bindings
         WHERE resource_type = $1 AND resource_id = $2 AND tenant_id = $3
           AND binding_status = 'ACTIVE'`,
        [input.resourceType, input.resourceId, input.tenantId]
      );

      // Revoke existing binding if present
      if (existingBinding.rows.length > 0) {
        await client.query(
          `UPDATE warrant_bindings
           SET binding_status = 'REVOKED',
               unbound_by = $1,
               unbound_at = NOW(),
               unbind_reason = 'Superseded by new warrant binding'
           WHERE binding_id = $2`,
          [input.boundBy, existingBinding.rows[0].binding_id]
        );
      }

      // Create new binding
      const result = await client.query(
        `INSERT INTO warrant_bindings (
          warrant_id, tenant_id, resource_type, resource_id,
          permitted_users, permitted_roles, bound_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING binding_id`,
        [
          input.warrantId,
          input.tenantId,
          input.resourceType,
          input.resourceId,
          input.permittedUsers || null,
          input.permittedRoles || null,
          input.boundBy,
        ]
      );

      const bindingId = result.rows[0].binding_id;

      await client.query('COMMIT');

      logger.info(
        {
          bindingId,
          warrantId: input.warrantId,
          resourceType: input.resourceType,
          resourceId: input.resourceId,
        },
        'Warrant bound to resource'
      );

      return bindingId;

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({ error, input }, 'Failed to bind warrant');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Unbind warrant from resource
   */
  async unbindWarrant(
    bindingId: string,
    unboundBy: string,
    reason: string
  ): Promise<void> {
    try {
      const result = await this.db.query(
        `UPDATE warrant_bindings
         SET binding_status = 'REVOKED',
             unbound_by = $1,
             unbound_at = NOW(),
             unbind_reason = $2
         WHERE binding_id = $3 AND binding_status = 'ACTIVE'`,
        [unboundBy, reason, bindingId]
      );

      if (result.rowCount === 0) {
        throw new WarrantError('Active binding not found', 'BINDING_NOT_FOUND', 404);
      }

      logger.info({ bindingId, unboundBy, reason }, 'Warrant unbound from resource');

    } catch (error) {
      logger.error({ error, bindingId }, 'Failed to unbind warrant');
      throw error;
    }
  }

  // ==========================================================================
  // Warrant Validation
  // ==========================================================================

  /**
   * Validate warrant for specific action
   */
  async validateWarrant(
    warrantId: string,
    action: Action,
    resourceType?: string
  ): Promise<WarrantValidationResult> {
    try {
      // Use database function for validation
      const result = await this.db.query<{ is_valid: boolean }>(
        `SELECT is_warrant_valid($1, $2, $3) as is_valid`,
        [warrantId, action, resourceType || null]
      );

      if (!result.rows[0]?.is_valid) {
        // Fetch warrant details for error message
        const warrantResult = await this.db.query(
          `SELECT status, expiry_date, permitted_actions
           FROM warrants WHERE warrant_id = $1`,
          [warrantId]
        );

        if (warrantResult.rows.length === 0) {
          return { valid: false, reason: 'Warrant not found' };
        }

        const warrant = warrantResult.rows[0];

        if (warrant.status !== 'ACTIVE') {
          return { valid: false, reason: `Warrant status is ${warrant.status}` };
        }

        if (warrant.expiry_date && new Date(warrant.expiry_date) < new Date()) {
          return { valid: false, reason: 'Warrant has expired' };
        }

        if (!warrant.permitted_actions.includes(action)) {
          return {
            valid: false,
            reason: `Action '${action}' not permitted by warrant. Allowed: ${warrant.permitted_actions.join(', ')}`,
          };
        }

        return { valid: false, reason: 'Warrant validation failed' };
      }

      // Fetch full warrant details
      const warrantResult = await this.db.query(
        `SELECT * FROM warrants WHERE warrant_id = $1`,
        [warrantId]
      );

      const warrant = this.mapRowToWarrant(warrantResult.rows[0]);

      // Calculate time until expiry
      let expiresIn: number | undefined;
      if (warrant.expiryDate) {
        expiresIn = warrant.expiryDate.getTime() - Date.now();
      }

      return {
        valid: true,
        warrant,
        expiresIn,
      };

    } catch (error) {
      logger.error({ error, warrantId }, 'Warrant validation error');
      return { valid: false, reason: 'Warrant validation failed' };
    }
  }

  /**
   * Get active warrant for resource
   */
  async getActiveWarrantForResource(
    tenantId: string,
    resourceType: string,
    resourceId: string
  ): Promise<Warrant | null> {
    try {
      const result = await this.db.query(
        `SELECT w.*
         FROM warrants w
         JOIN warrant_bindings wb ON w.warrant_id = wb.warrant_id
         WHERE wb.tenant_id = $1
           AND wb.resource_type = $2
           AND wb.resource_id = $3
           AND wb.binding_status = 'ACTIVE'
           AND w.status = 'ACTIVE'
           AND (w.expiry_date IS NULL OR w.expiry_date > NOW())
         LIMIT 1`,
        [tenantId, resourceType, resourceId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToWarrant(result.rows[0]);

    } catch (error) {
      logger.error({ error, tenantId, resourceType, resourceId }, 'Failed to get active warrant');
      return null;
    }
  }

  // ==========================================================================
  // Warrant Approval Workflow
  // ==========================================================================

  /**
   * Create approval workflow for warrant
   */
  private async createApprovalWorkflow(
    client: any,
    warrantId: string,
    tenantId: string
  ): Promise<void> {
    const slaDeadline = new Date();
    slaDeadline.setDate(slaDeadline.getDate() + 3); // 3-day SLA

    await client.query(
      `INSERT INTO warrant_approval_workflow (
        warrant_id, tenant_id, required_approvers, required_roles,
        approval_sequence, sla_deadline
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [warrantId, tenantId, 1, ['ADMIN', 'LEGAL'], 'ANY', slaDeadline]
    );
  }

  /**
   * Approve or reject warrant
   */
  async approveWarrant(input: ApproveWarrantInput): Promise<void> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Get workflow
      const workflowResult = await client.query(
        `SELECT * FROM warrant_approval_workflow
         WHERE warrant_id = $1 AND workflow_status = 'PENDING'`,
        [input.warrantId]
      );

      if (workflowResult.rows.length === 0) {
        throw new WarrantError('No pending approval workflow', 'NO_PENDING_WORKFLOW', 400);
      }

      const workflow = workflowResult.rows[0];

      // Validate approver has required role
      if (!workflow.required_roles.includes(input.approverRole)) {
        throw new WarrantError(
          `Role ${input.approverRole} not authorized to approve. Required: ${workflow.required_roles.join(', ')}`,
          'UNAUTHORIZED_APPROVER',
          403
        );
      }

      // Record approval step
      await client.query(
        `INSERT INTO warrant_approval_steps (
          workflow_id, step_number, approver_role, approver_user_id,
          step_status, decision_reason, decision_timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          workflow.workflow_id,
          1,
          input.approverRole,
          input.approverUserId,
          input.decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
          input.reason,
        ]
      );

      // Update workflow status
      const newWorkflowStatus = input.decision === 'APPROVED' ? 'APPROVED' : 'REJECTED';
      await client.query(
        `UPDATE warrant_approval_workflow
         SET workflow_status = $1, completed_at = NOW()
         WHERE workflow_id = $2`,
        [newWorkflowStatus, workflow.workflow_id]
      );

      // Update warrant
      const newWarrantStatus = input.decision === 'APPROVED' ? 'ACTIVE' : 'PENDING';
      await client.query(
        `UPDATE warrants
         SET approval_status = $1,
             status = $2,
             approved_by = $3,
             approval_timestamp = NOW(),
             approval_reason = $4
         WHERE warrant_id = $5`,
        [input.decision, newWarrantStatus, input.approverUserId, input.reason, input.warrantId]
      );

      await client.query('COMMIT');

      logger.info(
        { warrantId: input.warrantId, decision: input.decision, approver: input.approverUserId },
        'Warrant approval decision recorded'
      );

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({ error, input }, 'Failed to process warrant approval');
      throw error;
    } finally {
      client.release();
    }
  }

  // ==========================================================================
  // Expiration Monitoring
  // ==========================================================================

  /**
   * Schedule expiration alert
   */
  private async scheduleExpirationAlert(
    client: any,
    warrantId: string,
    tenantId: string,
    expiryDate: Date
  ): Promise<void> {
    // Schedule alert 30 days before expiry
    const alertDate = new Date(expiryDate);
    alertDate.setDate(alertDate.getDate() - 30);

    // Only schedule if alert date is in the future
    if (alertDate > new Date()) {
      await client.query(
        `INSERT INTO warrant_expiration_alerts (
          warrant_id, tenant_id, alert_type, scheduled_for, notify_roles
        ) VALUES ($1, $2, $3, $4, $5)`,
        [warrantId, tenantId, 'APPROACHING_EXPIRY', alertDate, ['ADMIN', 'LEGAL']]
      );
    }
  }

  /**
   * Check for expiring warrants and send alerts
   */
  async processExpirationAlerts(): Promise<number> {
    try {
      // Find pending alerts that are due
      const result = await this.db.query(
        `SELECT wea.*, w.warrant_number, w.warrant_type, w.expiry_date
         FROM warrant_expiration_alerts wea
         JOIN warrants w ON wea.warrant_id = w.warrant_id
         WHERE wea.alert_status = 'PENDING'
           AND wea.scheduled_for <= NOW()
         ORDER BY wea.scheduled_for ASC
         LIMIT 100`
      );

      let processedCount = 0;

      for (const alert of result.rows) {
        try {
          // Mark as sent
          await this.db.query(
            `UPDATE warrant_expiration_alerts
             SET alert_status = 'SENT', sent_at = NOW()
             WHERE alert_id = $1`,
            [alert.alert_id]
          );

          logger.info(
            {
              alertId: alert.alert_id,
              warrantId: alert.warrant_id,
              warrantNumber: alert.warrant_number,
              expiryDate: alert.expiry_date,
            },
            'Warrant expiration alert sent'
          );

          processedCount++;

        } catch (error) {
          logger.error({ error, alert }, 'Failed to process expiration alert');
        }
      }

      return processedCount;

    } catch (error) {
      logger.error({ error }, 'Failed to process expiration alerts');
      return 0;
    }
  }

  // ==========================================================================
  // Usage Tracking
  // ==========================================================================

  /**
   * Log warrant usage
   */
  async logWarrantUsage(input: WarrantUsageInput): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO warrant_usage_log (
          warrant_id, binding_id, tenant_id, user_id, user_email, user_roles,
          action, resource_type, resource_id, purpose, investigation_id,
          case_reference, authorization_decision, decision_reason,
          ip_address, user_agent, session_id, request_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [
          input.warrantId,
          input.bindingId || null,
          input.tenantId,
          input.userId,
          input.userEmail,
          input.userRoles,
          input.action,
          input.resourceType,
          input.resourceId,
          input.purpose,
          input.investigationId || null,
          input.caseReference || null,
          input.authorizationDecision,
          input.decisionReason,
          input.ip || null,
          input.userAgent || null,
          input.sessionId || null,
          input.requestId || null,
        ]
      );

      // Update binding usage stats
      if (input.bindingId) {
        await this.db.query(
          `UPDATE warrant_bindings
           SET usage_count = usage_count + 1,
               last_used_at = NOW(),
               first_used_at = COALESCE(first_used_at, NOW())
           WHERE binding_id = $1`,
          [input.bindingId]
        );
      }

    } catch (error) {
      logger.error({ error, input }, 'Failed to log warrant usage');
      // Don't throw - logging failure shouldn't block authorization
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Map database row to Warrant object
   */
  private mapRowToWarrant(row: any): Warrant {
    return {
      warrantId: row.warrant_id,
      tenantId: row.tenant_id,
      warrantNumber: row.warrant_number,
      warrantType: row.warrant_type,
      issuingAuthority: row.issuing_authority,
      jurisdiction: row.jurisdiction,
      caseNumber: row.case_number,
      legalBasis: row.legal_basis,
      scope: typeof row.scope === 'string' ? JSON.parse(row.scope) : row.scope,
      scopeDescription: row.scope_description,
      permittedActions: row.permitted_actions,
      targetSubjects: row.target_subjects,
      targetDataTypes: row.target_data_types,
      geographicScope: row.geographic_scope,
      issuedDate: new Date(row.issued_date),
      effectiveDate: new Date(row.effective_date),
      expiryDate: row.expiry_date ? new Date(row.expiry_date) : undefined,
      status: row.status,
      documentUrl: row.document_url,
      documentHash: row.document_hash,
    };
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    await this.db.end();
  }
}
