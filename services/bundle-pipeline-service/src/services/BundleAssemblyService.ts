/**
 * BundleAssemblyService - Core engine for assembling evidence and claim bundles
 * Integrates with Provenance, Case, and Graph Core services
 */

import { v4 as uuidv4 } from 'uuid';
import type { Pool } from 'pg';
import { ManifestService } from './ManifestService.js';
import type {
  EvidenceBundle,
  ClaimBundle,
  EvidenceItem,
  ClaimItem,
  CreateEvidenceBundleRequest,
  CreateClaimBundleRequest,
  ChainOfCustodyEvent,
  BundleStatus,
  ApprovalRecord,
  LicenseRestriction,
  LegalHoldReference,
} from '../types/index.js';
import { BundleRepository } from '../repositories/BundleRepository.js';
import { ProvenanceClient } from '../clients/ProvenanceClient.js';
import { CaseClient } from '../clients/CaseClient.js';
import { GovernanceClient } from '../clients/GovernanceClient.js';
import type { Logger } from 'pino';

export interface AssemblyContext {
  userId: string;
  tenantId: string;
  reason: string;
  legalBasis?: string;
}

export interface AssemblyResult<T> {
  success: boolean;
  bundle?: T;
  errors: string[];
  warnings: string[];
  provenanceChainId?: string;
}

export class BundleAssemblyService {
  private readonly manifestService: ManifestService;
  private readonly repository: BundleRepository;
  private readonly provenanceClient: ProvenanceClient;
  private readonly caseClient: CaseClient;
  private readonly governanceClient: GovernanceClient;
  private readonly logger: Logger;

  constructor(
    pool: Pool,
    provenanceClient: ProvenanceClient,
    caseClient: CaseClient,
    governanceClient: GovernanceClient,
    logger: Logger,
  ) {
    this.manifestService = new ManifestService();
    this.repository = new BundleRepository(pool, logger);
    this.provenanceClient = provenanceClient;
    this.caseClient = caseClient;
    this.governanceClient = governanceClient;
    this.logger = logger.child({ service: 'BundleAssemblyService' });
  }

  /**
   * Assemble an evidence bundle from selected evidence items
   */
  async assembleEvidenceBundle(
    request: CreateEvidenceBundleRequest,
    context: AssemblyContext,
  ): Promise<AssemblyResult<EvidenceBundle>> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const bundleId = uuidv4();

    this.logger.info({ bundleId, caseId: request.caseId }, 'Starting evidence bundle assembly');

    try {
      // 1. Validate case exists and user has access
      const caseAccess = await this.caseClient.validateCaseAccess(
        request.caseId,
        context.tenantId,
        context.userId,
        'export',
      );

      if (!caseAccess.allowed) {
        errors.push(`Case access denied: ${caseAccess.reason}`);
        return { success: false, errors, warnings };
      }

      // 2. Check governance/retention policies
      const governanceCheck = await this.governanceClient.checkExportPermissions(
        request.caseId,
        request.evidenceIds,
        context.userId,
      );

      if (governanceCheck.blocked) {
        errors.push(`Export blocked by governance: ${governanceCheck.reason}`);
        return { success: false, errors, warnings };
      }

      if (governanceCheck.warnings.length > 0) {
        warnings.push(...governanceCheck.warnings);
      }

      // 3. Fetch evidence items
      const evidenceItems = await this.fetchEvidenceItems(
        request.caseId,
        request.evidenceIds,
        context,
      );

      if (evidenceItems.length === 0) {
        errors.push('No evidence items found for the given IDs');
        return { success: false, errors, warnings };
      }

      if (evidenceItems.length !== request.evidenceIds.length) {
        warnings.push(
          `Only ${evidenceItems.length} of ${request.evidenceIds.length} evidence items were found`,
        );
      }

      // 4. Check for legal holds
      const legalHolds = await this.checkLegalHolds(request.caseId, request.evidenceIds);

      // 5. Collect license restrictions
      const licenseRestrictions = this.collectLicenseRestrictions(evidenceItems);

      // 6. Create provenance chain entry
      const provenanceChainId = await this.provenanceClient.createChain({
        entityType: 'evidence_bundle',
        entityId: bundleId,
        caseId: request.caseId,
        actor: context.userId,
        action: 'bundle_created',
        metadata: {
          evidenceCount: evidenceItems.length,
          classificationLevel: request.classificationLevel,
        },
      });

      // 7. Create manifest
      const manifestItems = this.manifestService.evidenceToManifestItems(evidenceItems);
      const { manifest, rootHash } = this.manifestService.createManifest(
        bundleId,
        'evidence',
        manifestItems,
        context.userId,
        provenanceChainId,
      );

      // 8. Build chain of custody events
      const chainOfCustodyEvents = await this.buildChainOfCustody(
        bundleId,
        evidenceItems,
        context,
      );

      // 9. Extract related entity IDs
      const relatedEntityIds = this.extractRelatedEntityIds(evidenceItems);

      // 10. Calculate required approvals
      const requiredApprovals = this.calculateRequiredApprovals(
        request.classificationLevel,
        legalHolds.length > 0,
        licenseRestrictions,
      );

      // 11. Build the evidence bundle
      const now = new Date().toISOString();
      const bundle: EvidenceBundle = {
        id: bundleId,
        caseId: request.caseId,
        tenantId: context.tenantId,
        title: request.title,
        description: request.description,
        evidenceItems,
        relatedEntityIds,
        classificationLevel: request.classificationLevel,
        sensitivityMarkings: request.sensitivityMarkings || [],
        licenseRestrictions,
        legalHolds,
        warrantMetadata: undefined,
        manifest,
        provenanceChainId,
        chainOfCustodyEvents,
        status: 'draft',
        version: 1,
        createdAt: now,
        createdBy: context.userId,
        updatedAt: now,
        approvals: [],
        requiredApprovals,
        metadata: request.metadata || {},
      };

      // 12. Persist the bundle
      await this.repository.saveEvidenceBundle(bundle);

      // 13. Record assembly in provenance
      await this.provenanceClient.appendEntry(provenanceChainId, {
        action: 'bundle_assembled',
        actor: context.userId,
        contentHash: rootHash,
        metadata: {
          itemCount: evidenceItems.length,
          status: bundle.status,
        },
      });

      this.logger.info(
        { bundleId, itemCount: evidenceItems.length },
        'Evidence bundle assembled successfully',
      );

      return {
        success: true,
        bundle,
        errors,
        warnings,
        provenanceChainId,
      };
    } catch (err) {
      this.logger.error({ err, bundleId }, 'Failed to assemble evidence bundle');
      errors.push(`Assembly failed: ${err instanceof Error ? err.message : String(err)}`);
      return { success: false, errors, warnings };
    }
  }

  /**
   * Assemble a claim bundle from selected claims
   */
  async assembleClaimBundle(
    request: CreateClaimBundleRequest,
    context: AssemblyContext,
  ): Promise<AssemblyResult<ClaimBundle>> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const bundleId = uuidv4();

    this.logger.info({ bundleId, caseId: request.caseId }, 'Starting claim bundle assembly');

    try {
      // 1. Validate case access
      const caseAccess = await this.caseClient.validateCaseAccess(
        request.caseId,
        context.tenantId,
        context.userId,
        'export',
      );

      if (!caseAccess.allowed) {
        errors.push(`Case access denied: ${caseAccess.reason}`);
        return { success: false, errors, warnings };
      }

      // 2. Fetch claims
      const claims = await this.fetchClaims(request.caseId, request.claimIds, context);

      if (claims.length === 0) {
        errors.push('No claims found for the given IDs');
        return { success: false, errors, warnings };
      }

      // 3. Create provenance chain
      const provenanceChainId = await this.provenanceClient.createChain({
        entityType: 'claim_bundle',
        entityId: bundleId,
        caseId: request.caseId,
        actor: context.userId,
        action: 'bundle_created',
        metadata: {
          claimCount: claims.length,
          classificationLevel: request.classificationLevel,
        },
      });

      // 4. Create manifest
      const manifestItems = this.manifestService.claimsToManifestItems(claims);
      const { manifest, rootHash } = this.manifestService.createManifest(
        bundleId,
        'claim',
        manifestItems,
        context.userId,
        provenanceChainId,
      );

      // 5. Calculate overall confidence
      const overallConfidence = this.calculateOverallConfidence(claims);

      // 6. Count conflicting claims
      const conflictingClaimsCount = this.countConflictingClaims(claims);

      // 7. Extract related entity IDs
      const relatedEntityIds = this.extractEntityIdsFromClaims(claims);

      // 8. Build the claim bundle
      const now = new Date().toISOString();
      const bundle: ClaimBundle = {
        id: bundleId,
        caseId: request.caseId,
        tenantId: context.tenantId,
        title: request.title,
        description: request.description,
        claims,
        supportingEvidenceBundleIds: request.evidenceBundleIds || [],
        relatedEntityIds,
        overallConfidence,
        conflictingClaimsCount,
        classificationLevel: request.classificationLevel,
        sensitivityMarkings: request.sensitivityMarkings || [],
        manifest,
        provenanceChainId,
        status: 'draft',
        version: 1,
        createdAt: now,
        createdBy: context.userId,
        updatedAt: now,
        approvals: [],
        requiredApprovals: this.calculateRequiredApprovals(request.classificationLevel, false, []),
        metadata: request.metadata || {},
      };

      // 9. Persist
      await this.repository.saveClaimBundle(bundle);

      // 10. Record in provenance
      await this.provenanceClient.appendEntry(provenanceChainId, {
        action: 'bundle_assembled',
        actor: context.userId,
        contentHash: rootHash,
        metadata: {
          claimCount: claims.length,
          overallConfidence,
        },
      });

      this.logger.info(
        { bundleId, claimCount: claims.length },
        'Claim bundle assembled successfully',
      );

      return {
        success: true,
        bundle,
        errors,
        warnings,
        provenanceChainId,
      };
    } catch (err) {
      this.logger.error({ err, bundleId }, 'Failed to assemble claim bundle');
      errors.push(`Assembly failed: ${err instanceof Error ? err.message : String(err)}`);
      return { success: false, errors, warnings };
    }
  }

  /**
   * Update bundle status with provenance tracking
   */
  async updateBundleStatus(
    bundleId: string,
    bundleType: 'evidence' | 'claim',
    newStatus: BundleStatus,
    context: AssemblyContext,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const bundle = bundleType === 'evidence'
        ? await this.repository.getEvidenceBundle(bundleId)
        : await this.repository.getClaimBundle(bundleId);

      if (!bundle) {
        return { success: false, error: 'Bundle not found' };
      }

      // Validate status transition
      if (!this.isValidStatusTransition(bundle.status, newStatus)) {
        return {
          success: false,
          error: `Invalid status transition from ${bundle.status} to ${newStatus}`,
        };
      }

      // Update status
      if (bundleType === 'evidence') {
        await this.repository.updateEvidenceBundleStatus(bundleId, newStatus);
      } else {
        await this.repository.updateClaimBundleStatus(bundleId, newStatus);
      }

      // Record in provenance
      await this.provenanceClient.appendEntry(bundle.provenanceChainId, {
        action: 'status_changed',
        actor: context.userId,
        metadata: {
          previousStatus: bundle.status,
          newStatus,
          reason: context.reason,
        },
      });

      return { success: true };
    } catch (err) {
      this.logger.error({ err, bundleId }, 'Failed to update bundle status');
      return { success: false, error: String(err) };
    }
  }

  /**
   * Add approval to a bundle
   */
  async addApproval(
    bundleId: string,
    bundleType: 'evidence' | 'claim',
    approval: ApprovalRecord,
    context: AssemblyContext,
  ): Promise<{ success: boolean; fullyApproved: boolean; error?: string }> {
    try {
      const bundle = bundleType === 'evidence'
        ? await this.repository.getEvidenceBundle(bundleId)
        : await this.repository.getClaimBundle(bundleId);

      if (!bundle) {
        return { success: false, fullyApproved: false, error: 'Bundle not found' };
      }

      // Add approval
      bundle.approvals.push(approval);

      // Check if fully approved
      const approvedCount = bundle.approvals.filter((a) => a.decision === 'approved').length;
      const fullyApproved = approvedCount >= bundle.requiredApprovals;

      // Update bundle
      if (bundleType === 'evidence') {
        await this.repository.updateEvidenceBundleApprovals(bundleId, bundle.approvals);
        if (fullyApproved) {
          await this.repository.updateEvidenceBundleStatus(bundleId, 'approved');
        }
      } else {
        await this.repository.updateClaimBundleApprovals(bundleId, bundle.approvals);
        if (fullyApproved) {
          await this.repository.updateClaimBundleStatus(bundleId, 'approved');
        }
      }

      // Record in provenance
      await this.provenanceClient.appendEntry(bundle.provenanceChainId, {
        action: 'approval_added',
        actor: approval.approverId,
        metadata: {
          decision: approval.decision,
          fullyApproved,
          approvalCount: approvedCount,
          requiredApprovals: bundle.requiredApprovals,
        },
      });

      return { success: true, fullyApproved };
    } catch (err) {
      this.logger.error({ err, bundleId }, 'Failed to add approval');
      return { success: false, fullyApproved: false, error: String(err) };
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async fetchEvidenceItems(
    caseId: string,
    evidenceIds: string[],
    context: AssemblyContext,
  ): Promise<EvidenceItem[]> {
    // In production, this would call the Graph Core/Evidence Store API
    // For now, return mock data structure
    const items: EvidenceItem[] = [];

    for (const id of evidenceIds) {
      const item = await this.repository.getEvidenceItem(id, caseId);
      if (item) {
        items.push(item);
      }
    }

    return items;
  }

  private async fetchClaims(
    caseId: string,
    claimIds: string[],
    context: AssemblyContext,
  ): Promise<ClaimItem[]> {
    const claims: ClaimItem[] = [];

    for (const id of claimIds) {
      const claim = await this.repository.getClaimItem(id, caseId);
      if (claim) {
        claims.push(claim);
      }
    }

    return claims;
  }

  private async checkLegalHolds(
    caseId: string,
    evidenceIds: string[],
  ): Promise<LegalHoldReference[]> {
    const holds = await this.governanceClient.getLegalHolds(caseId);
    return holds.filter((h) =>
      h.scope === 'full' ||
      (h.affectedItemIds && h.affectedItemIds.some((id) => evidenceIds.includes(id)))
    );
  }

  private collectLicenseRestrictions(items: EvidenceItem[]): LicenseRestriction[] {
    const restrictionMap = new Map<string, LicenseRestriction>();

    for (const item of items) {
      const key = item.licenseType;
      const existing = restrictionMap.get(key);

      if (existing) {
        if (!existing.affectedItemIds) {
          existing.affectedItemIds = [];
        }
        existing.affectedItemIds.push(item.id);
      } else {
        restrictionMap.set(key, {
          licenseType: item.licenseType,
          scope: 'specific_items',
          affectedItemIds: [item.id],
          restrictions: this.getLicenseRestrictions(item.licenseType),
        });
      }
    }

    return Array.from(restrictionMap.values());
  }

  private getLicenseRestrictions(licenseType: string): string[] {
    const restrictionRules: Record<string, string[]> = {
      FOIA_EXEMPT: ['No public release', 'Redact before FOIA response'],
      PROPRIETARY: ['Internal use only', 'No third-party sharing'],
      COURT_ORDER: ['Court authorization required for release'],
      WARRANT_REQUIRED: ['Valid warrant required for access'],
      RESTRICTED: ['Limited distribution', 'Need-to-know basis'],
      INTERNAL_USE_ONLY: ['Internal use only'],
      PUBLIC_DOMAIN: [],
    };
    return restrictionRules[licenseType] || [];
  }

  private async buildChainOfCustody(
    bundleId: string,
    items: EvidenceItem[],
    context: AssemblyContext,
  ): Promise<ChainOfCustodyEvent[]> {
    const events: ChainOfCustodyEvent[] = [];
    let prevHash = 'GENESIS';

    // Initial bundle creation event
    const creationEvent: ChainOfCustodyEvent = {
      id: uuidv4(),
      eventType: 'collected',
      timestamp: new Date().toISOString(),
      actorId: context.userId,
      actorRole: 'assembler',
      description: `Bundle ${bundleId} created with ${items.length} evidence items`,
      prevHash,
      eventHash: '',
      signature: '',
    };

    creationEvent.eventHash = this.manifestService.computeChainHash(prevHash, creationEvent);
    events.push(creationEvent);

    return events;
  }

  private extractRelatedEntityIds(items: EvidenceItem[]): string[] {
    const entityIds = new Set<string>();
    for (const item of items) {
      if (item.metadata && typeof item.metadata === 'object') {
        const meta = item.metadata as Record<string, unknown>;
        if (Array.isArray(meta.entityRefs)) {
          for (const ref of meta.entityRefs) {
            if (typeof ref === 'object' && ref !== null && 'entityId' in ref) {
              entityIds.add(String(ref.entityId));
            }
          }
        }
      }
    }
    return Array.from(entityIds);
  }

  private extractEntityIdsFromClaims(claims: ClaimItem[]): string[] {
    const entityIds = new Set<string>();
    for (const claim of claims) {
      for (const ref of claim.entityRefs) {
        entityIds.add(ref.entityId);
      }
    }
    return Array.from(entityIds);
  }

  private calculateOverallConfidence(claims: ClaimItem[]): number {
    if (claims.length === 0) return 0;

    const approvedClaims = claims.filter((c) => c.status === 'approved');
    if (approvedClaims.length === 0) {
      return claims.reduce((sum, c) => sum + c.confidence, 0) / claims.length;
    }

    return approvedClaims.reduce((sum, c) => sum + c.confidence, 0) / approvedClaims.length;
  }

  private countConflictingClaims(claims: ClaimItem[]): number {
    let count = 0;
    for (const claim of claims) {
      if (claim.contradictingEvidenceIds.length > 0 || claim.status === 'disputed') {
        count++;
      }
    }
    return count;
  }

  private calculateRequiredApprovals(
    classificationLevel: string,
    hasLegalHold: boolean,
    licenseRestrictions: LicenseRestriction[],
  ): number {
    let required = 1;

    // Higher classification requires more approvals
    if (classificationLevel === 'SECRET' || classificationLevel === 'TOP_SECRET') {
      required = 2;
    }
    if (classificationLevel === 'SCI') {
      required = 3;
    }

    // Legal hold requires additional approval
    if (hasLegalHold) {
      required += 1;
    }

    // Certain license types require additional approval
    const sensitiveTypes = ['WARRANT_REQUIRED', 'COURT_ORDER'];
    if (licenseRestrictions.some((r) => sensitiveTypes.includes(r.licenseType))) {
      required += 1;
    }

    return required;
  }

  private isValidStatusTransition(current: BundleStatus, next: BundleStatus): boolean {
    const validTransitions: Record<BundleStatus, BundleStatus[]> = {
      draft: ['assembling', 'pending_review', 'archived'],
      assembling: ['draft', 'pending_review', 'archived'],
      pending_review: ['draft', 'pending_approval', 'archived'],
      pending_approval: ['pending_review', 'approved', 'archived'],
      approved: ['published', 'archived'],
      published: ['superseded', 'retracted', 'archived'],
      superseded: ['archived'],
      retracted: ['archived'],
      archived: [],
    };

    return validTransitions[current]?.includes(next) || false;
  }
}
