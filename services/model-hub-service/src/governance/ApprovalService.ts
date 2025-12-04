/**
 * Approval Service
 *
 * Manages model approval workflows:
 * - Request and review approvals for production deployment
 * - Track approval status and history
 * - Enforce approval requirements before promotion
 */

import { PoolClient } from 'pg';
import { db } from '../db/connection.js';
import { generateId } from '../utils/id.js';
import { logger, createChildLogger } from '../utils/logger.js';
import { NotFoundError, ValidationError, ApprovalRequiredError, ConflictError } from '../utils/errors.js';
import {
  ModelApproval,
  ModelApprovalSchema,
  ApprovalStatus,
  DeploymentEnvironment,
} from '../types/index.js';
import { modelRegistry } from '../registry/ModelRegistry.js';
import { evaluationService } from '../evaluation/EvaluationService.js';
import { auditService } from './AuditService.js';

// ============================================================================
// Database Row Type
// ============================================================================

interface ModelApprovalRow {
  id: string;
  model_version_id: string;
  environment: string;
  status: string;
  requested_by: string;
  requested_at: Date;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  approval_notes: string | null;
  rejection_reason: string | null;
  evaluation_requirements: string[];
  evaluation_results: Record<string, unknown>;
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Row Transformation
// ============================================================================

function rowToModelApproval(row: ModelApprovalRow): ModelApproval {
  return {
    id: row.id,
    modelVersionId: row.model_version_id,
    environment: row.environment as DeploymentEnvironment,
    status: row.status as ApprovalStatus,
    requestedBy: row.requested_by,
    requestedAt: row.requested_at,
    reviewedBy: row.reviewed_by || undefined,
    reviewedAt: row.reviewed_at || undefined,
    approvalNotes: row.approval_notes || undefined,
    rejectionReason: row.rejection_reason || undefined,
    evaluationRequirements: row.evaluation_requirements,
    evaluationResults: row.evaluation_results as ModelApproval['evaluationResults'],
    expiresAt: row.expires_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// Approval Service Class
// ============================================================================

export interface RequestApprovalInput {
  modelVersionId: string;
  environment: DeploymentEnvironment;
  requestedBy: string;
  evaluationRequirements?: string[];
}

export interface ReviewApprovalInput {
  approvalId: string;
  reviewedBy: string;
  status: 'approved' | 'rejected';
  notes?: string;
  rejectionReason?: string;
  expiresInDays?: number;
}

export interface ListApprovalsOptions {
  modelVersionId?: string;
  environment?: DeploymentEnvironment;
  status?: ApprovalStatus;
  requestedBy?: string;
  reviewedBy?: string;
  limit?: number;
  offset?: number;
}

export class ApprovalService {
  private readonly log = createChildLogger({ component: 'ApprovalService' });

  /**
   * Request approval for a model version
   */
  async requestApproval(input: RequestApprovalInput, client?: PoolClient): Promise<ModelApproval> {
    const id = generateId();
    const now = new Date();

    // Verify model version exists
    const modelVersion = await modelRegistry.getModelVersion(input.modelVersionId, client);

    // Check if approval already exists
    const existing = await this.getApprovalForEnvironment(
      input.modelVersionId,
      input.environment,
      client,
    );

    if (existing && existing.status === 'pending') {
      throw new ConflictError(
        `Pending approval already exists for model version '${input.modelVersionId}' in '${input.environment}'`,
      );
    }

    // Check evaluation readiness
    const readiness = await evaluationService.checkPromotionReadiness(input.modelVersionId);

    const evaluationRequirements = input.evaluationRequirements || ['basic-safety', 'accuracy-validation'];
    const evaluationResults: ModelApproval['evaluationResults'] = {};

    // Populate evaluation results
    for (const suiteId of evaluationRequirements) {
      const { runs } = await evaluationService.listEvaluationRuns({
        modelVersionId: input.modelVersionId,
        evaluationSuiteId: suiteId,
        status: 'completed',
        limit: 1,
      });

      if (runs.length > 0) {
        const run = runs[0];
        evaluationResults[suiteId] = {
          passed: run.results.passed || false,
          score: run.results.metrics?.overallScore,
          details: run.results.summary,
        };
      }
    }

    const query = `
      INSERT INTO model_hub_model_approvals (
        id, model_version_id, environment, status, requested_by, requested_at,
        evaluation_requirements, evaluation_results, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const params = [
      id,
      input.modelVersionId,
      input.environment,
      'pending',
      input.requestedBy,
      now,
      evaluationRequirements,
      evaluationResults,
      now,
      now,
    ];

    const result = await db.query<ModelApprovalRow>(query, params, client);
    const approval = rowToModelApproval(result.rows[0]);

    // Record audit event
    await auditService.recordApprovalEvent('approval.requested', approval.id, input.requestedBy, {
      after: {
        modelVersionId: approval.modelVersionId,
        environment: approval.environment,
        evaluationResults,
      },
    });

    this.log.info({
      message: 'Approval requested',
      approvalId: approval.id,
      modelVersionId: approval.modelVersionId,
      environment: approval.environment,
      requestedBy: approval.requestedBy,
    });

    return approval;
  }

  /**
   * Review an approval request
   */
  async reviewApproval(input: ReviewApprovalInput, client?: PoolClient): Promise<ModelApproval> {
    const approval = await this.getApproval(input.approvalId, client);

    if (approval.status !== 'pending') {
      throw new ValidationError(`Cannot review approval with status '${approval.status}'`);
    }

    // If approving, verify all evaluations passed
    if (input.status === 'approved') {
      const failedEvaluations = Object.entries(approval.evaluationResults)
        .filter(([_, result]) => !result.passed)
        .map(([suiteId]) => suiteId);

      if (failedEvaluations.length > 0) {
        throw new ValidationError(
          `Cannot approve: evaluations failed for ${failedEvaluations.join(', ')}`,
        );
      }
    }

    const now = new Date();
    const expiresAt = input.expiresInDays
      ? new Date(now.getTime() + input.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const query = `
      UPDATE model_hub_model_approvals
      SET status = $1, reviewed_by = $2, reviewed_at = $3,
          approval_notes = $4, rejection_reason = $5, expires_at = $6, updated_at = $7
      WHERE id = $8
      RETURNING *
    `;

    const params = [
      input.status,
      input.reviewedBy,
      now,
      input.notes || null,
      input.rejectionReason || null,
      expiresAt,
      now,
      input.approvalId,
    ];

    const result = await db.query<ModelApprovalRow>(query, params, client);
    const updatedApproval = rowToModelApproval(result.rows[0]);

    // Record audit event
    const eventType = input.status === 'approved' ? 'approval.approved' : 'approval.rejected';
    await auditService.recordApprovalEvent(eventType, updatedApproval.id, input.reviewedBy, {
      before: { status: 'pending' },
      after: { status: input.status, notes: input.notes, rejectionReason: input.rejectionReason },
    });

    // If approved, update model version status
    if (input.status === 'approved') {
      await modelRegistry.updateModelVersion(updatedApproval.modelVersionId, {
        status: 'approved',
      });
    }

    this.log.info({
      message: `Approval ${input.status}`,
      approvalId: updatedApproval.id,
      modelVersionId: updatedApproval.modelVersionId,
      environment: updatedApproval.environment,
      reviewedBy: updatedApproval.reviewedBy,
    });

    return updatedApproval;
  }

  /**
   * Revoke an existing approval
   */
  async revokeApproval(approvalId: string, revokedBy: string, reason?: string): Promise<ModelApproval> {
    const approval = await this.getApproval(approvalId);

    if (approval.status !== 'approved') {
      throw new ValidationError(`Cannot revoke approval with status '${approval.status}'`);
    }

    const query = `
      UPDATE model_hub_model_approvals
      SET status = 'revoked', rejection_reason = $1, updated_at = $2
      WHERE id = $3
      RETURNING *
    `;

    const result = await db.query<ModelApprovalRow>(query, [reason || null, new Date(), approvalId]);
    const updatedApproval = rowToModelApproval(result.rows[0]);

    // Record audit event
    await auditService.recordApprovalEvent('approval.revoked', updatedApproval.id, revokedBy, {
      before: { status: 'approved' },
      after: { status: 'revoked', reason },
    });

    this.log.info({
      message: 'Approval revoked',
      approvalId: updatedApproval.id,
      modelVersionId: updatedApproval.modelVersionId,
      revokedBy,
      reason,
    });

    return updatedApproval;
  }

  /**
   * Get an approval by ID
   */
  async getApproval(id: string, client?: PoolClient): Promise<ModelApproval> {
    const query = 'SELECT * FROM model_hub_model_approvals WHERE id = $1';
    const result = await db.query<ModelApprovalRow>(query, [id], client);

    if (result.rows.length === 0) {
      throw new NotFoundError('ModelApproval', id);
    }

    return rowToModelApproval(result.rows[0]);
  }

  /**
   * Get approval for a specific environment
   */
  async getApprovalForEnvironment(
    modelVersionId: string,
    environment: DeploymentEnvironment,
    client?: PoolClient,
  ): Promise<ModelApproval | null> {
    const query = `
      SELECT * FROM model_hub_model_approvals
      WHERE model_version_id = $1 AND environment = $2
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const result = await db.query<ModelApprovalRow>(query, [modelVersionId, environment], client);

    if (result.rows.length === 0) {
      return null;
    }

    return rowToModelApproval(result.rows[0]);
  }

  /**
   * Check if model version is approved for environment
   */
  async isApproved(
    modelVersionId: string,
    environment: DeploymentEnvironment,
  ): Promise<boolean> {
    const approval = await this.getApprovalForEnvironment(modelVersionId, environment);

    if (!approval || approval.status !== 'approved') {
      return false;
    }

    // Check if approval has expired
    if (approval.expiresAt && approval.expiresAt < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Require approval for deployment
   */
  async requireApproval(
    modelVersionId: string,
    environment: DeploymentEnvironment,
  ): Promise<void> {
    const isApproved = await this.isApproved(modelVersionId, environment);

    if (!isApproved) {
      throw new ApprovalRequiredError(modelVersionId, environment);
    }
  }

  /**
   * List approvals
   */
  async listApprovals(options: ListApprovalsOptions = {}): Promise<{
    approvals: ModelApproval[];
    total: number;
  }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (options.modelVersionId) {
      conditions.push(`model_version_id = $${paramIndex++}`);
      params.push(options.modelVersionId);
    }

    if (options.environment) {
      conditions.push(`environment = $${paramIndex++}`);
      params.push(options.environment);
    }

    if (options.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(options.status);
    }

    if (options.requestedBy) {
      conditions.push(`requested_by = $${paramIndex++}`);
      params.push(options.requestedBy);
    }

    if (options.reviewedBy) {
      conditions.push(`reviewed_by = $${paramIndex++}`);
      params.push(options.reviewedBy);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM model_hub_model_approvals ${whereClause}`;
    const countResult = await db.query<{ total: string }>(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const query = `
      SELECT * FROM model_hub_model_approvals
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    const result = await db.query<ModelApprovalRow>(query, [...params, limit, offset]);
    const approvals = result.rows.map(rowToModelApproval);

    return { approvals, total };
  }
}

// Export singleton instance
export const approvalService = new ApprovalService();
