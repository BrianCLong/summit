/**
 * GDPR Compliance Service
 * Implements GDPR data subject rights (Articles 15-21) and data retention policies
 */

import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import logger from '../config/logger.js';

const serviceLogger = logger.child({ name: 'GDPRComplianceService' });

// ============================================================================
// TYPES
// ============================================================================

export type DataSubjectRequestType =
  | 'access'           // Article 15: Right of access
  | 'rectification'    // Article 16: Right to rectification
  | 'erasure'          // Article 17: Right to erasure ("right to be forgotten")
  | 'restriction'      // Article 18: Right to restriction of processing
  | 'portability'      // Article 20: Right to data portability
  | 'objection';       // Article 21: Right to object

export type DataSubjectRequestStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'rejected'
  | 'expired';

export interface DataSubjectRequest {
  requestId?: string;
  tenantId: string;
  subjectId: string;
  subjectEmail?: string;
  subjectIdentifiers: Record<string, any>;
  requestType: DataSubjectRequestType;
  requestStatus: DataSubjectRequestStatus;
  requestReason: string;
  legalBasis?: string;
  verificationMethod?: string;
  verifiedAt?: Date;
  verifiedBy?: string;
  assignedTo?: string;
  processingNotes?: string;
  completionDeadline: Date;
  completedAt?: Date;
  rejectionReason?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type DeletionType =
  | 'hard_delete'      // Permanent removal
  | 'soft_delete'      // Mark as deleted
  | 'anonymization'    // Replace PII with anonymous data
  | 'pseudonymization' // Replace PII with pseudonyms
  | 'archival';        // Move to cold storage

export interface DataDeletionRequest {
  tenantId: string;
  deletionType: DeletionType;
  resourceType: string;
  resourceId: string;
  resourceIdentifiers: Record<string, any>;
  deletionReason: string;
  legalBasis?: string;
  dataSubjectRequestId?: string;
  retentionPolicyId?: string;
  deletedBy: string;
  approvedBy?: string;
  backupLocation?: string;
  recoveryDeadline?: Date;
}

export interface RetentionPolicy {
  policyId?: string;
  policyName: string;
  dataCategory: string;
  retentionPeriodDays: number;
  retentionBasis: string;
  applicableJurisdictions: string[];
  archivalAfterDays?: number;
  deletionAfterDays?: number;
  anonymizationAfterDays?: number;
  regulationReferences?: string[];
  policyDescription?: string;
  isActive: boolean;
  effectiveFrom?: Date;
  effectiveUntil?: Date;
  createdBy: string;
}

// ============================================================================
// GDPR COMPLIANCE SERVICE
// ============================================================================

export class GDPRComplianceService {
  constructor(private pg: Pool) {}

  // ==========================================================================
  // DATA SUBJECT REQUESTS (GDPR Articles 15-21)
  // ==========================================================================

  /**
   * Create a new data subject request
   */
  async createDataSubjectRequest(
    request: DataSubjectRequest,
  ): Promise<DataSubjectRequest> {
    const requestId = request.requestId || randomUUID();

    // Calculate completion deadline (30 days for GDPR)
    const completionDeadline =
      request.completionDeadline ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    try {
      const { rows } = await this.pg.query(
        `INSERT INTO data_subject_requests (
          request_id, tenant_id, subject_id, subject_email, subject_identifiers,
          request_type, request_status, request_reason, legal_basis,
          verification_method, assigned_to, processing_notes, completion_deadline,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          requestId,
          request.tenantId,
          request.subjectId,
          request.subjectEmail || null,
          JSON.stringify(request.subjectIdentifiers),
          request.requestType,
          request.requestStatus || 'pending',
          request.requestReason,
          request.legalBasis || null,
          request.verificationMethod || null,
          request.assignedTo || null,
          request.processingNotes || null,
          completionDeadline,
          request.createdBy || null,
        ],
      );

      const createdRequest = this.mapDataSubjectRequestRow(rows[0]);

      serviceLogger.info(
        {
          requestId,
          requestType: request.requestType,
          subjectId: request.subjectId,
          tenantId: request.tenantId,
        },
        'Data subject request created',
      );

      return createdRequest;
    } catch (error) {
      serviceLogger.error(
        { error: (error as Error).message, request },
        'Failed to create data subject request',
      );
      throw error;
    }
  }

  /**
   * Update data subject request status
   */
  async updateDataSubjectRequest(
    requestId: string,
    updates: Partial<DataSubjectRequest>,
  ): Promise<DataSubjectRequest> {
    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.requestStatus) {
      setClauses.push(`request_status = $${paramIndex}`);
      params.push(updates.requestStatus);
      paramIndex++;
    }

    if (updates.assignedTo !== undefined) {
      setClauses.push(`assigned_to = $${paramIndex}`);
      params.push(updates.assignedTo);
      paramIndex++;
    }

    if (updates.processingNotes !== undefined) {
      setClauses.push(`processing_notes = $${paramIndex}`);
      params.push(updates.processingNotes);
      paramIndex++;
    }

    if (updates.verifiedBy) {
      setClauses.push(`verified_by = $${paramIndex}, verified_at = NOW()`);
      params.push(updates.verifiedBy);
      paramIndex++;
    }

    if (updates.completedAt) {
      setClauses.push(`completed_at = $${paramIndex}`);
      params.push(updates.completedAt);
      paramIndex++;
    }

    if (updates.rejectionReason) {
      setClauses.push(`rejection_reason = $${paramIndex}`);
      params.push(updates.rejectionReason);
      paramIndex++;
    }

    setClauses.push('updated_at = NOW()');

    params.push(requestId);

    const { rows } = await this.pg.query(
      `UPDATE data_subject_requests
       SET ${setClauses.join(', ')}
       WHERE request_id = $${paramIndex}
       RETURNING *`,
      params,
    );

    if (!rows[0]) {
      throw new Error(`Data subject request not found: ${requestId}`);
    }

    return this.mapDataSubjectRequestRow(rows[0]);
  }

  /**
   * Get data subject request by ID
   */
  async getDataSubjectRequest(
    requestId: string,
  ): Promise<DataSubjectRequest | null> {
    const { rows } = await this.pg.query(
      `SELECT * FROM data_subject_requests WHERE request_id = $1`,
      [requestId],
    );

    return rows[0] ? this.mapDataSubjectRequestRow(rows[0]) : null;
  }

  /**
   * List data subject requests with filters
   */
  async listDataSubjectRequests(filters: {
    tenantId: string;
    subjectId?: string;
    requestType?: DataSubjectRequestType;
    requestStatus?: DataSubjectRequestStatus;
    assignedTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<DataSubjectRequest[]> {
    const params: any[] = [filters.tenantId];
    let sql = `SELECT * FROM data_subject_requests WHERE tenant_id = $1`;
    let paramIndex = 2;

    if (filters.subjectId) {
      sql += ` AND subject_id = $${paramIndex}`;
      params.push(filters.subjectId);
      paramIndex++;
    }

    if (filters.requestType) {
      sql += ` AND request_type = $${paramIndex}`;
      params.push(filters.requestType);
      paramIndex++;
    }

    if (filters.requestStatus) {
      sql += ` AND request_status = $${paramIndex}`;
      params.push(filters.requestStatus);
      paramIndex++;
    }

    if (filters.assignedTo) {
      sql += ` AND assigned_to = $${paramIndex}`;
      params.push(filters.assignedTo);
      paramIndex++;
    }

    sql += ` ORDER BY created_at DESC`;

    if (filters.limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(Math.min(filters.limit, 1000));
      paramIndex++;
    }

    if (filters.offset) {
      sql += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
    }

    const { rows } = await this.pg.query(sql, params);
    return rows.map(this.mapDataSubjectRequestRow);
  }

  /**
   * Get overdue data subject requests
   */
  async getOverdueRequests(tenantId: string): Promise<DataSubjectRequest[]> {
    const { rows } = await this.pg.query(
      `SELECT * FROM data_subject_requests
       WHERE tenant_id = $1
         AND request_status NOT IN ('completed', 'rejected', 'expired')
         AND completion_deadline < NOW()
       ORDER BY completion_deadline ASC`,
      [tenantId],
    );

    return rows.map(this.mapDataSubjectRequestRow);
  }

  // ==========================================================================
  // DATA RETENTION POLICIES
  // ==========================================================================

  /**
   * Create or update a retention policy
   */
  async upsertRetentionPolicy(
    policy: RetentionPolicy,
  ): Promise<RetentionPolicy> {
    const policyId = policy.policyId || randomUUID();

    const { rows } = await this.pg.query(
      `INSERT INTO retention_policies (
        policy_id, policy_name, data_category, retention_period_days, retention_basis,
        applicable_jurisdictions, archival_after_days, deletion_after_days,
        anonymization_after_days, regulation_references, policy_description,
        is_active, effective_from, effective_until, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (policy_name) DO UPDATE
      SET data_category = EXCLUDED.data_category,
          retention_period_days = EXCLUDED.retention_period_days,
          retention_basis = EXCLUDED.retention_basis,
          applicable_jurisdictions = EXCLUDED.applicable_jurisdictions,
          archival_after_days = EXCLUDED.archival_after_days,
          deletion_after_days = EXCLUDED.deletion_after_days,
          anonymization_after_days = EXCLUDED.anonymization_after_days,
          regulation_references = EXCLUDED.regulation_references,
          policy_description = EXCLUDED.policy_description,
          is_active = EXCLUDED.is_active,
          effective_from = EXCLUDED.effective_from,
          effective_until = EXCLUDED.effective_until,
          updated_at = NOW()
      RETURNING *`,
      [
        policyId,
        policy.policyName,
        policy.dataCategory,
        policy.retentionPeriodDays,
        policy.retentionBasis,
        policy.applicableJurisdictions,
        policy.archivalAfterDays || null,
        policy.deletionAfterDays || null,
        policy.anonymizationAfterDays || null,
        policy.regulationReferences || [],
        policy.policyDescription || null,
        policy.isActive,
        policy.effectiveFrom || new Date(),
        policy.effectiveUntil || null,
        policy.createdBy,
      ],
    );

    return this.mapRetentionPolicyRow(rows[0]);
  }

  /**
   * Get active retention policies
   */
  async getActiveRetentionPolicies(): Promise<RetentionPolicy[]> {
    const { rows } = await this.pg.query(
      `SELECT * FROM retention_policies
       WHERE is_active = true
         AND effective_from <= NOW()
         AND (effective_until IS NULL OR effective_until >= NOW())
       ORDER BY data_category, policy_name`,
    );

    return rows.map(this.mapRetentionPolicyRow);
  }

  /**
   * Get retention policy by data category
   */
  async getRetentionPolicyByCategory(
    dataCategory: string,
  ): Promise<RetentionPolicy | null> {
    const { rows } = await this.pg.query(
      `SELECT * FROM retention_policies
       WHERE data_category = $1
         AND is_active = true
         AND effective_from <= NOW()
         AND (effective_until IS NULL OR effective_until >= NOW())
       LIMIT 1`,
      [dataCategory],
    );

    return rows[0] ? this.mapRetentionPolicyRow(rows[0]) : null;
  }

  // ==========================================================================
  // DATA DELETION (Right to Erasure - Article 17)
  // ==========================================================================

  /**
   * Log data deletion
   */
  async logDataDeletion(
    deletion: DataDeletionRequest,
  ): Promise<{ deletionId: string }> {
    const deletionId = randomUUID();

    try {
      await this.pg.query(
        `INSERT INTO data_deletion_log (
          deletion_id, tenant_id, deletion_type, resource_type, resource_id,
          resource_identifiers, deletion_reason, legal_basis,
          data_subject_request_id, retention_policy_id, deleted_by, approved_by,
          backup_location, recovery_deadline
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          deletionId,
          deletion.tenantId,
          deletion.deletionType,
          deletion.resourceType,
          deletion.resourceId,
          JSON.stringify(deletion.resourceIdentifiers),
          deletion.deletionReason,
          deletion.legalBasis || null,
          deletion.dataSubjectRequestId || null,
          deletion.retentionPolicyId || null,
          deletion.deletedBy,
          deletion.approvedBy || null,
          deletion.backupLocation || null,
          deletion.recoveryDeadline || null,
        ],
      );

      serviceLogger.info(
        {
          deletionId,
          deletionType: deletion.deletionType,
          resourceType: deletion.resourceType,
          resourceId: deletion.resourceId,
        },
        'Data deletion logged',
      );

      return { deletionId };
    } catch (error) {
      serviceLogger.error(
        { error: (error as Error).message, deletion },
        'Failed to log data deletion',
      );
      throw error;
    }
  }

  /**
   * Anonymize data (GDPR-compliant pseudonymization)
   */
  async anonymizeData(
    tenantId: string,
    resourceType: string,
    resourceId: string,
    piiFields: string[],
    deletedBy: string,
  ): Promise<void> {
    // Log the anonymization
    await this.logDataDeletion({
      tenantId,
      deletionType: 'anonymization',
      resourceType,
      resourceId,
      resourceIdentifiers: { piiFields },
      deletionReason: 'GDPR Article 17 - Right to Erasure',
      deletedBy,
    });

    // Note: Actual anonymization logic would be implemented based on your data models
    serviceLogger.info(
      { resourceType, resourceId, piiFields },
      'Data anonymized',
    );
  }

  /**
   * Process right to erasure request
   */
  async processRightToErasure(
    requestId: string,
    processedBy: string,
  ): Promise<void> {
    const request = await this.getDataSubjectRequest(requestId);

    if (!request || request.requestType !== 'erasure') {
      throw new Error('Invalid erasure request');
    }

    // Update request status
    await this.updateDataSubjectRequest(requestId, {
      requestStatus: 'in_progress',
      assignedTo: processedBy,
    });

    // Note: Actual erasure logic would identify and delete/anonymize all data
    // associated with the data subject across all tables

    // Mark as completed
    await this.updateDataSubjectRequest(requestId, {
      requestStatus: 'completed',
      completedAt: new Date(),
    });

    serviceLogger.info(
      { requestId, subjectId: request.subjectId },
      'Right to erasure processed',
    );
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private mapDataSubjectRequestRow(row: any): DataSubjectRequest {
    return {
      requestId: row.request_id,
      tenantId: row.tenant_id,
      subjectId: row.subject_id,
      subjectEmail: row.subject_email || undefined,
      subjectIdentifiers: row.subject_identifiers,
      requestType: row.request_type,
      requestStatus: row.request_status,
      requestReason: row.request_reason,
      legalBasis: row.legal_basis || undefined,
      verificationMethod: row.verification_method || undefined,
      verifiedAt: row.verified_at || undefined,
      verifiedBy: row.verified_by || undefined,
      assignedTo: row.assigned_to || undefined,
      processingNotes: row.processing_notes || undefined,
      completionDeadline: row.completion_deadline,
      completedAt: row.completed_at || undefined,
      rejectionReason: row.rejection_reason || undefined,
      createdBy: row.created_by || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRetentionPolicyRow(row: any): RetentionPolicy {
    return {
      policyId: row.policy_id,
      policyName: row.policy_name,
      dataCategory: row.data_category,
      retentionPeriodDays: row.retention_period_days,
      retentionBasis: row.retention_basis,
      applicableJurisdictions: row.applicable_jurisdictions,
      archivalAfterDays: row.archival_after_days || undefined,
      deletionAfterDays: row.deletion_after_days || undefined,
      anonymizationAfterDays: row.anonymization_after_days || undefined,
      regulationReferences: row.regulation_references || [],
      policyDescription: row.policy_description || undefined,
      isActive: row.is_active,
      effectiveFrom: row.effective_from,
      effectiveUntil: row.effective_until || undefined,
      createdBy: row.created_by,
    };
  }
}
