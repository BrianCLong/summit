/**
 * BundleRepository - Data access layer for evidence and claim bundles
 */

import type { Pool, PoolClient } from 'pg';
import type { Logger } from 'pino';
import type {
  EvidenceBundle,
  ClaimBundle,
  BriefingPackage,
  EvidenceItem,
  ClaimItem,
  BundleStatus,
  ApprovalRecord,
} from '../types/index.js';

export class BundleRepository {
  private readonly pool: Pool;
  private readonly logger: Logger;

  constructor(pool: Pool, logger: Logger) {
    this.pool = pool;
    this.logger = logger.child({ component: 'BundleRepository' });
  }

  // ============================================================================
  // Evidence Bundle Operations
  // ============================================================================

  async saveEvidenceBundle(bundle: EvidenceBundle): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO evidence_bundles (
          id, case_id, tenant_id, title, description,
          evidence_items, related_entity_ids,
          classification_level, sensitivity_markings,
          license_restrictions, legal_holds, warrant_metadata,
          manifest, provenance_chain_id, chain_of_custody_events,
          status, version, created_at, created_by, updated_at,
          published_at, expires_at, approvals, required_approvals, metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25
        )`,
        [
          bundle.id,
          bundle.caseId,
          bundle.tenantId,
          bundle.title,
          bundle.description,
          JSON.stringify(bundle.evidenceItems),
          JSON.stringify(bundle.relatedEntityIds),
          bundle.classificationLevel,
          JSON.stringify(bundle.sensitivityMarkings),
          JSON.stringify(bundle.licenseRestrictions),
          JSON.stringify(bundle.legalHolds),
          JSON.stringify(bundle.warrantMetadata),
          JSON.stringify(bundle.manifest),
          bundle.provenanceChainId,
          JSON.stringify(bundle.chainOfCustodyEvents),
          bundle.status,
          bundle.version,
          bundle.createdAt,
          bundle.createdBy,
          bundle.updatedAt,
          bundle.publishedAt,
          bundle.expiresAt,
          JSON.stringify(bundle.approvals),
          bundle.requiredApprovals,
          JSON.stringify(bundle.metadata),
        ],
      );

      await client.query('COMMIT');
      this.logger.debug({ bundleId: bundle.id }, 'Evidence bundle saved');
    } catch (err) {
      await client.query('ROLLBACK');
      this.logger.error({ err, bundleId: bundle.id }, 'Failed to save evidence bundle');
      throw err;
    } finally {
      client.release();
    }
  }

  async getEvidenceBundle(id: string): Promise<EvidenceBundle | null> {
    const result = await this.pool.query(
      'SELECT * FROM evidence_bundles WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToEvidenceBundle(result.rows[0]);
  }

  async getEvidenceBundlesByCase(caseId: string, tenantId: string): Promise<EvidenceBundle[]> {
    const result = await this.pool.query(
      'SELECT * FROM evidence_bundles WHERE case_id = $1 AND tenant_id = $2 ORDER BY created_at DESC',
      [caseId, tenantId],
    );

    return result.rows.map((row) => this.mapRowToEvidenceBundle(row));
  }

  async updateEvidenceBundleStatus(id: string, status: BundleStatus): Promise<void> {
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'published') {
      updates.published_at = new Date().toISOString();
    }

    const setClauses = Object.keys(updates)
      .map((key, i) => `${key} = $${i + 2}`)
      .join(', ');

    await this.pool.query(
      `UPDATE evidence_bundles SET ${setClauses} WHERE id = $1`,
      [id, ...Object.values(updates)],
    );
  }

  async updateEvidenceBundleApprovals(id: string, approvals: ApprovalRecord[]): Promise<void> {
    await this.pool.query(
      'UPDATE evidence_bundles SET approvals = $2, updated_at = $3 WHERE id = $1',
      [id, JSON.stringify(approvals), new Date().toISOString()],
    );
  }

  async incrementEvidenceBundleVersion(id: string): Promise<number> {
    const result = await this.pool.query(
      'UPDATE evidence_bundles SET version = version + 1, updated_at = $2 WHERE id = $1 RETURNING version',
      [id, new Date().toISOString()],
    );
    return result.rows[0]?.version || 1;
  }

  // ============================================================================
  // Claim Bundle Operations
  // ============================================================================

  async saveClaimBundle(bundle: ClaimBundle): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO claim_bundles (
          id, case_id, tenant_id, title, description,
          claims, supporting_evidence_bundle_ids, related_entity_ids,
          overall_confidence, conflicting_claims_count, assessment_summary,
          classification_level, sensitivity_markings,
          manifest, provenance_chain_id,
          status, version, created_at, created_by, updated_at, published_at,
          approvals, required_approvals, metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
        )`,
        [
          bundle.id,
          bundle.caseId,
          bundle.tenantId,
          bundle.title,
          bundle.description,
          JSON.stringify(bundle.claims),
          JSON.stringify(bundle.supportingEvidenceBundleIds),
          JSON.stringify(bundle.relatedEntityIds),
          bundle.overallConfidence,
          bundle.conflictingClaimsCount,
          bundle.assessmentSummary,
          bundle.classificationLevel,
          JSON.stringify(bundle.sensitivityMarkings),
          JSON.stringify(bundle.manifest),
          bundle.provenanceChainId,
          bundle.status,
          bundle.version,
          bundle.createdAt,
          bundle.createdBy,
          bundle.updatedAt,
          bundle.publishedAt,
          JSON.stringify(bundle.approvals),
          bundle.requiredApprovals,
          JSON.stringify(bundle.metadata),
        ],
      );

      await client.query('COMMIT');
      this.logger.debug({ bundleId: bundle.id }, 'Claim bundle saved');
    } catch (err) {
      await client.query('ROLLBACK');
      this.logger.error({ err, bundleId: bundle.id }, 'Failed to save claim bundle');
      throw err;
    } finally {
      client.release();
    }
  }

  async getClaimBundle(id: string): Promise<ClaimBundle | null> {
    const result = await this.pool.query(
      'SELECT * FROM claim_bundles WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToClaimBundle(result.rows[0]);
  }

  async getClaimBundlesByCase(caseId: string, tenantId: string): Promise<ClaimBundle[]> {
    const result = await this.pool.query(
      'SELECT * FROM claim_bundles WHERE case_id = $1 AND tenant_id = $2 ORDER BY created_at DESC',
      [caseId, tenantId],
    );

    return result.rows.map((row) => this.mapRowToClaimBundle(row));
  }

  async updateClaimBundleStatus(id: string, status: BundleStatus): Promise<void> {
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'published') {
      updates.published_at = new Date().toISOString();
    }

    const setClauses = Object.keys(updates)
      .map((key, i) => `${key} = $${i + 2}`)
      .join(', ');

    await this.pool.query(
      `UPDATE claim_bundles SET ${setClauses} WHERE id = $1`,
      [id, ...Object.values(updates)],
    );
  }

  async updateClaimBundleApprovals(id: string, approvals: ApprovalRecord[]): Promise<void> {
    await this.pool.query(
      'UPDATE claim_bundles SET approvals = $2, updated_at = $3 WHERE id = $1',
      [id, JSON.stringify(approvals), new Date().toISOString()],
    );
  }

  // ============================================================================
  // Briefing Package Operations
  // ============================================================================

  async saveBriefingPackage(briefing: BriefingPackage): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO briefing_packages (
          id, case_id, tenant_id, title, briefing_type,
          evidence_bundle_ids, claim_bundle_ids, additional_sources,
          executive_summary, narrative_sections, key_findings,
          recommendations, annexes, slide_decks, visualizations,
          classification_level, sensitivity_markings, redaction_log,
          manifest, provenance_chain_id, citation_index,
          status, version, created_at, created_by, updated_at,
          published_at, distribution_list,
          approvals, required_approvals, four_eyes_required,
          delivery_channels, delivery_status, metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34
        )`,
        [
          briefing.id,
          briefing.caseId,
          briefing.tenantId,
          briefing.title,
          briefing.briefingType,
          JSON.stringify(briefing.evidenceBundleIds),
          JSON.stringify(briefing.claimBundleIds),
          JSON.stringify(briefing.additionalSources),
          briefing.executiveSummary,
          JSON.stringify(briefing.narrativeSections),
          JSON.stringify(briefing.keyFindings),
          JSON.stringify(briefing.recommendations),
          JSON.stringify(briefing.annexes),
          JSON.stringify(briefing.slideDecks),
          JSON.stringify(briefing.visualizations),
          briefing.classificationLevel,
          JSON.stringify(briefing.sensitivityMarkings),
          JSON.stringify(briefing.redactionLog),
          JSON.stringify(briefing.manifest),
          briefing.provenanceChainId,
          JSON.stringify(briefing.citationIndex),
          briefing.status,
          briefing.version,
          briefing.createdAt,
          briefing.createdBy,
          briefing.updatedAt,
          briefing.publishedAt,
          JSON.stringify(briefing.distributionList),
          JSON.stringify(briefing.approvals),
          briefing.requiredApprovals,
          briefing.fourEyesRequired,
          JSON.stringify(briefing.deliveryChannels),
          JSON.stringify(briefing.deliveryStatus),
          JSON.stringify(briefing.metadata),
        ],
      );

      await client.query('COMMIT');
      this.logger.debug({ briefingId: briefing.id }, 'Briefing package saved');
    } catch (err) {
      await client.query('ROLLBACK');
      this.logger.error({ err, briefingId: briefing.id }, 'Failed to save briefing package');
      throw err;
    } finally {
      client.release();
    }
  }

  async getBriefingPackage(id: string): Promise<BriefingPackage | null> {
    const result = await this.pool.query(
      'SELECT * FROM briefing_packages WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToBriefingPackage(result.rows[0]);
  }

  async getBriefingPackagesByCase(caseId: string, tenantId: string): Promise<BriefingPackage[]> {
    const result = await this.pool.query(
      'SELECT * FROM briefing_packages WHERE case_id = $1 AND tenant_id = $2 ORDER BY created_at DESC',
      [caseId, tenantId],
    );

    return result.rows.map((row) => this.mapRowToBriefingPackage(row));
  }

  async updateBriefingPackageStatus(id: string, status: BundleStatus): Promise<void> {
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'published') {
      updates.published_at = new Date().toISOString();
    }

    const setClauses = Object.keys(updates)
      .map((key, i) => `${key} = $${i + 2}`)
      .join(', ');

    await this.pool.query(
      `UPDATE briefing_packages SET ${setClauses} WHERE id = $1`,
      [id, ...Object.values(updates)],
    );
  }

  async updateBriefingPackageApprovals(id: string, approvals: ApprovalRecord[]): Promise<void> {
    await this.pool.query(
      'UPDATE briefing_packages SET approvals = $2, updated_at = $3 WHERE id = $1',
      [id, JSON.stringify(approvals), new Date().toISOString()],
    );
  }

  async updateBriefingDeliveryStatus(
    id: string,
    deliveryStatus: BriefingPackage['deliveryStatus'],
  ): Promise<void> {
    await this.pool.query(
      'UPDATE briefing_packages SET delivery_status = $2, updated_at = $3 WHERE id = $1',
      [id, JSON.stringify(deliveryStatus), new Date().toISOString()],
    );
  }

  // ============================================================================
  // Evidence and Claim Item Operations
  // ============================================================================

  async getEvidenceItem(id: string, caseId: string): Promise<EvidenceItem | null> {
    const result = await this.pool.query(
      'SELECT * FROM evidence_items WHERE id = $1 AND case_id = $2',
      [id, caseId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToEvidenceItem(result.rows[0]);
  }

  async getClaimItem(id: string, caseId: string): Promise<ClaimItem | null> {
    const result = await this.pool.query(
      'SELECT * FROM claim_items WHERE id = $1 AND case_id = $2',
      [id, caseId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToClaimItem(result.rows[0]);
  }

  // ============================================================================
  // Mapping Functions
  // ============================================================================

  private mapRowToEvidenceBundle(row: Record<string, unknown>): EvidenceBundle {
    return {
      id: row.id as string,
      caseId: row.case_id as string,
      tenantId: row.tenant_id as string,
      title: row.title as string,
      description: row.description as string | undefined,
      evidenceItems: JSON.parse(row.evidence_items as string || '[]'),
      relatedEntityIds: JSON.parse(row.related_entity_ids as string || '[]'),
      classificationLevel: row.classification_level as EvidenceBundle['classificationLevel'],
      sensitivityMarkings: JSON.parse(row.sensitivity_markings as string || '[]'),
      licenseRestrictions: JSON.parse(row.license_restrictions as string || '[]'),
      legalHolds: JSON.parse(row.legal_holds as string || '[]'),
      warrantMetadata: row.warrant_metadata
        ? JSON.parse(row.warrant_metadata as string)
        : undefined,
      manifest: JSON.parse(row.manifest as string),
      provenanceChainId: row.provenance_chain_id as string,
      chainOfCustodyEvents: JSON.parse(row.chain_of_custody_events as string || '[]'),
      status: row.status as BundleStatus,
      version: row.version as number,
      createdAt: row.created_at as string,
      createdBy: row.created_by as string,
      updatedAt: row.updated_at as string,
      publishedAt: row.published_at as string | undefined,
      expiresAt: row.expires_at as string | undefined,
      approvals: JSON.parse(row.approvals as string || '[]'),
      requiredApprovals: row.required_approvals as number,
      metadata: JSON.parse(row.metadata as string || '{}'),
    };
  }

  private mapRowToClaimBundle(row: Record<string, unknown>): ClaimBundle {
    return {
      id: row.id as string,
      caseId: row.case_id as string,
      tenantId: row.tenant_id as string,
      title: row.title as string,
      description: row.description as string | undefined,
      claims: JSON.parse(row.claims as string || '[]'),
      supportingEvidenceBundleIds: JSON.parse(row.supporting_evidence_bundle_ids as string || '[]'),
      relatedEntityIds: JSON.parse(row.related_entity_ids as string || '[]'),
      overallConfidence: row.overall_confidence as number,
      conflictingClaimsCount: row.conflicting_claims_count as number,
      assessmentSummary: row.assessment_summary as string | undefined,
      classificationLevel: row.classification_level as ClaimBundle['classificationLevel'],
      sensitivityMarkings: JSON.parse(row.sensitivity_markings as string || '[]'),
      manifest: JSON.parse(row.manifest as string),
      provenanceChainId: row.provenance_chain_id as string,
      status: row.status as BundleStatus,
      version: row.version as number,
      createdAt: row.created_at as string,
      createdBy: row.created_by as string,
      updatedAt: row.updated_at as string,
      publishedAt: row.published_at as string | undefined,
      approvals: JSON.parse(row.approvals as string || '[]'),
      requiredApprovals: row.required_approvals as number,
      metadata: JSON.parse(row.metadata as string || '{}'),
    };
  }

  private mapRowToBriefingPackage(row: Record<string, unknown>): BriefingPackage {
    return {
      id: row.id as string,
      caseId: row.case_id as string,
      tenantId: row.tenant_id as string,
      title: row.title as string,
      briefingType: row.briefing_type as BriefingPackage['briefingType'],
      evidenceBundleIds: JSON.parse(row.evidence_bundle_ids as string || '[]'),
      claimBundleIds: JSON.parse(row.claim_bundle_ids as string || '[]'),
      additionalSources: JSON.parse(row.additional_sources as string || '[]'),
      executiveSummary: row.executive_summary as string,
      narrativeSections: JSON.parse(row.narrative_sections as string || '[]'),
      keyFindings: JSON.parse(row.key_findings as string || '[]'),
      recommendations: JSON.parse(row.recommendations as string || '[]'),
      annexes: JSON.parse(row.annexes as string || '[]'),
      slideDecks: row.slide_decks ? JSON.parse(row.slide_decks as string) : undefined,
      visualizations: JSON.parse(row.visualizations as string || '[]'),
      classificationLevel: row.classification_level as BriefingPackage['classificationLevel'],
      sensitivityMarkings: JSON.parse(row.sensitivity_markings as string || '[]'),
      redactionLog: JSON.parse(row.redaction_log as string || '[]'),
      manifest: JSON.parse(row.manifest as string),
      provenanceChainId: row.provenance_chain_id as string,
      citationIndex: JSON.parse(row.citation_index as string || '[]'),
      status: row.status as BundleStatus,
      version: row.version as number,
      createdAt: row.created_at as string,
      createdBy: row.created_by as string,
      updatedAt: row.updated_at as string,
      publishedAt: row.published_at as string | undefined,
      distributionList: JSON.parse(row.distribution_list as string || '[]'),
      approvals: JSON.parse(row.approvals as string || '[]'),
      requiredApprovals: row.required_approvals as number,
      fourEyesRequired: row.four_eyes_required as boolean,
      deliveryChannels: JSON.parse(row.delivery_channels as string || '[]'),
      deliveryStatus: JSON.parse(row.delivery_status as string || '[]'),
      metadata: JSON.parse(row.metadata as string || '{}'),
    };
  }

  private mapRowToEvidenceItem(row: Record<string, unknown>): EvidenceItem {
    return {
      id: row.id as string,
      type: row.type as EvidenceItem['type'],
      title: row.title as string,
      description: row.description as string | undefined,
      sourceUri: row.source_uri as string,
      contentHash: row.content_hash as string,
      mimeType: row.mime_type as string,
      sizeBytes: row.size_bytes as number,
      collectedAt: row.collected_at as string,
      collectedBy: row.collected_by as string,
      chainOfCustodyHash: row.chain_of_custody_hash as string,
      classificationLevel: row.classification_level as EvidenceItem['classificationLevel'],
      sensitivityMarkings: JSON.parse(row.sensitivity_markings as string || '[]'),
      licenseType: row.license_type as EvidenceItem['licenseType'],
      metadata: JSON.parse(row.metadata as string || '{}'),
    };
  }

  private mapRowToClaimItem(row: Record<string, unknown>): ClaimItem {
    return {
      id: row.id as string,
      statement: row.statement as string,
      confidence: row.confidence as number,
      source: row.source as ClaimItem['source'],
      createdBy: row.created_by as string,
      createdAt: row.created_at as string,
      supportingEvidenceIds: JSON.parse(row.supporting_evidence_ids as string || '[]'),
      contradictingEvidenceIds: JSON.parse(row.contradicting_evidence_ids as string || '[]'),
      status: row.status as ClaimItem['status'],
      provenanceHash: row.provenance_hash as string,
      entityRefs: JSON.parse(row.entity_refs as string || '[]'),
      tags: JSON.parse(row.tags as string || '[]'),
    };
  }
}
