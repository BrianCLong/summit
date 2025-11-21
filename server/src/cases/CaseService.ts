/**
 * Case Service - Business logic layer for Case Spaces
 * Handles case operations with integrated audit logging
 */

import { Pool } from 'pg';
import { CaseRepo, Case, CaseInput, CaseUpdateInput } from '../repos/CaseRepo.js';
import {
  AuditAccessLogRepo,
  AuditAccessLogInput,
} from '../repos/AuditAccessLogRepo.js';
import logger from '../config/logger.js';

const serviceLogger = logger.child({ name: 'CaseService' });

export class CaseService {
  private caseRepo: CaseRepo;
  private auditRepo: AuditAccessLogRepo;

  constructor(pg: Pool) {
    this.caseRepo = new CaseRepo(pg);
    this.auditRepo = new AuditAccessLogRepo(pg);
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
