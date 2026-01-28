
import { EntityResolutionService } from './EntityResolutionService';
import { OSINTEnrichmentService } from './OSINTEnrichmentService';
import { OSINTQuery } from './connectors/types';
import {
  OSINTProfile,
  Claim,
  Contradiction,
  VerificationResult,
  SocialMediaProfile,
  CorporateRecord,
  PublicRecord
} from './types';
import crypto from 'crypto';

/**
 * Generates Evidence IDs in the format E-YYYYMMDD-NNN.
 * Used for provenance tracking per governance requirements.
 */
function generateEvidenceId(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const seq = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `E-${dateStr}-${seq}`;
}

/**
 * Source reliability weights for confidence propagation.
 * Higher = more reliable.
 */
const SOURCE_RELIABILITY: Record<string, number> = {
  'corporate-registry': 0.9,
  'court-filing': 0.85,
  'property-deed': 0.85,
  'linkedin': 0.7,
  'github': 0.65,
  'twitter': 0.5,
  'facebook': 0.5,
  'instagram': 0.4,
  'voting-record': 0.8,
  'other': 0.3,
};

/**
 * ClaimExtractor: Extracts discrete claims from enrichment data.
 * Each claim is an independent assertion that can be verified separately.
 */
export class ClaimExtractor {
  private evidenceLog: Array<{ evidenceId: string; action: string; timestamp: string }> = [];

  /**
   * Extract claims from an OSINT profile's enrichment data.
   * Claims are subject-predicate-object triples with provenance.
   */
  extractFromProfile(profile: Partial<OSINTProfile>, subjectId: string): Claim[] {
    const claims: Claim[] = [];
    const timestamp = new Date().toISOString();

    // Extract claims from social profiles
    for (const social of profile.socialProfiles || []) {
      claims.push(...this.extractFromSocialProfile(social, subjectId, timestamp));
    }

    // Extract claims from corporate records
    for (const corp of profile.corporateRecords || []) {
      claims.push(...this.extractFromCorporateRecord(corp, subjectId, timestamp));
    }

    // Extract claims from public records
    for (const pub of profile.publicRecords || []) {
      claims.push(...this.extractFromPublicRecord(pub, subjectId, timestamp));
    }

    // Log evidence for provenance
    const evidenceId = generateEvidenceId();
    this.evidenceLog.push({
      evidenceId,
      action: `extracted_${claims.length}_claims`,
      timestamp
    });

    return claims;
  }

  private extractFromSocialProfile(
    social: SocialMediaProfile,
    subjectId: string,
    timestamp: string
  ): Claim[] {
    const claims: Claim[] = [];
    const sourceId = `social:${social.platform}:${social.username}`;
    const reliability = SOURCE_RELIABILITY[social.platform] || 0.5;

    // Claim: entity has username on platform
    claims.push({
      id: crypto.randomUUID(),
      sourceId,
      subject: subjectId,
      predicate: 'has_social_account',
      object: { platform: social.platform, username: social.username, url: social.url },
      confidence: reliability,
      timestamp,
    });

    // Claim: display name (if available)
    if (social.displayName) {
      claims.push({
        id: crypto.randomUUID(),
        sourceId,
        subject: subjectId,
        predicate: 'known_as',
        object: social.displayName,
        confidence: reliability * 0.9,
        timestamp,
      });
    }

    // Claim: last active (temporal claim)
    if (social.lastActive) {
      claims.push({
        id: crypto.randomUUID(),
        sourceId,
        subject: subjectId,
        predicate: 'was_active_on_platform',
        object: { platform: social.platform, date: social.lastActive },
        confidence: reliability,
        timestamp,
        validFrom: social.lastActive,
      });
    }

    return claims;
  }

  private extractFromCorporateRecord(
    corp: CorporateRecord,
    subjectId: string,
    timestamp: string
  ): Claim[] {
    const claims: Claim[] = [];
    const sourceId = `corporate:${corp.jurisdiction || 'unknown'}:${corp.registrationNumber || corp.companyName}`;
    const reliability = SOURCE_RELIABILITY['corporate-registry'];

    // Claim: company exists
    claims.push({
      id: crypto.randomUUID(),
      sourceId,
      subject: subjectId,
      predicate: 'is_registered_company',
      object: {
        name: corp.companyName,
        jurisdiction: corp.jurisdiction,
        registrationNumber: corp.registrationNumber,
      },
      confidence: reliability,
      timestamp,
      validFrom: corp.incorporationDate,
    });

    // Claim: company status
    if (corp.status) {
      claims.push({
        id: crypto.randomUUID(),
        sourceId,
        subject: subjectId,
        predicate: 'has_status',
        object: corp.status,
        confidence: reliability,
        timestamp,
      });
    }

    // Claims: officers
    for (const officer of corp.officers || []) {
      claims.push({
        id: crypto.randomUUID(),
        sourceId,
        subject: subjectId,
        predicate: 'has_officer',
        object: { name: officer.name, role: officer.role },
        confidence: reliability * 0.95,
        timestamp,
      });
    }

    return claims;
  }

  private extractFromPublicRecord(
    pub: PublicRecord,
    subjectId: string,
    timestamp: string
  ): Claim[] {
    const claims: Claim[] = [];
    const sourceId = `public:${pub.source}:${pub.recordType}`;
    const reliability = SOURCE_RELIABILITY[pub.recordType] || SOURCE_RELIABILITY['other'];

    claims.push({
      id: crypto.randomUUID(),
      sourceId,
      subject: subjectId,
      predicate: `has_${pub.recordType}`,
      object: pub.details,
      confidence: reliability,
      timestamp,
      validFrom: pub.date,
    });

    return claims;
  }

  getEvidenceLog() {
    return [...this.evidenceLog];
  }
}

/**
 * ContradictionDetector: Identifies conflicting claims.
 * Implements "contradiction-first automation" per METHODOLOGY_UPDATE_05.
 */
export class ContradictionDetector {
  /**
   * Detect contradictions between claims about the same subject.
   * Returns a list of contradiction records with severity assessment.
   */
  detectContradictions(claims: Claim[]): Contradiction[] {
    const contradictions: Contradiction[] = [];
    const timestamp = new Date().toISOString();

    // Group claims by subject
    const bySubject = new Map<string, Claim[]>();
    for (const claim of claims) {
      const existing = bySubject.get(claim.subject) || [];
      existing.push(claim);
      bySubject.set(claim.subject, existing);
    }

    // Check for contradictions within each subject
    for (const [_subject, subjectClaims] of bySubject) {
      // Check status contradictions
      const statusClaims = subjectClaims.filter(c => c.predicate === 'has_status');
      contradictions.push(...this.checkStatusContradictions(statusClaims, timestamp));

      // Check temporal contradictions (validFrom/validTo overlaps)
      contradictions.push(...this.checkTemporalContradictions(subjectClaims, timestamp));

      // Check identity contradictions (conflicting known_as claims from different sources)
      const nameClaims = subjectClaims.filter(c => c.predicate === 'known_as');
      contradictions.push(...this.checkIdentityContradictions(nameClaims, timestamp));
    }

    return contradictions;
  }

  private checkStatusContradictions(statusClaims: Claim[], timestamp: string): Contradiction[] {
    const contradictions: Contradiction[] = [];

    for (let i = 0; i < statusClaims.length; i++) {
      for (let j = i + 1; j < statusClaims.length; j++) {
        const claimA = statusClaims[i];
        const claimB = statusClaims[j];

        // Different sources reporting different statuses
        if (claimA.sourceId !== claimB.sourceId && claimA.object !== claimB.object) {
          contradictions.push({
            id: crypto.randomUUID(),
            claimIdA: claimA.id,
            claimIdB: claimB.id,
            reason: `Conflicting status: "${claimA.object}" vs "${claimB.object}"`,
            detectedAt: timestamp,
            severity: this.assessSeverity(claimA, claimB),
          });
        }
      }
    }

    return contradictions;
  }

  private checkTemporalContradictions(claims: Claim[], timestamp: string): Contradiction[] {
    const contradictions: Contradiction[] = [];

    // Find claims with temporal bounds that might conflict
    const temporalClaims = claims.filter(c => c.validFrom || c.validTo);

    for (let i = 0; i < temporalClaims.length; i++) {
      for (let j = i + 1; j < temporalClaims.length; j++) {
        const claimA = temporalClaims[i];
        const claimB = temporalClaims[j];

        // Same predicate, overlapping time periods, but different objects
        if (
          claimA.predicate === claimB.predicate &&
          claimA.sourceId !== claimB.sourceId &&
          this.periodsOverlap(claimA, claimB) &&
          JSON.stringify(claimA.object) !== JSON.stringify(claimB.object)
        ) {
          contradictions.push({
            id: crypto.randomUUID(),
            claimIdA: claimA.id,
            claimIdB: claimB.id,
            reason: `Temporal overlap with conflicting data for ${claimA.predicate}`,
            detectedAt: timestamp,
            severity: 'medium',
          });
        }
      }
    }

    return contradictions;
  }

  private checkIdentityContradictions(nameClaims: Claim[], timestamp: string): Contradiction[] {
    const contradictions: Contradiction[] = [];

    // Different high-confidence sources reporting very different names
    for (let i = 0; i < nameClaims.length; i++) {
      for (let j = i + 1; j < nameClaims.length; j++) {
        const claimA = nameClaims[i];
        const claimB = nameClaims[j];

        if (
          claimA.sourceId !== claimB.sourceId &&
          claimA.confidence > 0.6 &&
          claimB.confidence > 0.6 &&
          !this.namesAreSimilar(String(claimA.object), String(claimB.object))
        ) {
          contradictions.push({
            id: crypto.randomUUID(),
            claimIdA: claimA.id,
            claimIdB: claimB.id,
            reason: `Identity conflict: "${claimA.object}" vs "${claimB.object}"`,
            detectedAt: timestamp,
            severity: 'high',
          });
        }
      }
    }

    return contradictions;
  }

  private periodsOverlap(claimA: Claim, claimB: Claim): boolean {
    const aStart = claimA.validFrom ? new Date(claimA.validFrom).getTime() : 0;
    const aEnd = claimA.validTo ? new Date(claimA.validTo).getTime() : Date.now();
    const bStart = claimB.validFrom ? new Date(claimB.validFrom).getTime() : 0;
    const bEnd = claimB.validTo ? new Date(claimB.validTo).getTime() : Date.now();

    return aStart <= bEnd && bStart <= aEnd;
  }

  private namesAreSimilar(nameA: string, nameB: string): boolean {
    // Simple similarity check - normalize and compare
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
    const a = normalize(nameA);
    const b = normalize(nameB);

    // Check if one contains the other or they're very similar
    return a.includes(b) || b.includes(a) || a === b;
  }

  private assessSeverity(claimA: Claim, claimB: Claim): 'low' | 'medium' | 'high' {
    const avgConfidence = (claimA.confidence + claimB.confidence) / 2;
    if (avgConfidence > 0.8) return 'high';
    if (avgConfidence > 0.5) return 'medium';
    return 'low';
  }
}

/**
 * ClaimValidator: Performs cross-source verification and confidence propagation.
 * Implements "claim-centric validation" per METHODOLOGY_UPDATE_05.
 */
export class ClaimValidator {
  private verifierId = 'osint-pipeline-validator';

  /**
   * Validate claims by cross-referencing sources and propagating confidence.
   * Returns claims with updated confidence scores and verification history.
   */
  async validate(
    claims: Claim[],
    contradictions: Contradiction[]
  ): Promise<Claim[]> {
    const validatedClaims: Claim[] = [];
    const contradictedClaimIds = new Set<string>();

    // Mark claims involved in contradictions
    for (const c of contradictions) {
      contradictedClaimIds.add(c.claimIdA);
      contradictedClaimIds.add(c.claimIdB);
    }

    // Group claims by subject+predicate for corroboration
    const claimGroups = new Map<string, Claim[]>();
    for (const claim of claims) {
      const key = `${claim.subject}:${claim.predicate}`;
      const group = claimGroups.get(key) || [];
      group.push(claim);
      claimGroups.set(key, group);
    }

    for (const claim of claims) {
      const key = `${claim.subject}:${claim.predicate}`;
      const group = claimGroups.get(key) || [claim];

      // Calculate corroboration boost
      const corroborationCount = this.countCorroborations(claim, group);
      const corroborationBoost = Math.min(corroborationCount * 0.1, 0.3);

      // Calculate recency factor (more recent = higher weight)
      const recencyFactor = this.calculateRecencyFactor(claim);

      // Apply confidence propagation formula:
      // finalConfidence = baseConfidence × recencyFactor + corroborationBoost
      let adjustedConfidence = claim.confidence * recencyFactor + corroborationBoost;

      // Penalize contradicted claims
      if (contradictedClaimIds.has(claim.id)) {
        adjustedConfidence *= 0.7; // 30% penalty for contradictions
      }

      // Clamp to [0, 1]
      adjustedConfidence = Math.max(0, Math.min(1, adjustedConfidence));

      const verificationResult: VerificationResult = {
        verifierId: this.verifierId,
        timestamp: new Date().toISOString(),
        status: this.determineStatus(adjustedConfidence, contradictedClaimIds.has(claim.id)),
        confidenceDelta: adjustedConfidence - claim.confidence,
        evidence: [generateEvidenceId()],
      };

      validatedClaims.push({
        ...claim,
        confidence: adjustedConfidence,
        verificationHistory: [...(claim.verificationHistory || []), verificationResult],
      });
    }

    return validatedClaims;
  }

  private countCorroborations(claim: Claim, group: Claim[]): number {
    // Count claims from different sources that agree with this claim
    let count = 0;
    for (const other of group) {
      if (
        other.id !== claim.id &&
        other.sourceId !== claim.sourceId &&
        this.claimsAgree(claim, other)
      ) {
        count++;
      }
    }
    return count;
  }

  private claimsAgree(claimA: Claim, claimB: Claim): boolean {
    // Simple agreement check - same predicate and similar object
    if (claimA.predicate !== claimB.predicate) return false;

    const objA = JSON.stringify(claimA.object);
    const objB = JSON.stringify(claimB.object);

    // Exact match or partial match for string objects
    if (objA === objB) return true;
    if (typeof claimA.object === 'string' && typeof claimB.object === 'string') {
      return claimA.object.toLowerCase().includes(claimB.object.toLowerCase()) ||
             claimB.object.toLowerCase().includes(claimA.object.toLowerCase());
    }

    return false;
  }

  private calculateRecencyFactor(claim: Claim): number {
    const claimDate = new Date(claim.timestamp).getTime();
    const now = Date.now();
    const ageInDays = (now - claimDate) / (1000 * 60 * 60 * 24);

    // Decay factor: 1.0 for today, decreasing over time
    // Claims older than 365 days get minimum factor of 0.5
    return Math.max(0.5, 1 - (ageInDays / 730));
  }

  private determineStatus(
    confidence: number,
    isContradicted: boolean
  ): 'confirmed' | 'refuted' | 'uncertain' {
    if (isContradicted) return 'uncertain';
    if (confidence >= 0.8) return 'confirmed';
    if (confidence <= 0.3) return 'refuted';
    return 'uncertain';
  }
}

export class OSINTPipeline {
  private resolutionService: EntityResolutionService;
  private enrichmentService: OSINTEnrichmentService;
  private claimExtractor: ClaimExtractor;
  private contradictionDetector: ContradictionDetector;
  private claimValidator: ClaimValidator;

  /** Confidence threshold below which Risk Monitor agent is triggered */
  private readonly RISK_MONITOR_THRESHOLD = 0.4;

  constructor() {
    this.resolutionService = new EntityResolutionService();
    this.enrichmentService = new OSINTEnrichmentService();
    this.claimExtractor = new ClaimExtractor();
    this.contradictionDetector = new ContradictionDetector();
    this.claimValidator = new ClaimValidator();
  }

  async process(query: OSINTQuery, tenantId: string): Promise<OSINTProfile> {
    const processingEvidenceId = generateEvidenceId();
    console.log(`[OSINT Pipeline] Starting processing for: ${JSON.stringify(query)} (Evidence: ${processingEvidenceId})`);

    // 1. Initial Search/Enrichment to get candidates
    const initialEnrichment = await this.enrichmentService.enrich(query);

    // Generate a temporary subject ID for claim extraction
    const tempSubjectId = crypto.randomUUID();

    // [Automation Turn #5 Implementation - Claim-Centric Validation]
    // Step 1: Extract discrete Claims from enrichment results
    const claims = this.claimExtractor.extractFromProfile(initialEnrichment, tempSubjectId);
    console.log(`[OSINT Pipeline] Extracted ${claims.length} claims from enrichment data`);

    // Step 2: Detect contradictions (contradiction-first automation)
    const contradictions = this.contradictionDetector.detectContradictions(claims);
    if (contradictions.length > 0) {
      console.log(`[OSINT Pipeline] Detected ${contradictions.length} contradictions`);
      for (const c of contradictions) {
        console.log(`  - [${c.severity.toUpperCase()}] ${c.reason}`);
      }
    }

    // Step 3: Validate claims with cross-source verification and confidence propagation
    const validatedClaims = await this.claimValidator.validate(claims, contradictions);

    // Step 4: Calculate aggregate confidence from validated claims
    const aggregateConfidence = this.calculateAggregateConfidence(validatedClaims);

    // Step 5: Check if Risk Monitor agent should be triggered
    if (aggregateConfidence < this.RISK_MONITOR_THRESHOLD) {
      console.log(`[OSINT Pipeline] LOW CONFIDENCE (${aggregateConfidence.toFixed(2)}) - Risk Monitor trigger recommended`);
      // In production, this would emit an event to the Risk Monitor agent
    }

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
      claims: validatedClaims,
      contradictions: contradictions,
      confidenceScore: aggregateConfidence,
    };

    // 2. Entity Resolution / Deduplication
    const existing = await this.resolutionService.resolve(candidateProfile);

    let finalProfile: OSINTProfile;

    if (existing) {
      console.log(`[OSINT Pipeline] Found existing profile: ${existing.id}. Merging.`);
      finalProfile = this.resolutionService.merge(existing, candidateProfile);
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
        confidenceScore: candidateProfile.confidenceScore || 0,
        lastEnrichedAt: new Date().toISOString(),
        claims: candidateProfile.claims || [],
        contradictions: candidateProfile.contradictions || [],
      };
    }

    // 3. Save Unified Profile
    await this.resolutionService.save(finalProfile);

    // Log provenance for audit trail
    const evidenceLog = this.claimExtractor.getEvidenceLog();
    console.log(`[OSINT Pipeline] Provenance trail: ${evidenceLog.length} evidence records`);

    console.log(`[OSINT Pipeline] Processing complete. Profile ID: ${finalProfile.id}, Confidence: ${finalProfile.confidenceScore.toFixed(2)}`);
    return finalProfile;
  }

  /**
   * Calculate aggregate confidence score from validated claims.
   * Uses weighted average based on claim confidence and source reliability.
   */
  private calculateAggregateConfidence(claims: Claim[]): number {
    if (claims.length === 0) return 0;

    // Weight confirmed claims higher
    let weightedSum = 0;
    let totalWeight = 0;

    for (const claim of claims) {
      const lastVerification = claim.verificationHistory?.[claim.verificationHistory.length - 1];
      let weight = 1;

      if (lastVerification) {
        switch (lastVerification.status) {
          case 'confirmed':
            weight = 1.5;
            break;
          case 'uncertain':
            weight = 0.8;
            break;
          case 'refuted':
            weight = 0.3;
            break;
        }
      }

      weightedSum += claim.confidence * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Get claims that are below the confidence threshold.
   * Used by Risk Monitor agent to identify areas needing investigation.
   */
  getLowConfidenceClaims(profile: OSINTProfile, threshold = 0.5): Claim[] {
    return (profile.claims || []).filter(c => c.confidence < threshold);
  }

  /**
   * Get all high-severity contradictions for a profile.
   * Used to surface critical conflicts requiring analyst attention.
   */
  getCriticalContradictions(profile: OSINTProfile): Contradiction[] {
    return (profile.contradictions || []).filter(c => c.severity === 'high');
  }
}
