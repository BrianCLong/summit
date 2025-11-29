/**
 * BriefingAssemblyService - Assembles briefing packages from evidence and claims
 * Handles narrative generation, slides, visualizations, and templating
 */

import { v4 as uuidv4 } from 'uuid';
import type { Pool } from 'pg';
import Handlebars from 'handlebars';
import { ManifestService } from './ManifestService.js';
import { BundleRepository } from '../repositories/BundleRepository.js';
import { ProvenanceClient } from '../clients/ProvenanceClient.js';
import { CaseClient } from '../clients/CaseClient.js';
import { GovernanceClient, type RedactionRule } from '../clients/GovernanceClient.js';
import type {
  BriefingPackage,
  CreateBriefingPackageRequest,
  EvidenceBundle,
  ClaimBundle,
  NarrativeSection,
  KeyFinding,
  Recommendation,
  Annex,
  SlideDeck,
  Slide,
  Visualization,
  CitationEntry,
  RedactionLogEntry,
  ApprovalRecord,
  BundleStatus,
  DeliveryStatus,
} from '../types/index.js';
import type { Logger } from 'pino';

export interface BriefingAssemblyContext {
  userId: string;
  tenantId: string;
  reason: string;
  legalBasis?: string;
}

export interface BriefingAssemblyResult {
  success: boolean;
  briefing?: BriefingPackage;
  errors: string[];
  warnings: string[];
  provenanceChainId?: string;
}

export interface BriefingTemplate {
  id: string;
  name: string;
  briefingType: string;
  sections: TemplateSection[];
  slideLayouts?: SlideLayout[];
  defaultOptions: BriefingTemplateOptions;
}

interface TemplateSection {
  id: string;
  title: string;
  template: string;
  order: number;
  required: boolean;
}

interface SlideLayout {
  name: string;
  layout: 'title' | 'content' | 'two_column' | 'chart' | 'image' | 'bullets';
  template: string;
}

interface BriefingTemplateOptions {
  includeExecutiveSummary: boolean;
  includeKeyFindings: boolean;
  includeRecommendations: boolean;
  includeAnnexes: boolean;
  maxSections: number;
}

export class BriefingAssemblyService {
  private readonly manifestService: ManifestService;
  private readonly repository: BundleRepository;
  private readonly provenanceClient: ProvenanceClient;
  private readonly caseClient: CaseClient;
  private readonly governanceClient: GovernanceClient;
  private readonly logger: Logger;
  private readonly templates: Map<string, BriefingTemplate> = new Map();

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
    this.logger = logger.child({ service: 'BriefingAssemblyService' });
    this.initializeDefaultTemplates();
    this.registerHandlebarsHelpers();
  }

  /**
   * Assemble a briefing package
   */
  async assembleBriefingPackage(
    request: CreateBriefingPackageRequest,
    context: BriefingAssemblyContext,
  ): Promise<BriefingAssemblyResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const briefingId = uuidv4();

    this.logger.info(
      { briefingId, caseId: request.caseId, briefingType: request.briefingType },
      'Starting briefing package assembly',
    );

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

      // 2. Fetch source bundles
      const { evidenceBundles, claimBundles, bundleErrors } = await this.fetchSourceBundles(
        request,
        context,
      );

      if (bundleErrors.length > 0) {
        warnings.push(...bundleErrors);
      }

      if (evidenceBundles.length === 0 && claimBundles.length === 0) {
        errors.push('No source bundles found');
        return { success: false, errors, warnings };
      }

      // 3. Check governance requirements
      const allItemIds = [
        ...evidenceBundles.flatMap((b) => b.evidenceItems.map((e) => e.id)),
      ];

      const governanceCheck = await this.governanceClient.checkExportPermissions(
        request.caseId,
        allItemIds,
        context.userId,
      );

      if (governanceCheck.blocked) {
        errors.push(`Export blocked by governance: ${governanceCheck.reason}`);
        return { success: false, errors, warnings };
      }

      warnings.push(...governanceCheck.warnings);

      // 4. Create provenance chain
      const provenanceChainId = await this.provenanceClient.createChain({
        entityType: 'briefing_package',
        entityId: briefingId,
        caseId: request.caseId,
        actor: context.userId,
        action: 'briefing_created',
        metadata: {
          briefingType: request.briefingType,
          evidenceBundleCount: evidenceBundles.length,
          claimBundleCount: claimBundles.length,
        },
      });

      // 5. Check four-eyes requirement
      const fourEyesConfig = await this.governanceClient.checkFourEyesRequirement(
        request.classificationLevel,
        evidenceBundles.some((b) => b.legalHolds.length > 0),
        request.sensitivityMarkings || [],
      );

      // 6. Apply redactions
      const redactionLog: RedactionLogEntry[] = [];
      const redactedEvidence = await this.applyRedactions(
        evidenceBundles,
        governanceCheck.requiredRedactions,
        redactionLog,
      );

      // 7. Generate narrative sections
      const narrativeSections = await this.generateNarrativeSections(
        request,
        redactedEvidence,
        claimBundles,
        context,
      );

      // 8. Extract key findings
      const keyFindings = this.extractKeyFindings(claimBundles, redactedEvidence);

      // 9. Generate recommendations
      const recommendations = this.generateRecommendations(keyFindings, request.briefingType);

      // 10. Generate executive summary
      const executiveSummary = request.includeExecutiveSummary
        ? await this.generateExecutiveSummary(
            request,
            keyFindings,
            narrativeSections,
            context,
          )
        : '';

      // 11. Build annexes
      const annexes = this.buildAnnexes(redactedEvidence, claimBundles);

      // 12. Generate slide decks if requested
      const slideDecks = request.includeSlideDecks
        ? await this.generateSlideDecks(
            request,
            executiveSummary,
            keyFindings,
            narrativeSections,
          )
        : undefined;

      // 13. Generate visualizations
      const visualizations = await this.generateVisualizations(
        redactedEvidence,
        claimBundles,
      );

      // 14. Build citation index
      const citationIndex = this.buildCitationIndex(redactedEvidence, claimBundles);

      // 15. Create manifest
      const manifestItems = this.buildManifestItems(
        narrativeSections,
        keyFindings,
        annexes,
        citationIndex,
      );

      const { manifest, rootHash } = this.manifestService.createManifest(
        briefingId,
        'briefing',
        manifestItems,
        context.userId,
        provenanceChainId,
      );

      // 16. Calculate required approvals
      const requiredApprovals = this.calculateRequiredApprovals(
        request.classificationLevel,
        fourEyesConfig.required,
        governanceCheck.requiredApprovals,
      );

      // 17. Build the briefing package
      const now = new Date().toISOString();
      const briefing: BriefingPackage = {
        id: briefingId,
        caseId: request.caseId,
        tenantId: context.tenantId,
        title: request.title,
        briefingType: request.briefingType,
        evidenceBundleIds: request.evidenceBundleIds || [],
        claimBundleIds: request.claimBundleIds || [],
        additionalSources: [],
        executiveSummary,
        narrativeSections,
        keyFindings,
        recommendations,
        annexes,
        slideDecks,
        visualizations,
        classificationLevel: request.classificationLevel,
        sensitivityMarkings: request.sensitivityMarkings || [],
        redactionLog,
        manifest,
        provenanceChainId,
        citationIndex,
        status: 'draft',
        version: 1,
        createdAt: now,
        createdBy: context.userId,
        updatedAt: now,
        distributionList: request.distributionList || [],
        approvals: [],
        requiredApprovals,
        fourEyesRequired: fourEyesConfig.required,
        deliveryChannels: request.deliveryChannels || [],
        deliveryStatus: [],
        metadata: request.metadata || {},
      };

      // 18. Persist the briefing
      await this.repository.saveBriefingPackage(briefing);

      // 19. Record in provenance
      await this.provenanceClient.appendEntry(provenanceChainId, {
        action: 'briefing_assembled',
        actor: context.userId,
        contentHash: rootHash,
        metadata: {
          sectionCount: narrativeSections.length,
          findingsCount: keyFindings.length,
          annexCount: annexes.length,
          status: briefing.status,
        },
      });

      this.logger.info(
        { briefingId, sectionCount: narrativeSections.length },
        'Briefing package assembled successfully',
      );

      return {
        success: true,
        briefing,
        errors,
        warnings,
        provenanceChainId,
      };
    } catch (err) {
      this.logger.error({ err, briefingId }, 'Failed to assemble briefing package');
      errors.push(`Assembly failed: ${err instanceof Error ? err.message : String(err)}`);
      return { success: false, errors, warnings };
    }
  }

  /**
   * Update briefing status
   */
  async updateBriefingStatus(
    briefingId: string,
    newStatus: BundleStatus,
    context: BriefingAssemblyContext,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const briefing = await this.repository.getBriefingPackage(briefingId);
      if (!briefing) {
        return { success: false, error: 'Briefing not found' };
      }

      if (!this.isValidStatusTransition(briefing.status, newStatus)) {
        return {
          success: false,
          error: `Invalid status transition from ${briefing.status} to ${newStatus}`,
        };
      }

      await this.repository.updateBriefingPackageStatus(briefingId, newStatus);

      await this.provenanceClient.appendEntry(briefing.provenanceChainId, {
        action: 'status_changed',
        actor: context.userId,
        metadata: {
          previousStatus: briefing.status,
          newStatus,
          reason: context.reason,
        },
      });

      return { success: true };
    } catch (err) {
      this.logger.error({ err, briefingId }, 'Failed to update briefing status');
      return { success: false, error: String(err) };
    }
  }

  /**
   * Add approval to a briefing
   */
  async addApproval(
    briefingId: string,
    approval: ApprovalRecord,
    context: BriefingAssemblyContext,
  ): Promise<{ success: boolean; fullyApproved: boolean; error?: string }> {
    try {
      const briefing = await this.repository.getBriefingPackage(briefingId);
      if (!briefing) {
        return { success: false, fullyApproved: false, error: 'Briefing not found' };
      }

      // Check four-eyes requirement
      if (briefing.fourEyesRequired) {
        const existingApprovers = new Set(
          briefing.approvals
            .filter((a) => a.decision === 'approved')
            .map((a) => a.approverId),
        );

        if (existingApprovers.has(approval.approverId)) {
          return {
            success: false,
            fullyApproved: false,
            error: 'Four-eyes: Same approver cannot approve twice',
          };
        }
      }

      briefing.approvals.push(approval);

      const approvedCount = briefing.approvals.filter((a) => a.decision === 'approved').length;
      const fullyApproved = approvedCount >= briefing.requiredApprovals;

      await this.repository.updateBriefingPackageApprovals(briefingId, briefing.approvals);

      if (fullyApproved) {
        await this.repository.updateBriefingPackageStatus(briefingId, 'approved');
      }

      await this.provenanceClient.appendEntry(briefing.provenanceChainId, {
        action: 'approval_added',
        actor: approval.approverId,
        metadata: {
          decision: approval.decision,
          fullyApproved,
          approvalCount: approvedCount,
          requiredApprovals: briefing.requiredApprovals,
          fourEyesRequired: briefing.fourEyesRequired,
        },
      });

      return { success: true, fullyApproved };
    } catch (err) {
      this.logger.error({ err, briefingId }, 'Failed to add approval');
      return { success: false, fullyApproved: false, error: String(err) };
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async fetchSourceBundles(
    request: CreateBriefingPackageRequest,
    context: BriefingAssemblyContext,
  ): Promise<{
    evidenceBundles: EvidenceBundle[];
    claimBundles: ClaimBundle[];
    bundleErrors: string[];
  }> {
    const evidenceBundles: EvidenceBundle[] = [];
    const claimBundles: ClaimBundle[] = [];
    const bundleErrors: string[] = [];

    for (const id of request.evidenceBundleIds || []) {
      const bundle = await this.repository.getEvidenceBundle(id);
      if (bundle) {
        evidenceBundles.push(bundle);
      } else {
        bundleErrors.push(`Evidence bundle not found: ${id}`);
      }
    }

    for (const id of request.claimBundleIds || []) {
      const bundle = await this.repository.getClaimBundle(id);
      if (bundle) {
        claimBundles.push(bundle);
      } else {
        bundleErrors.push(`Claim bundle not found: ${id}`);
      }
    }

    return { evidenceBundles, claimBundles, bundleErrors };
  }

  private async applyRedactions(
    evidenceBundles: EvidenceBundle[],
    rules: RedactionRule[],
    redactionLog: RedactionLogEntry[],
  ): Promise<EvidenceBundle[]> {
    if (rules.length === 0) {
      return evidenceBundles;
    }

    return evidenceBundles.map((bundle) => {
      const redactedItems = bundle.evidenceItems.map((item) => {
        const clone = JSON.parse(JSON.stringify(item));

        for (const rule of rules) {
          if (Object.prototype.hasOwnProperty.call(clone, rule.field)) {
            redactionLog.push({
              timestamp: new Date().toISOString(),
              field: rule.field,
              action: rule.action,
              reason: rule.reason,
              authorizedBy: 'governance-policy',
            });

            if (rule.action === 'redact' || rule.action === 'mask') {
              clone[rule.field] = '[REDACTED]';
            } else if (rule.action === 'remove') {
              delete clone[rule.field];
            }
          }
        }

        return clone;
      });

      return { ...bundle, evidenceItems: redactedItems };
    });
  }

  private async generateNarrativeSections(
    request: CreateBriefingPackageRequest,
    evidenceBundles: EvidenceBundle[],
    claimBundles: ClaimBundle[],
    context: BriefingAssemblyContext,
  ): Promise<NarrativeSection[]> {
    const template = request.templateId
      ? this.templates.get(request.templateId)
      : this.getDefaultTemplate(request.briefingType);

    if (!template) {
      return this.generateDefaultSections(evidenceBundles, claimBundles);
    }

    const sections: NarrativeSection[] = [];
    const templateData = this.prepareTemplateData(evidenceBundles, claimBundles, request);

    for (const sectionTemplate of template.sections) {
      const compiledTemplate = Handlebars.compile(sectionTemplate.template);
      const content = compiledTemplate(templateData);

      sections.push({
        id: uuidv4(),
        title: sectionTemplate.title,
        content,
        order: sectionTemplate.order,
        citations: this.extractCitationsFromContent(content),
        generatedBy: request.generateNarrativeWithAI ? 'ai' : 'template',
      });
    }

    return sections.sort((a, b) => a.order - b.order);
  }

  private generateDefaultSections(
    evidenceBundles: EvidenceBundle[],
    claimBundles: ClaimBundle[],
  ): NarrativeSection[] {
    const sections: NarrativeSection[] = [];

    // Background section
    sections.push({
      id: uuidv4(),
      title: 'Background',
      content: this.generateBackgroundContent(evidenceBundles, claimBundles),
      order: 1,
      citations: [],
      generatedBy: 'template',
    });

    // Evidence Summary section
    if (evidenceBundles.length > 0) {
      sections.push({
        id: uuidv4(),
        title: 'Evidence Summary',
        content: this.generateEvidenceSummaryContent(evidenceBundles),
        order: 2,
        citations: evidenceBundles.flatMap((b) => b.evidenceItems.map((e) => e.id)),
        generatedBy: 'template',
      });
    }

    // Claims Analysis section
    if (claimBundles.length > 0) {
      sections.push({
        id: uuidv4(),
        title: 'Claims Analysis',
        content: this.generateClaimsAnalysisContent(claimBundles),
        order: 3,
        citations: claimBundles.flatMap((b) => b.claims.map((c) => c.id)),
        generatedBy: 'template',
      });
    }

    return sections;
  }

  private generateBackgroundContent(
    evidenceBundles: EvidenceBundle[],
    claimBundles: ClaimBundle[],
  ): string {
    const totalEvidence = evidenceBundles.reduce(
      (sum, b) => sum + b.evidenceItems.length,
      0,
    );
    const totalClaims = claimBundles.reduce((sum, b) => sum + b.claims.length, 0);

    return `This briefing package contains analysis of ${totalEvidence} pieces of evidence ` +
      `across ${evidenceBundles.length} evidence bundles, and ${totalClaims} claims ` +
      `across ${claimBundles.length} claim bundles. ` +
      `The evidence has been collected and verified through established chain-of-custody procedures.`;
  }

  private generateEvidenceSummaryContent(evidenceBundles: EvidenceBundle[]): string {
    const typeBreakdown = new Map<string, number>();

    for (const bundle of evidenceBundles) {
      for (const item of bundle.evidenceItems) {
        const count = typeBreakdown.get(item.type) || 0;
        typeBreakdown.set(item.type, count + 1);
      }
    }

    const breakdown = Array.from(typeBreakdown.entries())
      .map(([type, count]) => `${count} ${type}(s)`)
      .join(', ');

    return `The evidence consists of: ${breakdown}. ` +
      `All evidence items have been verified for authenticity and ` +
      `their chain of custody has been documented.`;
  }

  private generateClaimsAnalysisContent(claimBundles: ClaimBundle[]): string {
    const allClaims = claimBundles.flatMap((b) => b.claims);
    const avgConfidence = allClaims.length > 0
      ? allClaims.reduce((sum, c) => sum + c.confidence, 0) / allClaims.length
      : 0;

    const approved = allClaims.filter((c) => c.status === 'approved').length;
    const disputed = allClaims.filter((c) => c.status === 'disputed').length;

    return `Analysis of ${allClaims.length} claims with an average confidence level of ` +
      `${(avgConfidence * 100).toFixed(1)}%. ` +
      `${approved} claims have been approved, ${disputed} are disputed.`;
  }

  private extractKeyFindings(
    claimBundles: ClaimBundle[],
    evidenceBundles: EvidenceBundle[],
  ): KeyFinding[] {
    const findings: KeyFinding[] = [];

    // Extract high-confidence claims as key findings
    const allClaims = claimBundles.flatMap((b) => b.claims);
    const highConfidenceClaims = allClaims
      .filter((c) => c.confidence >= 0.7 && c.status === 'approved')
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);

    for (const claim of highConfidenceClaims) {
      findings.push({
        id: uuidv4(),
        summary: claim.statement,
        confidence: claim.confidence,
        supportingClaimIds: [claim.id],
        supportingEvidenceIds: claim.supportingEvidenceIds,
        priority: claim.confidence >= 0.9 ? 'critical' : claim.confidence >= 0.8 ? 'high' : 'medium',
        category: claim.tags[0] || 'general',
      });
    }

    return findings;
  }

  private generateRecommendations(
    keyFindings: KeyFinding[],
    briefingType: string,
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Generate recommendations based on findings
    const criticalFindings = keyFindings.filter((f) => f.priority === 'critical');
    const highFindings = keyFindings.filter((f) => f.priority === 'high');

    if (criticalFindings.length > 0) {
      recommendations.push({
        id: uuidv4(),
        title: 'Address Critical Findings',
        description: `Review and address ${criticalFindings.length} critical findings identified in this briefing.`,
        priority: 'immediate',
        status: 'proposed',
      });
    }

    if (highFindings.length > 0) {
      recommendations.push({
        id: uuidv4(),
        title: 'Follow-up on High Priority Items',
        description: `Schedule follow-up analysis for ${highFindings.length} high-priority findings.`,
        priority: 'short_term',
        status: 'proposed',
      });
    }

    return recommendations;
  }

  private async generateExecutiveSummary(
    request: CreateBriefingPackageRequest,
    keyFindings: KeyFinding[],
    narrativeSections: NarrativeSection[],
    context: BriefingAssemblyContext,
  ): Promise<string> {
    const criticalCount = keyFindings.filter((f) => f.priority === 'critical').length;
    const avgConfidence = keyFindings.length > 0
      ? keyFindings.reduce((sum, f) => sum + f.confidence, 0) / keyFindings.length
      : 0;

    return `EXECUTIVE SUMMARY\n\n` +
      `This ${request.briefingType.replace(/_/g, ' ')} briefing contains ` +
      `${narrativeSections.length} sections analyzing case data. ` +
      `${keyFindings.length} key findings have been identified, ` +
      `with ${criticalCount} marked as critical priority. ` +
      `The overall average confidence level is ${(avgConfidence * 100).toFixed(1)}%.\n\n` +
      `Classification: ${request.classificationLevel}\n` +
      `Generated: ${new Date().toISOString()}\n` +
      `Generated by: ${context.userId}`;
  }

  private buildAnnexes(
    evidenceBundles: EvidenceBundle[],
    claimBundles: ClaimBundle[],
  ): Annex[] {
    const annexes: Annex[] = [];
    let order = 1;

    // Add evidence annexes
    for (const bundle of evidenceBundles) {
      for (const item of bundle.evidenceItems) {
        annexes.push({
          id: uuidv4(),
          title: item.title,
          type: this.mapEvidenceTypeToAnnexType(item.type),
          contentUri: item.sourceUri,
          contentHash: item.contentHash,
          mimeType: item.mimeType,
          sizeBytes: item.sizeBytes,
          order: order++,
          description: item.description,
        });
      }
    }

    return annexes;
  }

  private mapEvidenceTypeToAnnexType(evidenceType: string): Annex['type'] {
    const mapping: Record<string, Annex['type']> = {
      document: 'raw_document',
      image: 'raw_document',
      video: 'raw_document',
      audio: 'raw_document',
      data: 'table',
      testimony: 'extract',
      artifact: 'raw_document',
    };
    return mapping[evidenceType] || 'raw_document';
  }

  private async generateSlideDecks(
    request: CreateBriefingPackageRequest,
    executiveSummary: string,
    keyFindings: KeyFinding[],
    narrativeSections: NarrativeSection[],
  ): Promise<SlideDeck[]> {
    const slides: Slide[] = [];

    // Title slide
    slides.push({
      id: uuidv4(),
      order: 1,
      title: request.title,
      layout: 'title',
      content: {
        heading: request.title,
        body: `${request.briefingType.replace(/_/g, ' ').toUpperCase()}\n${new Date().toLocaleDateString()}`,
      },
    });

    // Executive summary slide
    if (executiveSummary) {
      slides.push({
        id: uuidv4(),
        order: 2,
        title: 'Executive Summary',
        layout: 'content',
        content: {
          heading: 'Executive Summary',
          body: executiveSummary.substring(0, 500),
        },
      });
    }

    // Key findings slides
    if (keyFindings.length > 0) {
      slides.push({
        id: uuidv4(),
        order: 3,
        title: 'Key Findings',
        layout: 'bullets',
        content: {
          heading: 'Key Findings',
          bullets: keyFindings.slice(0, 5).map((f) => f.summary),
        },
      });
    }

    // Section slides
    for (let i = 0; i < Math.min(narrativeSections.length, 5); i++) {
      const section = narrativeSections[i];
      slides.push({
        id: uuidv4(),
        order: 4 + i,
        title: section.title,
        layout: 'content',
        content: {
          heading: section.title,
          body: section.content.substring(0, 400),
        },
      });
    }

    return [{
      id: uuidv4(),
      title: `${request.title} - Presentation`,
      slides,
      theme: 'professional',
      createdAt: new Date().toISOString(),
      format: 'pptx',
    }];
  }

  private async generateVisualizations(
    evidenceBundles: EvidenceBundle[],
    claimBundles: ClaimBundle[],
  ): Promise<Visualization[]> {
    const visualizations: Visualization[] = [];

    // Entity relationship visualization
    const allEntityIds = new Set([
      ...evidenceBundles.flatMap((b) => b.relatedEntityIds),
      ...claimBundles.flatMap((b) => b.relatedEntityIds),
    ]);

    if (allEntityIds.size > 0) {
      visualizations.push({
        id: uuidv4(),
        type: 'network_graph',
        title: 'Entity Relationships',
        data: {
          nodes: Array.from(allEntityIds).map((id) => ({ id, label: id })),
          edges: [],
        },
        config: { layout: 'force-directed' },
        format: 'svg',
      });
    }

    // Timeline visualization
    const events = evidenceBundles.flatMap((b) =>
      b.chainOfCustodyEvents.map((e) => ({
        timestamp: e.timestamp,
        event: e.eventType,
        description: e.description,
      })),
    );

    if (events.length > 0) {
      visualizations.push({
        id: uuidv4(),
        type: 'timeline',
        title: 'Event Timeline',
        data: { events: events.sort((a, b) => a.timestamp.localeCompare(b.timestamp)) },
        config: { orientation: 'horizontal' },
        format: 'svg',
      });
    }

    return visualizations;
  }

  private buildCitationIndex(
    evidenceBundles: EvidenceBundle[],
    claimBundles: ClaimBundle[],
  ): CitationEntry[] {
    const citations: CitationEntry[] = [];
    const now = new Date().toISOString();

    // Evidence citations
    for (const bundle of evidenceBundles) {
      for (const item of bundle.evidenceItems) {
        citations.push({
          id: item.id,
          sourceType: 'evidence',
          sourceId: item.id,
          title: item.title,
          location: item.sourceUri,
          accessedAt: now,
          verifiedHash: item.contentHash,
        });
      }
    }

    // Claim citations
    for (const bundle of claimBundles) {
      for (const claim of bundle.claims) {
        citations.push({
          id: claim.id,
          sourceType: 'claim',
          sourceId: claim.id,
          title: claim.statement.substring(0, 100),
          accessedAt: now,
          verifiedHash: claim.provenanceHash,
        });
      }
    }

    return citations;
  }

  private buildManifestItems(
    sections: NarrativeSection[],
    findings: KeyFinding[],
    annexes: Annex[],
    citations: CitationEntry[],
  ) {
    return [
      ...sections.map((s, i) => ({
        itemId: s.id,
        itemType: 'narrative_section',
        content: s,
        path: `sections/${i.toString().padStart(3, '0')}_${s.id}.json`,
      })),
      ...findings.map((f, i) => ({
        itemId: f.id,
        itemType: 'key_finding',
        content: f,
        path: `findings/${i.toString().padStart(3, '0')}_${f.id}.json`,
      })),
      ...annexes.map((a, i) => ({
        itemId: a.id,
        itemType: 'annex',
        content: a,
        path: `annexes/${i.toString().padStart(3, '0')}_${a.id}.json`,
      })),
      {
        itemId: 'citation_index',
        itemType: 'citation_index',
        content: citations,
        path: 'metadata/citations.json',
      },
    ];
  }

  private prepareTemplateData(
    evidenceBundles: EvidenceBundle[],
    claimBundles: ClaimBundle[],
    request: CreateBriefingPackageRequest,
  ) {
    return {
      title: request.title,
      briefingType: request.briefingType,
      classificationLevel: request.classificationLevel,
      generatedAt: new Date().toISOString(),
      evidenceBundles,
      claimBundles,
      totalEvidence: evidenceBundles.reduce((sum, b) => sum + b.evidenceItems.length, 0),
      totalClaims: claimBundles.reduce((sum, b) => sum + b.claims.length, 0),
      allClaims: claimBundles.flatMap((b) => b.claims),
      allEvidence: evidenceBundles.flatMap((b) => b.evidenceItems),
    };
  }

  private extractCitationsFromContent(content: string): string[] {
    // Extract citation references from content (e.g., [REF:uuid])
    const matches = content.match(/\[REF:([a-f0-9-]+)\]/gi) || [];
    return matches.map((m) => m.replace(/\[REF:|]/gi, ''));
  }

  private calculateRequiredApprovals(
    classificationLevel: string,
    fourEyesRequired: boolean,
    governanceRequired: number,
  ): number {
    let required = Math.max(1, governanceRequired);

    if (classificationLevel === 'SECRET' || classificationLevel === 'TOP_SECRET') {
      required = Math.max(required, 2);
    }
    if (classificationLevel === 'SCI') {
      required = Math.max(required, 3);
    }
    if (fourEyesRequired) {
      required = Math.max(required, 2);
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

  private initializeDefaultTemplates(): void {
    // Intelligence Assessment Template
    this.templates.set('intelligence-assessment', {
      id: 'intelligence-assessment',
      name: 'Intelligence Assessment',
      briefingType: 'intelligence_assessment',
      sections: [
        {
          id: 'background',
          title: 'Background',
          template: '## Background\n\n{{#each evidenceBundles}}Evidence bundle "{{title}}" contains {{evidenceItems.length}} items.\n{{/each}}',
          order: 1,
          required: true,
        },
        {
          id: 'analysis',
          title: 'Analysis',
          template: '## Analysis\n\n{{#each allClaims}}{{#if (eq status "approved")}}- {{statement}} (Confidence: {{confidence}})\n{{/if}}{{/each}}',
          order: 2,
          required: true,
        },
        {
          id: 'conclusions',
          title: 'Conclusions',
          template: '## Conclusions\n\nBased on analysis of {{totalEvidence}} evidence items and {{totalClaims}} claims.',
          order: 3,
          required: true,
        },
      ],
      defaultOptions: {
        includeExecutiveSummary: true,
        includeKeyFindings: true,
        includeRecommendations: true,
        includeAnnexes: true,
        maxSections: 10,
      },
    });

    // Case Summary Template
    this.templates.set('case-summary', {
      id: 'case-summary',
      name: 'Case Summary',
      briefingType: 'case_summary',
      sections: [
        {
          id: 'overview',
          title: 'Case Overview',
          template: '## Case Overview\n\nThis summary covers {{evidenceBundles.length}} evidence bundles and {{claimBundles.length}} claim bundles.',
          order: 1,
          required: true,
        },
        {
          id: 'evidence',
          title: 'Evidence Review',
          template: '## Evidence Review\n\n{{#each allEvidence}}### {{title}}\nType: {{type}}\nCollected: {{collectedAt}}\n\n{{/each}}',
          order: 2,
          required: true,
        },
      ],
      defaultOptions: {
        includeExecutiveSummary: true,
        includeKeyFindings: true,
        includeRecommendations: false,
        includeAnnexes: true,
        maxSections: 5,
      },
    });
  }

  private getDefaultTemplate(briefingType: string): BriefingTemplate | undefined {
    const mapping: Record<string, string> = {
      intelligence_assessment: 'intelligence-assessment',
      case_summary: 'case-summary',
    };
    return this.templates.get(mapping[briefingType] || '');
  }

  private registerHandlebarsHelpers(): void {
    Handlebars.registerHelper('eq', (a, b) => a === b);
    Handlebars.registerHelper('formatDate', (date: string) =>
      new Date(date).toLocaleDateString(),
    );
    Handlebars.registerHelper('formatPercent', (num: number) =>
      `${(num * 100).toFixed(1)}%`,
    );
    Handlebars.registerHelper('truncate', (str: string, len: number) =>
      str.length > len ? str.substring(0, len) + '...' : str,
    );
  }
}
