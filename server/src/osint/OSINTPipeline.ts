
import { EntityResolutionService } from './EntityResolutionService';
import { OSINTEnrichmentService } from './OSINTEnrichmentService';
import { ClaimExtractor } from './ClaimExtractor';
import { ClaimValidator } from './ClaimValidator';
import { ContradictionDetector } from './ContradictionDetector';
import { OSINTQuery } from './connectors/types';
import { OSINTProfile, Claim, Contradiction } from './types';
import crypto from 'crypto';

export class OSINTPipeline {
  private resolutionService: EntityResolutionService;
  private enrichmentService: OSINTEnrichmentService;
  private claimExtractor: ClaimExtractor;
  private claimValidator: ClaimValidator;
  private contradictionDetector: ContradictionDetector;

  constructor() {
    this.resolutionService = new EntityResolutionService();
    this.enrichmentService = new OSINTEnrichmentService();
    this.claimExtractor = new ClaimExtractor();
    this.claimValidator = new ClaimValidator();
    this.contradictionDetector = new ContradictionDetector();
  }

  async process(query: OSINTQuery, tenantId: string): Promise<OSINTProfile> {
    console.log(`[OSINT Pipeline] Starting processing for: ${JSON.stringify(query)}`);

    // 1. Initial Search/Enrichment to get candidates
    const initialEnrichment = await this.enrichmentService.enrich(query);

    // [Automation Turn #5 Implementation - Claim-Centric Validation]
    // Step 1: Extract discrete Claims from enrichment results
    const rawClaims = this.claimExtractor.extract(initialEnrichment.results || []);
    console.log(`[OSINT Pipeline] Extracted ${rawClaims.length} claims from enrichment`);

    // Step 2: Perform Claim-Centric Validation (independent of source trust)
    const validatedClaims = await this.claimValidator.validate(rawClaims);
    console.log(`[OSINT Pipeline] Validated ${validatedClaims.length} claims`);

    // Step 3: Check for Contradictions (temporal overlaps, conflicting data)
    const contradictions = this.contradictionDetector.detect(validatedClaims);
    if (contradictions.length > 0) {
      console.log(`[OSINT Pipeline] Detected ${contradictions.length} contradictions`);
    }

    // Step 4: Calculate aggregate confidence from validated claims
    const aggregateConfidence = this.calculateAggregateConfidence(validatedClaims, contradictions);

    // Prepare a temporary profile for matching
    const candidateProfile: Partial<OSINTProfile> = {
      tenantId,
      kind: query.companyName ? 'organization' : 'person',
      ...initialEnrichment,
      properties: {
        name: query.name || query.companyName || query.username,
        ...query,
        ...(initialEnrichment.properties || {})
      },
    };

    // 2. Entity Resolution / Deduplication
    const existing = await this.resolutionService.resolve(candidateProfile);

    let finalProfile: OSINTProfile;

    if (existing) {
      console.log(`[OSINT Pipeline] Found existing profile: ${existing.id}. Merging.`);
      finalProfile = this.resolutionService.merge(existing, candidateProfile);
      // Merge claims and contradictions with existing
      finalProfile.claims = this.mergeClaims(existing.claims || [], validatedClaims);
      finalProfile.contradictions = this.mergeContradictions(
        existing.contradictions || [],
        contradictions
      );
      finalProfile.confidenceScore = aggregateConfidence;
    } else {
      console.log(`[OSINT Pipeline] No existing profile found. Creating new.`);
      finalProfile = {
        id: crypto.randomUUID(),
        tenantId,
        kind: candidateProfile.kind || 'person',
        properties: candidateProfile.properties || {},
        externalRefs: candidateProfile.externalRefs || [],
        labels: candidateProfile.labels || [],
        sourceIds: ['osint-pipeline'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        socialProfiles: candidateProfile.socialProfiles || [],
        corporateRecords: candidateProfile.corporateRecords || [],
        publicRecords: candidateProfile.publicRecords || [],
        confidenceScore: aggregateConfidence,
        lastEnrichedAt: new Date().toISOString(),
        claims: validatedClaims,
        contradictions: contradictions,
      };
    }

    // 3. Save Unified Profile
    await this.resolutionService.save(finalProfile);

    console.log(`[OSINT Pipeline] Processing complete. Profile ID: ${finalProfile.id}`);
    console.log(`[OSINT Pipeline] Claims: ${finalProfile.claims?.length || 0}, Contradictions: ${finalProfile.contradictions?.length || 0}`);
    return finalProfile;
  }

  /**
   * Calculate aggregate confidence from validated claims, penalizing for contradictions.
   */
  private calculateAggregateConfidence(claims: Claim[], contradictions: Contradiction[]): number {
    if (claims.length === 0) return 0;

    // Base confidence: weighted average of claim confidences
    const totalConfidence = claims.reduce((sum, claim) => sum + claim.confidence, 0);
    let aggregateConfidence = totalConfidence / claims.length;

    // Apply contradiction penalty
    const contradictionPenalty = contradictions.reduce((penalty, c) => {
      switch (c.severity) {
        case 'high': return penalty + 0.15;
        case 'medium': return penalty + 0.08;
        case 'low': return penalty + 0.03;
        default: return penalty;
      }
    }, 0);

    aggregateConfidence = Math.max(0, aggregateConfidence - contradictionPenalty);

    return Math.round(aggregateConfidence * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Merge new claims with existing claims, avoiding duplicates.
   */
  private mergeClaims(existing: Claim[], incoming: Claim[]): Claim[] {
    const claimMap = new Map<string, Claim>();

    // Add existing claims
    for (const claim of existing) {
      claimMap.set(claim.id, claim);
    }

    // Add or update with incoming claims
    for (const claim of incoming) {
      const existingClaim = claimMap.get(claim.id);
      if (existingClaim) {
        // Merge verification histories
        claimMap.set(claim.id, {
          ...claim,
          verificationHistory: [
            ...(existingClaim.verificationHistory || []),
            ...(claim.verificationHistory || []),
          ],
        });
      } else {
        claimMap.set(claim.id, claim);
      }
    }

    return Array.from(claimMap.values());
  }

  /**
   * Merge contradictions, avoiding duplicates.
   */
  private mergeContradictions(
    existing: Contradiction[],
    incoming: Contradiction[]
  ): Contradiction[] {
    const contradictionMap = new Map<string, Contradiction>();

    for (const c of existing) {
      contradictionMap.set(c.id, c);
    }

    for (const c of incoming) {
      if (!contradictionMap.has(c.id)) {
        contradictionMap.set(c.id, c);
      }
    }

    return Array.from(contradictionMap.values());
  }
}
