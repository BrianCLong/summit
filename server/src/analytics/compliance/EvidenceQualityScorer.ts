/**
 * Evidence Quality Scorer
 *
 * ML-powered assessment of compliance evidence quality.
 * Evaluates completeness, freshness, relevance, and credibility.
 *
 * SOC 2 Controls: CC3.4 (Evidence Documentation), CC4.2 (Evidence Retention)
 *
 * @module analytics/compliance/EvidenceQualityScorer
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import {
  GovernanceResult,
  DataClassification,
  createDataEnvelope,
} from '../../types/data-envelope.js';
import type {
  DataEnvelope,
  GovernanceVerdict,
} from '../../types/data-envelope.js';
import logger from '../../utils/logger.js';
import type { ComplianceFramework } from './CompliancePredictionEngine.js';

// ============================================================================
// Types
// ============================================================================

export type EvidenceType =
  | 'document'
  | 'screenshot'
  | 'log_export'
  | 'configuration'
  | 'attestation'
  | 'automated_scan'
  | 'audit_report'
  | 'policy_document'
  | 'training_record'
  | 'access_review';

export type QualityDimension =
  | 'completeness'
  | 'freshness'
  | 'relevance'
  | 'credibility'
  | 'traceability'
  | 'consistency';

export interface Evidence {
  id: string;
  tenantId: string;
  controlId: string;
  type: EvidenceType;
  title: string;
  description: string;
  sourceSystem: string;
  collectedAt: Date;
  collectionMethod: 'automated' | 'manual' | 'hybrid';
  metadata: Record<string, unknown>;
  attachments: EvidenceAttachment[];
  reviewStatus: 'pending' | 'reviewed' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
}

export interface EvidenceAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  checksum: string;
  uploadedAt: Date;
}

export interface QualityScore {
  id: string;
  evidenceId: string;
  tenantId: string;
  controlId: string;
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  dimensions: DimensionScore[];
  findings: QualityFinding[];
  recommendations: string[];
  scoredAt: string;
  expiresAt: string;
  governanceVerdict: GovernanceVerdict;
}

export interface DimensionScore {
  dimension: QualityDimension;
  score: number;
  weight: number;
  contribution: number;
  details: string;
}

export interface QualityFinding {
  dimension: QualityDimension;
  severity: 'critical' | 'major' | 'minor' | 'info';
  finding: string;
  recommendation: string;
}

export interface ControlEvidenceAssessment {
  controlId: string;
  controlName: string;
  evidenceCount: number;
  averageQuality: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  hasGaps: boolean;
  gaps: EvidenceGap[];
  strengths: string[];
  weaknesses: string[];
  requiredEvidenceTypes: EvidenceType[];
  presentEvidenceTypes: EvidenceType[];
  missingEvidenceTypes: EvidenceType[];
}

export interface EvidenceGap {
  gapType: 'missing_type' | 'stale' | 'low_quality' | 'incomplete';
  description: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedAction: string;
}

export interface BatchScoreResult {
  tenantId: string;
  framework: ComplianceFramework;
  totalEvidence: number;
  averageQuality: number;
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  byControl: ControlEvidenceAssessment[];
  byType: Record<EvidenceType, { count: number; avgQuality: number }>;
  qualityDistribution: Record<string, number>;
  scoredAt: string;
  governanceVerdict: GovernanceVerdict;
}

export interface ScorerConfig {
  /** Weight for completeness dimension */
  completenessWeight: number;
  /** Weight for freshness dimension */
  freshnessWeight: number;
  /** Weight for relevance dimension */
  relevanceWeight: number;
  /** Weight for credibility dimension */
  credibilityWeight: number;
  /** Weight for traceability dimension */
  traceabilityWeight: number;
  /** Weight for consistency dimension */
  consistencyWeight: number;
  /** Days before evidence is considered stale */
  staleDays: number;
  /** Minimum required attachments */
  minAttachments: number;
  /** Minimum description length */
  minDescriptionLength: number;
  /** Score expiration in days */
  scoreExpirationDays: number;
}

export interface ScorerStats {
  totalScored: number;
  averageScore: number;
  byGrade: Record<string, number>;
  byDimension: Record<QualityDimension, number>;
  lastScoredAt: string | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

function createVerdict(result: GovernanceResult, reason?: string): GovernanceVerdict {
  return {
    verdictId: `verdict-${uuidv4()}`,
    policyId: 'evidence-quality-policy',
    result,
    decidedAt: new Date(),
    reason,
    evaluator: 'EvidenceQualityScorer',
  };
}

function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: ScorerConfig = {
  completenessWeight: 0.25,
  freshnessWeight: 0.20,
  relevanceWeight: 0.20,
  credibilityWeight: 0.15,
  traceabilityWeight: 0.10,
  consistencyWeight: 0.10,
  staleDays: 90,
  minAttachments: 1,
  minDescriptionLength: 50,
  scoreExpirationDays: 30,
};

// ============================================================================
// Control Requirements Registry
// ============================================================================

class ControlRequirementsRegistry {
  private requirements: Map<string, EvidenceType[]> = new Map();

  constructor() {
    // Initialize with common control requirements
    this.requirements.set('access_control', [
      'configuration', 'log_export', 'access_review', 'policy_document',
    ]);
    this.requirements.set('security_monitoring', [
      'log_export', 'automated_scan', 'configuration',
    ]);
    this.requirements.set('change_management', [
      'document', 'log_export', 'attestation',
    ]);
    this.requirements.set('incident_response', [
      'policy_document', 'document', 'training_record',
    ]);
    this.requirements.set('data_protection', [
      'configuration', 'automated_scan', 'policy_document',
    ]);
    this.requirements.set('vendor_management', [
      'document', 'attestation', 'audit_report',
    ]);
  }

  getRequiredTypes(controlId: string): EvidenceType[] {
    // Try exact match first
    if (this.requirements.has(controlId)) {
      return this.requirements.get(controlId)!;
    }

    // Try category match
    for (const [key, types] of this.requirements) {
      if (controlId.toLowerCase().includes(key)) {
        return types;
      }
    }

    // Default requirements
    return ['document', 'screenshot'];
  }
}

// ============================================================================
// Dimension Scorers
// ============================================================================

class CompletenessScorer {
  private config: ScorerConfig;
  private registry: ControlRequirementsRegistry;

  constructor(config: ScorerConfig, registry: ControlRequirementsRegistry) {
    this.config = config;
    this.registry = registry;
  }

  score(evidence: Evidence): DimensionScore {
    let score = 100;
    const findings: string[] = [];

    // Check description length
    if (evidence.description.length < this.config.minDescriptionLength) {
      score -= 25;
      findings.push('Description is too brief');
    }

    // Check attachments
    if (evidence.attachments.length < this.config.minAttachments) {
      score -= 30;
      findings.push('Missing required attachments');
    }

    // Check metadata completeness
    const requiredMetadata = ['source', 'collector', 'period'];
    const missingMetadata = requiredMetadata.filter(
      key => !evidence.metadata[key]
    );
    if (missingMetadata.length > 0) {
      score -= missingMetadata.length * 10;
      findings.push(`Missing metadata: ${missingMetadata.join(', ')}`);
    }

    // Check review status
    if (evidence.reviewStatus === 'pending') {
      score -= 15;
      findings.push('Evidence not yet reviewed');
    }

    return {
      dimension: 'completeness',
      score: Math.max(0, score),
      weight: this.config.completenessWeight,
      contribution: Math.max(0, score) * this.config.completenessWeight,
      details: findings.length > 0 ? findings.join('; ') : 'Complete',
    };
  }
}

class FreshnessScorer {
  private config: ScorerConfig;

  constructor(config: ScorerConfig) {
    this.config = config;
  }

  score(evidence: Evidence): DimensionScore {
    const daysSinceCollection = Math.floor(
      (Date.now() - evidence.collectedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    let score: number;
    let details: string;

    if (daysSinceCollection <= 30) {
      score = 100;
      details = 'Evidence is fresh';
    } else if (daysSinceCollection <= 60) {
      score = 80;
      details = `Collected ${daysSinceCollection} days ago`;
    } else if (daysSinceCollection <= this.config.staleDays) {
      score = 60;
      details = `Evidence aging (${daysSinceCollection} days)`;
    } else if (daysSinceCollection <= this.config.staleDays * 1.5) {
      score = 40;
      details = `Evidence stale (${daysSinceCollection} days)`;
    } else {
      score = 20;
      details = `Evidence critically stale (${daysSinceCollection} days)`;
    }

    return {
      dimension: 'freshness',
      score,
      weight: this.config.freshnessWeight,
      contribution: score * this.config.freshnessWeight,
      details,
    };
  }
}

class RelevanceScorer {
  constructor(private config: ScorerConfig) { }

  score(evidence: Evidence): DimensionScore {
    let score = 100;
    const findings: string[] = [];

    // Type appropriateness
    const appropriateTypes: Record<string, EvidenceType[]> = {
      access_control: ['configuration', 'log_export', 'access_review'],
      security: ['automated_scan', 'log_export', 'configuration'],
      policy: ['policy_document', 'document', 'attestation'],
    };

    let typeRelevant = false;
    for (const [category, types] of Object.entries(appropriateTypes)) {
      if (evidence.controlId.toLowerCase().includes(category)) {
        if (types.includes(evidence.type)) {
          typeRelevant = true;
        }
      }
    }

    if (!typeRelevant && evidence.controlId) {
      // If no match found, give benefit of doubt with minor penalty
      score -= 10;
      findings.push('Evidence type may not be optimal for this control');
    }

    // Collection method relevance
    if (evidence.collectionMethod === 'automated') {
      score += 5; // Bonus for automation (capped at 100)
    }

    // Check if description mentions control-relevant terms
    const controlKeywords = evidence.controlId.toLowerCase().split('_');
    const descriptionLower = evidence.description.toLowerCase();
    const keywordMatches = controlKeywords.filter(
      kw => kw.length > 3 && descriptionLower.includes(kw)
    );

    if (keywordMatches.length === 0 && evidence.controlId) {
      score -= 15;
      findings.push('Description may not align with control requirements');
    }

    return {
      dimension: 'relevance',
      score: Math.min(100, Math.max(0, score)),
      weight: this.config.relevanceWeight,
      contribution: Math.min(100, Math.max(0, score)) * this.config.relevanceWeight,
      details: findings.length > 0 ? findings.join('; ') : 'Relevant',
    };
  }
}

class CredibilityScorer {
  constructor(private config: ScorerConfig) { }

  score(evidence: Evidence): DimensionScore {
    let score = 100;
    const findings: string[] = [];

    // Source system credibility
    const trustedSources = ['aws', 'azure', 'gcp', 'splunk', 'datadog', 'okta', 'github'];
    const sourceLower = evidence.sourceSystem.toLowerCase();
    const isTrusted = trustedSources.some(ts => sourceLower.includes(ts));

    if (!isTrusted && evidence.collectionMethod !== 'automated') {
      score -= 10;
      findings.push('Source system not in trusted list');
    }

    // Collection method credibility
    if (evidence.collectionMethod === 'automated') {
      // Automated is most credible
    } else if (evidence.collectionMethod === 'hybrid') {
      score -= 5;
    } else {
      score -= 15;
      findings.push('Manual collection reduces credibility');
    }

    // Review status
    if (evidence.reviewStatus === 'approved') {
      // Maximum credibility
    } else if (evidence.reviewStatus === 'reviewed') {
      score -= 5;
    } else if (evidence.reviewStatus === 'rejected') {
      score -= 50;
      findings.push('Evidence was previously rejected');
    } else {
      score -= 10;
      findings.push('Evidence pending review');
    }

    // Attachment integrity
    const hasIntegrity = evidence.attachments.every(a => a.checksum);
    if (!hasIntegrity && evidence.attachments.length > 0) {
      score -= 10;
      findings.push('Some attachments lack integrity verification');
    }

    return {
      dimension: 'credibility',
      score: Math.max(0, score),
      weight: this.config.credibilityWeight,
      contribution: Math.max(0, score) * this.config.credibilityWeight,
      details: findings.length > 0 ? findings.join('; ') : 'Credible',
    };
  }
}

class TraceabilityScorer {
  constructor(private config: ScorerConfig) { }

  score(evidence: Evidence): DimensionScore {
    let score = 100;
    const findings: string[] = [];

    // Check for source traceability
    if (!evidence.sourceSystem) {
      score -= 30;
      findings.push('No source system specified');
    }

    // Check metadata for traceability
    const traceabilityFields = ['requestId', 'transactionId', 'auditTrail', 'source_url'];
    const hasTraceability = traceabilityFields.some(
      field => evidence.metadata[field]
    );

    if (!hasTraceability) {
      score -= 20;
      findings.push('Limited traceability metadata');
    }

    // Attachment traceability
    for (const attachment of evidence.attachments) {
      if (!attachment.checksum) {
        score -= 5;
        findings.push(`Attachment ${attachment.fileName} lacks checksum`);
      }
    }

    // Collection timestamp precision
    const hasTimestamp = evidence.collectedAt instanceof Date &&
      !isNaN(evidence.collectedAt.getTime());
    if (!hasTimestamp) {
      score -= 15;
      findings.push('Invalid collection timestamp');
    }

    return {
      dimension: 'traceability',
      score: Math.max(0, score),
      weight: this.config.traceabilityWeight,
      contribution: Math.max(0, score) * this.config.traceabilityWeight,
      details: findings.length > 0 ? findings.join('; ') : 'Fully traceable',
    };
  }
}

class ConsistencyScorer {
  constructor(private config: ScorerConfig) { }

  score(evidence: Evidence, relatedEvidence: Evidence[]): DimensionScore {
    let score = 100;
    const findings: string[] = [];

    if (relatedEvidence.length === 0) {
      // No related evidence to compare
      return {
        dimension: 'consistency',
        score: 80, // Neutral score
        weight: this.config.consistencyWeight,
        contribution: 80 * this.config.consistencyWeight,
        details: 'No related evidence for comparison',
      };
    }

    // Check type consistency
    const sameTypeCount = relatedEvidence.filter(e => e.type === evidence.type).length;
    const typeConsistency = sameTypeCount / relatedEvidence.length;
    if (typeConsistency < 0.3) {
      score -= 15;
      findings.push('Evidence type inconsistent with related evidence');
    }

    // Check source consistency
    const sameSourceCount = relatedEvidence.filter(
      e => e.sourceSystem === evidence.sourceSystem
    ).length;
    const sourceConsistency = sameSourceCount / relatedEvidence.length;
    if (sourceConsistency > 0 && sourceConsistency < 0.3) {
      score -= 10;
      findings.push('Different source than most related evidence');
    }

    // Check collection method consistency
    const sameMethodCount = relatedEvidence.filter(
      e => e.collectionMethod === evidence.collectionMethod
    ).length;
    if (sameMethodCount === 0 && evidence.collectionMethod === 'manual') {
      score -= 15;
      findings.push('Manual collection while related evidence is automated');
    }

    return {
      dimension: 'consistency',
      score: Math.max(0, score),
      weight: this.config.consistencyWeight,
      contribution: Math.max(0, score) * this.config.consistencyWeight,
      details: findings.length > 0 ? findings.join('; ') : 'Consistent',
    };
  }
}

// ============================================================================
// Evidence Quality Scorer
// ============================================================================

export class EvidenceQualityScorer extends EventEmitter {
  private config: ScorerConfig;
  private registry: ControlRequirementsRegistry;
  private completenessScorer: CompletenessScorer;
  private freshnessScorer: FreshnessScorer;
  private relevanceScorer: RelevanceScorer;
  private credibilityScorer: CredibilityScorer;
  private traceabilityScorer: TraceabilityScorer;
  private consistencyScorer: ConsistencyScorer;
  private scores: Map<string, QualityScore[]> = new Map();
  private stats: ScorerStats;

  constructor(config?: Partial<ScorerConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.registry = new ControlRequirementsRegistry();
    this.completenessScorer = new CompletenessScorer(this.config, this.registry);
    this.freshnessScorer = new FreshnessScorer(this.config);
    this.relevanceScorer = new RelevanceScorer(this.config);
    this.credibilityScorer = new CredibilityScorer(this.config);
    this.traceabilityScorer = new TraceabilityScorer(this.config);
    this.consistencyScorer = new ConsistencyScorer(this.config);
    this.stats = {
      totalScored: 0,
      averageScore: 0,
      byGrade: { A: 0, B: 0, C: 0, D: 0, F: 0 },
      byDimension: {
        completeness: 0,
        freshness: 0,
        relevance: 0,
        credibility: 0,
        traceability: 0,
        consistency: 0,
      },
      lastScoredAt: null,
    };

    logger.info({ config: this.config }, 'EvidenceQualityScorer initialized');
  }

  /**
   * Score a single piece of evidence
   */
  async scoreEvidence(
    evidence: Evidence,
    relatedEvidence: Evidence[] = []
  ): Promise<DataEnvelope<QualityScore>> {
    // Score each dimension
    const dimensions: DimensionScore[] = [
      this.completenessScorer.score(evidence),
      this.freshnessScorer.score(evidence),
      this.relevanceScorer.score(evidence),
      this.credibilityScorer.score(evidence),
      this.traceabilityScorer.score(evidence),
      this.consistencyScorer.score(evidence, relatedEvidence),
    ];

    // Calculate overall score
    const overallScore = dimensions.reduce((sum, d) => sum + d.contribution, 0);
    const grade = scoreToGrade(overallScore);

    // Generate findings
    const findings = this.generateFindings(dimensions);

    // Generate recommendations
    const recommendations = this.generateRecommendations(findings, evidence);

    const score: QualityScore = {
      id: uuidv4(),
      evidenceId: evidence.id,
      tenantId: evidence.tenantId,
      controlId: evidence.controlId,
      overallScore: Math.round(overallScore),
      grade,
      dimensions,
      findings,
      recommendations,
      scoredAt: new Date().toISOString(),
      expiresAt: new Date(
        Date.now() + this.config.scoreExpirationDays * 24 * 60 * 60 * 1000
      ).toISOString(),
      governanceVerdict: createVerdict(
        grade === 'F' ? GovernanceResult.FLAG :
          grade === 'D' ? GovernanceResult.REVIEW_REQUIRED :
            GovernanceResult.ALLOW,
        `Evidence quality: ${grade} (${Math.round(overallScore)}%)`
      ),
    };

    // Store score
    const tenantScores = this.scores.get(evidence.tenantId) || [];
    tenantScores.push(score);
    this.scores.set(evidence.tenantId, tenantScores);

    // Update stats
    this.updateStats(score, dimensions);

    // Emit event for low quality
    if (grade === 'F' || grade === 'D') {
      this.emit('evidence:low-quality', score);
    }

    logger.info(
      {
        scoreId: score.id,
        evidenceId: evidence.id,
        tenantId: evidence.tenantId,
        overallScore: score.overallScore,
        grade,
      },
      'Evidence scored'
    );

    return createDataEnvelope(score, {
      source: 'EvidenceQualityScorer',
      governanceVerdict: score.governanceVerdict,
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Score all evidence for a tenant/framework
   */
  async scoreBatch(
    tenantId: string,
    framework: ComplianceFramework,
    evidence: Evidence[]
  ): Promise<DataEnvelope<BatchScoreResult>> {
    const scores: QualityScore[] = [];
    const byControl = new Map<string, Evidence[]>();
    const byType: Record<string, { count: number; totalQuality: number }> = {};

    // Group by control
    for (const e of evidence) {
      const controlEvidence = byControl.get(e.controlId) || [];
      controlEvidence.push(e);
      byControl.set(e.controlId, controlEvidence);
    }

    // Score each piece of evidence
    for (const e of evidence) {
      const related = evidence.filter(
        re => re.controlId === e.controlId && re.id !== e.id
      );
      const result = await this.scoreEvidence(e, related);
      if (result.data) {
        scores.push(result.data);

        // Track by type
        if (!byType[e.type]) {
          byType[e.type] = { count: 0, totalQuality: 0 };
        }
        byType[e.type].count++;
        byType[e.type].totalQuality += result.data.overallScore;
      }
    }

    // Assess each control
    const controlAssessments: ControlEvidenceAssessment[] = [];
    for (const [controlId, controlEvidence] of byControl) {
      const controlScores = scores.filter(s => s.controlId === controlId);
      const assessment = this.assessControl(controlId, controlEvidence, controlScores);
      controlAssessments.push(assessment);
    }

    // Calculate overall metrics
    const totalEvidence = evidence.length;
    const averageQuality = scores.length > 0
      ? scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length
      : 0;
    const overallGrade = scoreToGrade(averageQuality);

    // Format by type
    const byTypeFormatted: Record<EvidenceType, { count: number; avgQuality: number }> = {} as any;
    for (const [type, data] of Object.entries(byType)) {
      byTypeFormatted[type as EvidenceType] = {
        count: data.count,
        avgQuality: data.count > 0 ? Math.round(data.totalQuality / data.count) : 0,
      };
    }

    // Quality distribution
    const qualityDistribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    for (const score of scores) {
      qualityDistribution[score.grade]++;
    }

    const result: BatchScoreResult = {
      tenantId,
      framework,
      totalEvidence,
      averageQuality: Math.round(averageQuality),
      overallGrade,
      byControl: controlAssessments,
      byType: byTypeFormatted,
      qualityDistribution,
      scoredAt: new Date().toISOString(),
      governanceVerdict: createVerdict(
        overallGrade === 'F' ? GovernanceResult.FLAG :
          overallGrade === 'D' ? GovernanceResult.REVIEW_REQUIRED :
            GovernanceResult.ALLOW,
        `Batch quality assessment: ${overallGrade} (${Math.round(averageQuality)}%)`
      ),
    };

    logger.info(
      {
        tenantId,
        framework,
        totalEvidence,
        averageQuality: result.averageQuality,
        overallGrade,
      },
      'Batch evidence scoring complete'
    );

    return createDataEnvelope(result, {
      source: 'EvidenceQualityScorer',
      governanceVerdict: result.governanceVerdict,
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Get scores for a tenant
   */
  getScores(
    tenantId: string,
    controlId?: string
  ): DataEnvelope<QualityScore[]> {
    let scores = this.scores.get(tenantId) || [];

    // Filter out expired scores
    const now = Date.now();
    scores = scores.filter(s => new Date(s.expiresAt).getTime() > now);

    if (controlId) {
      scores = scores.filter(s => s.controlId === controlId);
    }

    return createDataEnvelope(scores, {
      source: 'EvidenceQualityScorer',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Scores retrieved'),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Get statistics
   */
  getStats(): DataEnvelope<ScorerStats> {
    return createDataEnvelope({ ...this.stats }, {
      source: 'EvidenceQualityScorer',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Stats retrieved'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Clear tenant data
   */
  clearTenant(tenantId: string): void {
    this.scores.delete(tenantId);
    logger.info({ tenantId }, 'Tenant data cleared from evidence scorer');
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private assessControl(
    controlId: string,
    evidence: Evidence[],
    scores: QualityScore[]
  ): ControlEvidenceAssessment {
    const avgQuality = scores.length > 0
      ? scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length
      : 0;

    const requiredTypes = this.registry.getRequiredTypes(controlId);
    const presentTypes = [...new Set(evidence.map(e => e.type))];
    const missingTypes = requiredTypes.filter(t => !presentTypes.includes(t));

    const gaps: EvidenceGap[] = [];
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // Check for missing types
    for (const missing of missingTypes) {
      gaps.push({
        gapType: 'missing_type',
        description: `Missing ${missing} evidence`,
        severity: 'major',
        suggestedAction: `Collect ${missing} evidence for this control`,
      });
    }

    // Check for stale evidence
    const staleEvidence = evidence.filter(e => {
      const days = (Date.now() - e.collectedAt.getTime()) / (1000 * 60 * 60 * 24);
      return days > this.config.staleDays;
    });
    if (staleEvidence.length > 0) {
      gaps.push({
        gapType: 'stale',
        description: `${staleEvidence.length} piece(s) of stale evidence`,
        severity: staleEvidence.length > evidence.length / 2 ? 'major' : 'minor',
        suggestedAction: 'Refresh stale evidence',
      });
    }

    // Check for low quality
    const lowQualityScores = scores.filter(s => s.grade === 'D' || s.grade === 'F');
    if (lowQualityScores.length > 0) {
      gaps.push({
        gapType: 'low_quality',
        description: `${lowQualityScores.length} low-quality evidence item(s)`,
        severity: 'major',
        suggestedAction: 'Improve evidence quality',
      });
    }

    // Determine strengths and weaknesses
    if (avgQuality >= 80) {
      strengths.push('High overall evidence quality');
    }
    if (missingTypes.length === 0) {
      strengths.push('All required evidence types present');
    }
    if (evidence.some(e => e.collectionMethod === 'automated')) {
      strengths.push('Automated evidence collection in use');
    }

    if (avgQuality < 70) {
      weaknesses.push('Below average evidence quality');
    }
    if (staleEvidence.length > 0) {
      weaknesses.push('Stale evidence needs refresh');
    }
    if (!evidence.some(e => e.reviewStatus === 'approved')) {
      weaknesses.push('No approved evidence');
    }

    return {
      controlId,
      controlName: controlId, // Would come from control registry in production
      evidenceCount: evidence.length,
      averageQuality: Math.round(avgQuality),
      grade: scoreToGrade(avgQuality),
      hasGaps: gaps.length > 0,
      gaps,
      strengths,
      weaknesses,
      requiredEvidenceTypes: requiredTypes,
      presentEvidenceTypes: presentTypes,
      missingEvidenceTypes: missingTypes,
    };
  }

  private generateFindings(dimensions: DimensionScore[]): QualityFinding[] {
    const findings: QualityFinding[] = [];

    for (const dimension of dimensions) {
      if (dimension.score < 60) {
        findings.push({
          dimension: dimension.dimension,
          severity: dimension.score < 40 ? 'critical' : 'major',
          finding: `Low ${dimension.dimension} score: ${dimension.score}%`,
          recommendation: `Address: ${dimension.details}`,
        });
      } else if (dimension.score < 80) {
        findings.push({
          dimension: dimension.dimension,
          severity: 'minor',
          finding: `${dimension.dimension} could be improved`,
          recommendation: dimension.details,
        });
      }
    }

    return findings;
  }

  private generateRecommendations(
    findings: QualityFinding[],
    evidence: Evidence
  ): string[] {
    const recommendations: string[] = [];

    // Based on findings
    const criticalFindings = findings.filter(f => f.severity === 'critical');
    for (const finding of criticalFindings) {
      recommendations.push(finding.recommendation);
    }

    // General recommendations
    if (evidence.collectionMethod === 'manual') {
      recommendations.push('Consider automating evidence collection');
    }

    if (evidence.reviewStatus === 'pending') {
      recommendations.push('Complete evidence review');
    }

    if (evidence.attachments.length === 0) {
      recommendations.push('Add supporting attachments');
    }

    return [...new Set(recommendations)]; // Deduplicate
  }

  private updateStats(score: QualityScore, dimensions: DimensionScore[]): void {
    this.stats.totalScored++;
    this.stats.byGrade[score.grade]++;
    this.stats.lastScoredAt = score.scoredAt;

    // Update average score
    const n = this.stats.totalScored;
    this.stats.averageScore =
      ((this.stats.averageScore * (n - 1)) + score.overallScore) / n;

    // Update dimension averages
    for (const dim of dimensions) {
      this.stats.byDimension[dim.dimension] =
        ((this.stats.byDimension[dim.dimension] * (n - 1)) + dim.score) / n;
    }
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let instance: EvidenceQualityScorer | null = null;

export function getEvidenceQualityScorer(
  config?: Partial<ScorerConfig>
): EvidenceQualityScorer {
  if (!instance) {
    instance = new EvidenceQualityScorer(config);
  }
  return instance;
}

export default EvidenceQualityScorer;
