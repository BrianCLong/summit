/**
 * Case Service - Business logic layer for Case Spaces
 * Handles case operations with integrated audit logging
 */

import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { CaseRepo, Case, CaseInput, CaseUpdateInput } from '../repos/CaseRepo.js';
import {
  AuditAccessLogRepo,
  AuditAccessLogInput,
} from '../repos/AuditAccessLogRepo.js';
import { ReleaseCriteriaService } from './ReleaseCriteriaService.js';
import { CaseSLAService } from './sla/CaseSLAService.js';
import { isEnabled } from '../lib/featureFlags.js';
import logger from '../config/logger.js';
import { UserFacingError } from '../lib/errors.js';

const serviceLogger = logger.child({ name: 'CaseService' });

export class CaseService {
  private caseRepo: CaseRepo;
  private auditRepo: AuditAccessLogRepo;
  private releaseCriteriaService: ReleaseCriteriaService;
  private slaService: CaseSLAService;
  private pg: Pool;

  constructor(pg: Pool) {
    this.pg = pg;
    this.caseRepo = new CaseRepo(pg);
    this.auditRepo = new AuditAccessLogRepo(pg);
    this.releaseCriteriaService = new ReleaseCriteriaService(pg);
    this.slaService = new CaseSLAService(pg);
  }

  /**
   * Create a new case
   */
  async createCase(
    input: CaseInput,
    userId: string,
    auditContext?: Partial<AuditAccessLogInput>,
  ): Promise<Case> {
    const caseRecord = await this.caseRepo.create(input, userId);

    // Auto-create initial SLA if configured
    try {
      await this.slaService.createTimer({
        caseId: caseRecord.id,
        tenantId: input.tenantId,
        type: 'RESOLUTION_TIME',
        name: 'Standard Resolution SLA',
        targetDurationSeconds: 7 * 24 * 60 * 60, // 7 days default
        metadata: { created_by: userId }
      });
    } catch (e) {
      serviceLogger.error({ err: e, caseId: caseRecord.id }, 'Failed to create initial SLA timer');
    }

    // Log the creation in audit trail
    await this.auditRepo.logAccess({
      tenantId: input.tenantId,
      caseId: caseRecord.id,
      userId,
      action: 'create',
      resourceType: 'case',
      resourceId: caseRecord.id,
      reason: auditContext?.reason || 'Case created',
      legalBasis: auditContext?.legalBasis || 'investigation',
      ...auditContext,
    });

    return caseRecord;
  }

  /**
   * Get a case by ID with audit logging
   */
  async getCase(
    id: string,
    tenantId: string,
    userId: string,
    auditContext: Pick<AuditAccessLogInput, 'reason' | 'legalBasis'> &
      Partial<AuditAccessLogInput>,
  ): Promise<Case | null> {
    const caseRecord = await this.caseRepo.findById(id, tenantId);

    if (caseRecord) {
      // Log the view access
      await this.auditRepo.logAccess({
        tenantId,
        caseId: id,
        userId,
        action: 'view',
        resourceType: 'case',
        resourceId: id,
        ...auditContext,
      });
    }

    return caseRecord;
  }

  /**
   * Update a case with audit logging
   */
  async updateCase(
    input: CaseUpdateInput,
    userId: string,
    tenantId: string,
    auditContext: Pick<AuditAccessLogInput, 'reason' | 'legalBasis'> &
      Partial<AuditAccessLogInput>,
  ): Promise<Case | null> {
    const updatedCase = await this.caseRepo.update(input, userId);

    if (updatedCase) {
      // Log the modification
      await this.auditRepo.logAccess({
        tenantId,
        caseId: input.id,
        userId,
        action: 'modify',
        resourceType: 'case',
        resourceId: input.id,
        ...auditContext,
      });
    }

    return updatedCase;
  }

  /**
   * List cases (no audit logging for list operations by default)
   */
  async listCases(params: {
    tenantId: string;
    status?: 'open' | 'active' | 'closed' | 'archived';
    compartment?: string;
    policyLabels?: string[];
    limit?: number;
    offset?: number;
  }): Promise<Case[]> {
    return this.caseRepo.list(params);
  }

  /**
   * Archive a case with audit logging
   */
  async archiveCase(
    id: string,
    userId: string,
    tenantId: string,
    auditContext: Pick<AuditAccessLogInput, 'reason' | 'legalBasis'> &
      Partial<AuditAccessLogInput>,
  ): Promise<Case | null> {
    const archivedCase = await this.caseRepo.archive(id, userId);

    if (archivedCase) {
      // Log the archival
      await this.auditRepo.logAccess({
        tenantId,
        caseId: id,
        userId,
        action: 'archive',
        resourceType: 'case',
        resourceId: id,
        ...auditContext,
      });
    }

    return archivedCase;
  }

  /**
   * Export case data with audit logging
   */
  async exportCase(
    id: string,
    tenantId: string,
    userId: string,
    auditContext: Pick<AuditAccessLogInput, 'reason' | 'legalBasis'> &
      Partial<AuditAccessLogInput>,
  ): Promise<Case | null> {
    // Check release criteria if enabled
    if (isEnabled('release-criteria', { tenantId, userId })) {
      const evaluation = await this.releaseCriteriaService.evaluate(id, tenantId);

      if (!evaluation.passed) {
        // If configured for hard block, prevent export
        if (evaluation.config.hardBlock) {
          serviceLogger.warn({ caseId: id, reasons: evaluation.reasons }, 'Export blocked by release criteria');
          throw new UserFacingError(
            `Export blocked by release criteria: ${evaluation.reasons.map(r => r.message).join('; ')}`,
            403,
            randomUUID()
          );
        } else {
          serviceLogger.info({ caseId: id, reasons: evaluation.reasons }, 'Export allowed despite unmet criteria (soft block)');
        }
      }
    }

    const caseRecord = await this.caseRepo.findById(id, tenantId);

    if (caseRecord) {
      // Log the export - this is a critical audit event
      await this.auditRepo.logAccess({
        tenantId,
        caseId: id,
        userId,
        action: 'export',
        resourceType: 'case',
        resourceId: id,
        ...auditContext,
      });
    }

    return caseRecord;
  }

  /**
   * Get case repository (for advanced operations)
   */
  getCaseRepo(): CaseRepo {
    return this.caseRepo;
  }

  /**
   * Get audit repository (for advanced operations)
   */
  getAuditRepo(): AuditAccessLogRepo {
    return this.auditRepo;
  }
}
