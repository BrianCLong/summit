// @ts-nocheck
/**
 * Policy Management Service
 *
 * Provides CRUD operations for governance policies with versioning,
 * approval workflows, and OPA integration. All responses wrapped
 * in DataEnvelope with GovernanceVerdict.
 *
 * SOC 2 Controls: CC6.1, CC6.2, CC7.2, PI1.1
 *
 * @module services/PolicyManagementService
 */

import { Pool } from 'pg';
import { z } from 'zod';
import { Policy, PolicyRule, PolicyAction, Stage } from '../governance/types.js';
import { createDataEnvelope, DataEnvelope, GovernanceResult } from '../types/data-envelope.js';
import logger from '../utils/logger.js';
import { enforceRampDecisionForTenant } from '../policy/ramp.js';

// ============================================================================
// Extended Policy Types for Management
// ============================================================================

export interface ManagedPolicy extends Policy {
  name: string;
  displayName: string;
  version: number;
  status: PolicyStatus;
  category: PolicyCategory;
  priority: number;
  effectiveFrom?: string;
  effectiveUntil?: string;
  tenantId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  publishedAt?: string;
  metadata?: Record<string, unknown>;
}

export type PolicyStatus = 'draft' | 'pending_approval' | 'approved' | 'active' | 'deprecated' | 'archived';
export type PolicyCategory = 'access' | 'data' | 'export' | 'retention' | 'compliance' | 'operational' | 'safety';

export interface PolicyVersion {
  id: string;
  policyId: string;
  version: number;
  content: Policy;
  changelog: string;
  createdBy: string;
  createdAt: string;
  status: PolicyStatus;
  approvedBy?: string;
  approvedAt?: string;
}

export interface PolicyListResult {
  policies: ManagedPolicy[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PolicyVersionListResult {
  versions: PolicyVersion[];
  total: number;
}

export interface PolicyOperationResult {
  success: boolean;
  message: string;
  policy?: ManagedPolicy;
  version?: PolicyVersion;
}

export interface PolicyApprovalRequest {
  id: string;
  policyId: string;
  policyName: string;
  version: number;
  requestedBy: string;
  requestedAt: string;
  reason: string;
  changelog: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

// ============================================================================
// Validation Schemas
// ============================================================================

const policyRuleSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(['eq', 'neq', 'lt', 'gt', 'in', 'not_in', 'contains']),
  value: z.unknown(),
});

const policyScopeSchema = z.object({
  stages: z.array(z.enum(['data', 'train', 'alignment', 'runtime'])).min(1),
  tenants: z.array(z.string()).min(1),
});

export const createPolicySchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  displayName: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.enum(['access', 'data', 'export', 'retention', 'compliance', 'operational', 'safety']),
  priority: z.number().int().min(0).max(1000).default(100),
  scope: policyScopeSchema,
  rules: z.array(policyRuleSchema).min(1),
  action: z.enum(['ALLOW', 'DENY', 'ESCALATE', 'WARN']),
  effectiveFrom: z.string().datetime().optional(),
  effectiveUntil: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updatePolicySchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  category: z.enum(['access', 'data', 'export', 'retention', 'compliance', 'operational', 'safety']).optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  scope: policyScopeSchema.optional(),
  rules: z.array(policyRuleSchema).min(1).optional(),
  action: z.enum(['ALLOW', 'DENY', 'ESCALATE', 'WARN']).optional(),
  effectiveFrom: z.string().datetime().optional(),
  effectiveUntil: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreatePolicyInput = z.infer<typeof createPolicySchema>;
export type UpdatePolicyInput = z.infer<typeof updatePolicySchema>;

// ============================================================================
// Service Implementation
// ============================================================================

export class PolicyManagementService {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool = pool || new Pool({ connectionString: process.env.DATABASE_URL });
  }

  // --------------------------------------------------------------------------
  // Policy CRUD Operations
  // --------------------------------------------------------------------------

  /**
   * List policies with pagination and filtering
   */
  async listPolicies(
    tenantId: string,
    params: {
      page?: number;
      pageSize?: number;
      status?: PolicyStatus;
      category?: PolicyCategory;
      search?: string;
    },
    actorId: string
  ): Promise<DataEnvelope<PolicyListResult>> {
    const page = params.page || 1;
    const pageSize = Math.min(params.pageSize || 25, 100);
    const offset = (page - 1) * pageSize;

    try {
      let whereClause = 'WHERE tenant_id = $1';
      const queryParams: unknown[] = [tenantId];
      let paramIndex = 2;

      if (params.status) {
        whereClause += ` AND status = $${paramIndex++}`;
        queryParams.push(params.status);
      }

      if (params.category) {
        whereClause += ` AND category = $${paramIndex++}`;
        queryParams.push(params.category);
      }

      if (params.search) {
        whereClause += ` AND (name ILIKE $${paramIndex} OR display_name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        queryParams.push(`%${params.search}%`);
        paramIndex++;
      }

      const countResult = await this.pool.query(
        `SELECT COUNT(*) FROM managed_policies ${whereClause}`,
        queryParams
      );
      const total = parseInt(countResult.rows[0].count, 10);

      queryParams.push(pageSize, offset);
      const result = await this.pool.query(
        `SELECT * FROM managed_policies ${whereClause}
         ORDER BY priority DESC, created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        queryParams
      );

      const policies = result.rows.map(this.mapPolicyRow);

      return createDataEnvelope(
        {
          policies,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
        {
          source: 'PolicyManagementService',
          actor: actorId,
        },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'policy-management',
          reason: 'Policy list access granted',
          evaluator: 'PolicyManagementService',
        }
      );
    } catch (error: any) {
      logger.error('Error listing policies:', error);
      throw error;
    }
  }

  /**
   * Get a specific policy by ID
   */
  async getPolicy(
    tenantId: string,
    policyId: string,
    actorId: string
  ): Promise<DataEnvelope<ManagedPolicy | null>> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM managed_policies WHERE id = $1 AND tenant_id = $2',
        [policyId, tenantId]
      );

      const policy = result.rows[0] ? this.mapPolicyRow(result.rows[0]) : null;

      return createDataEnvelope(
        policy,
        {
          source: 'PolicyManagementService',
          actor: actorId,
        },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'policy-management',
          reason: policy ? 'Policy retrieved' : 'Policy not found',
          evaluator: 'PolicyManagementService',
        }
      );
    } catch (error: any) {
      logger.error('Error getting policy:', error);
      throw error;
    }
  }

  /**
   * Create a new policy (as draft)
   */
  async createPolicy(
    tenantId: string,
    input: CreatePolicyInput,
    actorId: string
  ): Promise<DataEnvelope<PolicyOperationResult>> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const policyId = `pol-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      // Insert policy
      const result = await client.query(
        `INSERT INTO managed_policies (
          id, name, display_name, description, category, priority,
          scope, rules, action, status, version, tenant_id,
          effective_from, effective_until, metadata,
          created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *`,
        [
          policyId,
          input.name,
          input.displayName,
          input.description || null,
          input.category,
          input.priority,
          JSON.stringify(input.scope),
          JSON.stringify(input.rules),
          input.action,
          'draft',
          1,
          tenantId,
          input.effectiveFrom || null,
          input.effectiveUntil || null,
          input.metadata ? JSON.stringify(input.metadata) : null,
          actorId,
          now,
          now,
        ]
      );

      // Create initial version
      await client.query(
        `INSERT INTO policy_versions (
          id, policy_id, version, content, changelog, status, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          `pv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          policyId,
          1,
          JSON.stringify({
            id: policyId,
            description: input.description,
            scope: input.scope,
            rules: input.rules,
            action: input.action,
          }),
          'Initial policy creation',
          'draft',
          actorId,
          now,
        ]
      );

      await client.query('COMMIT');

      const policy = this.mapPolicyRow(result.rows[0]);

      logger.info('Policy created', { policyId, name: input.name, actor: actorId });

      return createDataEnvelope(
        {
          success: true,
          message: 'Policy created successfully',
          policy,
        },
        {
          source: 'PolicyManagementService',
          actor: actorId,
        },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'policy-management',
          reason: 'Policy creation allowed',
          evaluator: 'PolicyManagementService',
        }
      );
    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error('Error creating policy:', error);

      return createDataEnvelope(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to create policy',
        },
        {
          source: 'PolicyManagementService',
          actor: actorId,
        },
        {
          result: GovernanceResult.DENY,
          policyId: 'policy-management',
          reason: 'Policy creation failed',
          evaluator: 'PolicyManagementService',
        }
      );
    } finally {
      client.release();
    }
  }

  /**
   * Update a policy (creates new version)
   */
  async updatePolicy(
    tenantId: string,
    policyId: string,
    input: UpdatePolicyInput,
    changelog: string,
    actorId: string
  ): Promise<DataEnvelope<PolicyOperationResult>> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get current policy
      const current = await client.query(
        'SELECT * FROM managed_policies WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
        [policyId, tenantId]
      );

      if (current.rows.length === 0) {
        await client.query('ROLLBACK');
        return createDataEnvelope(
          { success: false, message: 'Policy not found' },
          { source: 'PolicyManagementService', actor: actorId },
          {
            result: GovernanceResult.DENY,
            policyId: 'policy-management',
            reason: 'Policy not found',
            evaluator: 'PolicyManagementService',
          }
        );
      }

      const currentPolicy = current.rows[0];
      const newVersion = currentPolicy.version + 1;
      const now = new Date().toISOString();

      // Update policy
      const updateFields: string[] = ['version = $1', 'updated_at = $2', 'status = $3'];
      const updateValues: unknown[] = [newVersion, now, 'draft'];
      let paramIndex = 4;

      if (input.displayName !== undefined) {
        updateFields.push(`display_name = $${paramIndex++}`);
        updateValues.push(input.displayName);
      }
      if (input.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(input.description);
      }
      if (input.category !== undefined) {
        updateFields.push(`category = $${paramIndex++}`);
        updateValues.push(input.category);
      }
      if (input.priority !== undefined) {
        updateFields.push(`priority = $${paramIndex++}`);
        updateValues.push(input.priority);
      }
      if (input.scope !== undefined) {
        updateFields.push(`scope = $${paramIndex++}`);
        updateValues.push(JSON.stringify(input.scope));
      }
      if (input.rules !== undefined) {
        updateFields.push(`rules = $${paramIndex++}`);
        updateValues.push(JSON.stringify(input.rules));
      }
      if (input.action !== undefined) {
        updateFields.push(`action = $${paramIndex++}`);
        updateValues.push(input.action);
      }
      if (input.effectiveFrom !== undefined) {
        updateFields.push(`effective_from = $${paramIndex++}`);
        updateValues.push(input.effectiveFrom);
      }
      if (input.effectiveUntil !== undefined) {
        updateFields.push(`effective_until = $${paramIndex++}`);
        updateValues.push(input.effectiveUntil);
      }
      if (input.metadata !== undefined) {
        updateFields.push(`metadata = $${paramIndex++}`);
        updateValues.push(JSON.stringify(input.metadata));
      }

      updateValues.push(policyId, tenantId);

      const result = await client.query(
        `UPDATE managed_policies SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
         RETURNING *`,
        updateValues
      );

      // Create new version record
      const updatedPolicy = result.rows[0];
      await client.query(
        `INSERT INTO policy_versions (
          id, policy_id, version, content, changelog, status, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          `pv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          policyId,
          newVersion,
          JSON.stringify({
            id: policyId,
            description: updatedPolicy.description,
            scope: JSON.parse(updatedPolicy.scope),
            rules: JSON.parse(updatedPolicy.rules),
            action: updatedPolicy.action,
          }),
          changelog || 'Policy updated',
          'draft',
          actorId,
          now,
        ]
      );

      await client.query('COMMIT');

      const policy = this.mapPolicyRow(result.rows[0]);

      logger.info('Policy updated', { policyId, version: newVersion, actor: actorId });

      return createDataEnvelope(
        {
          success: true,
          message: `Policy updated to version ${newVersion}`,
          policy,
        },
        {
          source: 'PolicyManagementService',
          actor: actorId,
        },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'policy-management',
          reason: 'Policy update allowed',
          evaluator: 'PolicyManagementService',
        }
      );
    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error('Error updating policy:', error);

      return createDataEnvelope(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to update policy',
        },
        {
          source: 'PolicyManagementService',
          actor: actorId,
        },
        {
          result: GovernanceResult.DENY,
          policyId: 'policy-management',
          reason: 'Policy update failed',
          evaluator: 'PolicyManagementService',
        }
      );
    } finally {
      client.release();
    }
  }

  /**
   * Delete a policy (archive it)
   */
  async deletePolicy(
    tenantId: string,
    policyId: string,
    actorId: string
  ): Promise<DataEnvelope<PolicyOperationResult>> {
    try {
      const result = await this.pool.query(
        `UPDATE managed_policies
         SET status = 'archived', updated_at = $1
         WHERE id = $2 AND tenant_id = $3 AND status != 'active'
         RETURNING *`,
        [new Date().toISOString(), policyId, tenantId]
      );

      if (result.rows.length === 0) {
        return createDataEnvelope(
          { success: false, message: 'Policy not found or cannot be archived while active' },
          { source: 'PolicyManagementService', actor: actorId },
          {
            result: GovernanceResult.DENY,
            policyId: 'policy-management',
            reason: 'Policy deletion failed',
            evaluator: 'PolicyManagementService',
          }
        );
      }

      logger.info('Policy archived', { policyId, actor: actorId });

      return createDataEnvelope(
        {
          success: true,
          message: 'Policy archived successfully',
        },
        {
          source: 'PolicyManagementService',
          actor: actorId,
        },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'policy-management',
          reason: 'Policy archived',
          evaluator: 'PolicyManagementService',
        }
      );
    } catch (error: any) {
      logger.error('Error deleting policy:', error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // Version Management
  // --------------------------------------------------------------------------

  /**
   * List versions of a policy
   */
  async listPolicyVersions(
    tenantId: string,
    policyId: string,
    actorId: string
  ): Promise<DataEnvelope<PolicyVersionListResult>> {
    try {
      // Verify policy belongs to tenant
      const policyCheck = await this.pool.query(
        'SELECT id FROM managed_policies WHERE id = $1 AND tenant_id = $2',
        [policyId, tenantId]
      );

      if (policyCheck.rows.length === 0) {
        return createDataEnvelope(
          { versions: [], total: 0 },
          { source: 'PolicyManagementService', actor: actorId },
          {
            result: GovernanceResult.DENY,
            policyId: 'policy-management',
            reason: 'Policy not found',
            evaluator: 'PolicyManagementService',
          }
        );
      }

      const result = await this.pool.query(
        'SELECT * FROM policy_versions WHERE policy_id = $1 ORDER BY version DESC',
        [policyId]
      );

      const versions: PolicyVersion[] = result.rows.map((row: any) => ({
        id: row.id,
        policyId: row.policy_id,
        version: row.version,
        content: JSON.parse(row.content),
        changelog: row.changelog,
        createdBy: row.created_by,
        createdAt: row.created_at,
        status: row.status,
        approvedBy: row.approved_by,
        approvedAt: row.approved_at,
      }));

      return createDataEnvelope(
        { versions, total: versions.length },
        { source: 'PolicyManagementService', actor: actorId },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'policy-management',
          reason: 'Versions retrieved',
          evaluator: 'PolicyManagementService',
        }
      );
    } catch (error: any) {
      logger.error('Error listing policy versions:', error);
      throw error;
    }
  }

  /**
   * Rollback to a previous version
   */
  async rollbackPolicy(
    tenantId: string,
    policyId: string,
    targetVersion: number,
    actorId: string
  ): Promise<DataEnvelope<PolicyOperationResult>> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get target version
      const versionResult = await client.query(
        `SELECT pv.* FROM policy_versions pv
         JOIN managed_policies mp ON pv.policy_id = mp.id
         WHERE pv.policy_id = $1 AND pv.version = $2 AND mp.tenant_id = $3`,
        [policyId, targetVersion, tenantId]
      );

      if (versionResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return createDataEnvelope(
          { success: false, message: 'Target version not found' },
          { source: 'PolicyManagementService', actor: actorId },
          {
            result: GovernanceResult.DENY,
            policyId: 'policy-management',
            reason: 'Version not found',
            evaluator: 'PolicyManagementService',
          }
        );
      }

      const targetVersionData = versionResult.rows[0];
      const content = JSON.parse(targetVersionData.content);

      // Get current version
      const currentResult = await client.query(
        'SELECT version FROM managed_policies WHERE id = $1 FOR UPDATE',
        [policyId]
      );
      const newVersion = currentResult.rows[0].version + 1;
      const now = new Date().toISOString();

      // Update policy with rollback content
      await client.query(
        `UPDATE managed_policies SET
          scope = $1, rules = $2, action = $3, description = $4,
          version = $5, status = 'draft', updated_at = $6
         WHERE id = $7`,
        [
          JSON.stringify(content.scope),
          JSON.stringify(content.rules),
          content.action,
          content.description,
          newVersion,
          now,
          policyId,
        ]
      );

      // Create rollback version record
      await client.query(
        `INSERT INTO policy_versions (
          id, policy_id, version, content, changelog, status, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          `pv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          policyId,
          newVersion,
          targetVersionData.content,
          `Rollback to version ${targetVersion}`,
          'draft',
          actorId,
          now,
        ]
      );

      await client.query('COMMIT');

      logger.info('Policy rolled back', { policyId, targetVersion, newVersion, actor: actorId });

      return createDataEnvelope(
        {
          success: true,
          message: `Policy rolled back to version ${targetVersion} as new version ${newVersion}`,
        },
        {
          source: 'PolicyManagementService',
          actor: actorId,
        },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'policy-management',
          reason: 'Policy rollback successful',
          evaluator: 'PolicyManagementService',
        }
      );
    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error('Error rolling back policy:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // --------------------------------------------------------------------------
  // Approval Workflow
  // --------------------------------------------------------------------------

  /**
   * Submit policy for approval
   */
  async submitForApproval(
    tenantId: string,
    policyId: string,
    reason: string,
    actorId: string
  ): Promise<DataEnvelope<PolicyOperationResult>> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE managed_policies
         SET status = 'pending_approval', updated_at = $1
         WHERE id = $2 AND tenant_id = $3 AND status = 'draft'
         RETURNING *`,
        [new Date().toISOString(), policyId, tenantId]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return createDataEnvelope(
          { success: false, message: 'Policy not found or not in draft status' },
          { source: 'PolicyManagementService', actor: actorId },
          {
            result: GovernanceResult.DENY,
            policyId: 'policy-management',
            reason: 'Cannot submit for approval',
            evaluator: 'PolicyManagementService',
          }
        );
      }

      // Create approval request
      await client.query(
        `INSERT INTO policy_approval_requests (
          id, policy_id, policy_name, version, requested_by, requested_at, reason, changelog, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          `par-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          policyId,
          result.rows[0].name,
          result.rows[0].version,
          actorId,
          new Date().toISOString(),
          reason,
          'Submitted for approval',
          'pending',
        ]
      );

      await client.query('COMMIT');

      const policy = this.mapPolicyRow(result.rows[0]);

      logger.info('Policy submitted for approval', { policyId, actor: actorId });

      return createDataEnvelope(
        {
          success: true,
          message: 'Policy submitted for approval',
          policy,
        },
        {
          source: 'PolicyManagementService',
          actor: actorId,
        },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'policy-management',
          reason: 'Approval request created',
          evaluator: 'PolicyManagementService',
        }
      );
    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error('Error submitting for approval:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Approve a policy
   */
  async approvePolicy(
    tenantId: string,
    policyId: string,
    notes: string,
    actorId: string
  ): Promise<DataEnvelope<PolicyOperationResult>> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const now = new Date().toISOString();

      enforceRampDecisionForTenant({
        tenantId,
        action: 'APPROVE',
        workflow: 'policy_management',
        key: policyId,
      });

      const result = await client.query(
        `UPDATE managed_policies
         SET status = 'approved', approved_by = $1, approved_at = $2, updated_at = $2
         WHERE id = $3 AND tenant_id = $4 AND status = 'pending_approval'
         RETURNING *`,
        [actorId, now, policyId, tenantId]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return createDataEnvelope(
          { success: false, message: 'Policy not found or not pending approval' },
          { source: 'PolicyManagementService', actor: actorId },
          {
            result: GovernanceResult.DENY,
            policyId: 'policy-management',
            reason: 'Cannot approve policy',
            evaluator: 'PolicyManagementService',
          }
        );
      }

      // Update approval request
      await client.query(
        `UPDATE policy_approval_requests
         SET status = 'approved', reviewed_by = $1, reviewed_at = $2, review_notes = $3
         WHERE policy_id = $4 AND status = 'pending'`,
        [actorId, now, notes, policyId]
      );

      // Update version status
      await client.query(
        `UPDATE policy_versions
         SET status = 'approved', approved_by = $1, approved_at = $2
         WHERE policy_id = $3 AND version = $4`,
        [actorId, now, policyId, result.rows[0].version]
      );

      await client.query('COMMIT');

      const policy = this.mapPolicyRow(result.rows[0]);

      logger.info('Policy approved', { policyId, actor: actorId });

      return createDataEnvelope(
        {
          success: true,
          message: 'Policy approved successfully',
          policy,
        },
        {
          source: 'PolicyManagementService',
          actor: actorId,
        },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'policy-management',
          reason: 'Policy approved',
          evaluator: 'PolicyManagementService',
        }
      );
    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error('Error approving policy:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Publish an approved policy (make it active)
   */
  async publishPolicy(
    tenantId: string,
    policyId: string,
    actorId: string
  ): Promise<DataEnvelope<PolicyOperationResult>> {
    try {
      const now = new Date().toISOString();

      const result = await this.pool.query(
        `UPDATE managed_policies
         SET status = 'active', published_at = $1, updated_at = $1
         WHERE id = $2 AND tenant_id = $3 AND status = 'approved'
         RETURNING *`,
        [now, policyId, tenantId]
      );

      if (result.rows.length === 0) {
        return createDataEnvelope(
          { success: false, message: 'Policy not found or not approved' },
          { source: 'PolicyManagementService', actor: actorId },
          {
            result: GovernanceResult.DENY,
            policyId: 'policy-management',
            reason: 'Cannot publish policy',
            evaluator: 'PolicyManagementService',
          }
        );
      }

      const policy = this.mapPolicyRow(result.rows[0]);

      logger.info('Policy published', { policyId, actor: actorId });

      return createDataEnvelope(
        {
          success: true,
          message: 'Policy published and now active',
          policy,
        },
        {
          source: 'PolicyManagementService',
          actor: actorId,
        },
        {
          result: GovernanceResult.ALLOW,
          policyId: 'policy-management',
          reason: 'Policy published',
          evaluator: 'PolicyManagementService',
        }
      );
    } catch (error: any) {
      logger.error('Error publishing policy:', error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // Helper Methods
  // --------------------------------------------------------------------------

  private mapPolicyRow(row: Record<string, unknown>): ManagedPolicy {
    return {
      id: row.id as string,
      name: row.name as string,
      displayName: row.display_name as string,
      description: row.description as string | undefined,
      category: row.category as PolicyCategory,
      priority: row.priority as number,
      scope: typeof row.scope === 'string' ? JSON.parse(row.scope) : row.scope,
      rules: typeof row.rules === 'string' ? JSON.parse(row.rules) : row.rules,
      action: row.action as PolicyAction,
      status: row.status as PolicyStatus,
      version: row.version as number,
      tenantId: row.tenant_id as string,
      effectiveFrom: row.effective_from as string | undefined,
      effectiveUntil: row.effective_until as string | undefined,
      createdBy: row.created_by as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      approvedBy: row.approved_by as string | undefined,
      approvedAt: row.approved_at as string | undefined,
      publishedAt: row.published_at as string | undefined,
      metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : undefined,
    };
  }
}

// Export singleton instance
export const policyManagementService = new PolicyManagementService();
export default PolicyManagementService;
