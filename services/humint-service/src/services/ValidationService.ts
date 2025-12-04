/**
 * Validation Service
 *
 * Validation agents for HUMINT data quality and compliance.
 */

import {
  HumintSource,
  DebriefSession,
  IntelligenceItem,
  VALIDATION_THRESHOLDS,
  CREDIBILITY_RATINGS,
  INFORMATION_RATINGS,
  calculateCredibilityScore,
  isContactOverdue,
  isValidTransition,
  CredibilityRating,
} from '@intelgraph/humint-types';
import { ServiceContext } from '../context.js';

export interface ValidationResult {
  valid: boolean;
  score: number;
  issues: ValidationIssue[];
  warnings: ValidationWarning[];
  recommendations: string[];
}

export interface ValidationIssue {
  code: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  field?: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ValidationWarning {
  code: string;
  message: string;
  recommendation: string;
}

export interface CredibilityAssessment {
  overallScore: number;
  sourceRating: CredibilityRating;
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  factors: {
    factor: string;
    score: number;
    weight: number;
    notes: string;
  }[];
  recommendation: string;
}

export interface ComplianceCheck {
  compliant: boolean;
  checks: {
    name: string;
    passed: boolean;
    required: boolean;
    details: string;
  }[];
  missingRequirements: string[];
  expiringItems: { item: string; expiresAt: Date }[];
}

export class ValidationService {
  constructor(private ctx: ServiceContext) {}

  /**
   * Validate source data completeness and quality
   */
  async validateSource(source: HumintSource): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationWarning[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Required field validation
    if (!source.cryptonym || source.cryptonym.length < 3) {
      issues.push({
        code: 'INVALID_CRYPTONYM',
        severity: 'ERROR',
        field: 'cryptonym',
        message: 'Cryptonym must be at least 3 characters',
      });
      score -= 20;
    }

    if (!source.handlerId) {
      issues.push({
        code: 'MISSING_HANDLER',
        severity: 'ERROR',
        field: 'handlerId',
        message: 'Source must have an assigned handler',
      });
      score -= 15;
    }

    if (source.contactMethods.length === 0) {
      issues.push({
        code: 'NO_CONTACT_METHODS',
        severity: 'ERROR',
        field: 'contactMethods',
        message: 'Source must have at least one contact method',
      });
      score -= 15;
    }

    // Policy labels validation
    if (!source.policyLabels.classification) {
      issues.push({
        code: 'MISSING_CLASSIFICATION',
        severity: 'ERROR',
        field: 'policyLabels.classification',
        message: 'Classification level is required',
      });
      score -= 10;
    }

    if (!source.policyLabels.legalBasis) {
      warnings.push({
        code: 'MISSING_LEGAL_BASIS',
        message: 'Legal basis for collection not specified',
        recommendation: 'Document the legal authority for this source relationship',
      });
      score -= 5;
    }

    // Operational warnings
    if (isContactOverdue(source.lastContactDate, VALIDATION_THRESHOLDS.DORMANCY_WARNING_DAYS)) {
      warnings.push({
        code: 'CONTACT_OVERDUE',
        message: `No contact in ${VALIDATION_THRESHOLDS.DORMANCY_WARNING_DAYS}+ days`,
        recommendation: 'Schedule contact to verify source status',
      });
      score -= 5;
    }

    if (source.credibilityScore < VALIDATION_THRESHOLDS.AUTO_APPROVE_CREDIBILITY) {
      warnings.push({
        code: 'LOW_CREDIBILITY',
        message: `Credibility score (${source.credibilityScore}) below threshold`,
        recommendation: 'Review source reliability and corroboration record',
      });
    }

    // Coverage gaps
    if (source.accessCapabilities.length === 0) {
      recommendations.push('Document source access capabilities for better targeting');
    }

    if (source.motivationFactors.length === 0) {
      recommendations.push('Document source motivation factors for relationship management');
    }

    if (!source.alternateHandlerId) {
      recommendations.push('Assign alternate handler for continuity of operations');
    }

    // Calculate final validity
    const valid = issues.filter((i) => i.severity === 'ERROR').length === 0;

    return {
      valid,
      score: Math.max(0, score),
      issues,
      warnings,
      recommendations,
    };
  }

  /**
   * Validate debrief session data
   */
  async validateDebrief(debrief: DebriefSession): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationWarning[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Required fields
    if (!debrief.sourceId) {
      issues.push({
        code: 'MISSING_SOURCE',
        severity: 'ERROR',
        field: 'sourceId',
        message: 'Debrief must be linked to a source',
      });
      score -= 20;
    }

    if (!debrief.handlerId) {
      issues.push({
        code: 'MISSING_HANDLER',
        severity: 'ERROR',
        field: 'handlerId',
        message: 'Debrief must have a handler',
      });
      score -= 15;
    }

    if (debrief.objectives.length === 0) {
      issues.push({
        code: 'NO_OBJECTIVES',
        severity: 'ERROR',
        field: 'objectives',
        message: 'Debrief must have at least one objective',
      });
      score -= 10;
    }

    // Content validation for completed debriefs
    if (debrief.status === 'PENDING_REVIEW' || debrief.status === 'APPROVED') {
      if (!debrief.processedNotes || debrief.processedNotes.length < 100) {
        issues.push({
          code: 'INSUFFICIENT_NOTES',
          severity: 'ERROR',
          field: 'processedNotes',
          message: 'Processed notes must be substantial (100+ characters)',
        });
        score -= 15;
      }

      if (debrief.intelligenceItems.length === 0) {
        warnings.push({
          code: 'NO_INTELLIGENCE',
          message: 'No intelligence items extracted from debrief',
          recommendation: 'Review raw notes for extractable intelligence',
        });
        score -= 5;
      }

      if (!debrief.securityAssessment) {
        issues.push({
          code: 'MISSING_SECURITY_ASSESSMENT',
          severity: 'ERROR',
          field: 'securityAssessment',
          message: 'Security assessment required for completed debriefs',
        });
        score -= 10;
      }
    }

    // Duration validation
    if (debrief.startedAt && debrief.endedAt) {
      const duration = debrief.endedAt.getTime() - debrief.startedAt.getTime();
      if (duration < 0) {
        issues.push({
          code: 'INVALID_DURATION',
          severity: 'ERROR',
          field: 'endedAt',
          message: 'End time cannot be before start time',
        });
        score -= 10;
      }

      if (duration > 8 * 60 * 60 * 1000) {
        // > 8 hours
        warnings.push({
          code: 'LONG_DURATION',
          message: 'Debrief duration exceeds 8 hours',
          recommendation: 'Verify duration is accurate',
        });
      }
    }

    // Location security
    if (!debrief.location.securityVerified) {
      warnings.push({
        code: 'UNVERIFIED_LOCATION',
        message: 'Debrief location security not verified',
        recommendation: 'Verify location security before meeting',
      });
    }

    const valid = issues.filter((i) => i.severity === 'ERROR').length === 0;

    return {
      valid,
      score: Math.max(0, score),
      issues,
      warnings,
      recommendations,
    };
  }

  /**
   * Validate intelligence item quality
   */
  validateIntelligenceItem(item: IntelligenceItem): ValidationResult {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationWarning[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Content validation
    if (!item.topic || item.topic.length < 5) {
      issues.push({
        code: 'INVALID_TOPIC',
        severity: 'ERROR',
        field: 'topic',
        message: 'Topic must be descriptive (5+ characters)',
      });
      score -= 15;
    }

    if (!item.content || item.content.length < 50) {
      issues.push({
        code: 'INSUFFICIENT_CONTENT',
        severity: 'ERROR',
        field: 'content',
        message: 'Content must be substantial (50+ characters)',
      });
      score -= 20;
    }

    // Rating validation
    if (!item.informationRating) {
      issues.push({
        code: 'MISSING_RATING',
        severity: 'ERROR',
        field: 'informationRating',
        message: 'Information rating is required',
      });
      score -= 10;
    }

    // Corroboration
    if (item.requiresCorroboration && item.corroboratedBy.length === 0) {
      warnings.push({
        code: 'UNCORROBORATED',
        message: 'Intelligence marked as requiring corroboration but none provided',
        recommendation: 'Seek corroboration from additional sources',
      });
      score -= 5;
    }

    // Perishability
    if (item.actionability === 'IMMEDIATE' && !item.perishability) {
      warnings.push({
        code: 'NO_PERISHABILITY',
        message: 'Immediate actionability without perishability date',
        recommendation: 'Set perishability date for time-sensitive intelligence',
      });
    }

    // Entity linkage
    if (item.linkedEntities.length === 0) {
      recommendations.push('Link intelligence to relevant entities in knowledge graph');
    }

    const valid = issues.filter((i) => i.severity === 'ERROR').length === 0;

    return {
      valid,
      score: Math.max(0, score),
      issues,
      warnings,
      recommendations,
    };
  }

  /**
   * Assess source credibility with detailed factors
   */
  async assessCredibility(sourceId: string, tenantId: string): Promise<CredibilityAssessment> {
    const session = this.ctx.getNeo4jSession();
    try {
      // Get source and related data
      const result = await session.run(
        `
        MATCH (s:HumintSource {id: $sourceId, tenantId: $tenantId})
        OPTIONAL MATCH (i:HumintIntelligence)-[:EXTRACTED_FROM]->(d:HumintDebrief)-[:DEBRIEF_OF]->(s)
        OPTIONAL MATCH (i)-[:CORROBORATES]->()
        WITH s,
             count(DISTINCT d) as debriefCount,
             count(DISTINCT i) as intelCount,
             sum(CASE WHEN i.informationRating IN ['1', '2'] THEN 1 ELSE 0 END) as confirmedCount
        RETURN s, debriefCount, intelCount, confirmedCount
        `,
        { sourceId, tenantId },
      );

      if (result.records.length === 0) {
        throw new Error(`Source ${sourceId} not found`);
      }

      const record = result.records[0];
      const source = record.get('s').properties;
      const debriefCount = record.get('debriefCount').toNumber();
      const intelCount = record.get('intelCount').toNumber();
      const confirmedCount = record.get('confirmedCount').toNumber();

      const factors: CredibilityAssessment['factors'] = [];

      // Historical accuracy factor
      const accuracyScore =
        intelCount > 0 ? Math.round((confirmedCount / intelCount) * 100) : 50;
      factors.push({
        factor: 'Historical Accuracy',
        score: accuracyScore,
        weight: 0.35,
        notes: `${confirmedCount} of ${intelCount} intelligence items confirmed`,
      });

      // Consistency factor (based on credibility rating)
      const consistencyScore = CREDIBILITY_RATINGS[source.credibilityRating as CredibilityRating]?.score || 50;
      factors.push({
        factor: 'Source Consistency',
        score: consistencyScore,
        weight: 0.25,
        notes: `Current rating: ${source.credibilityRating}`,
      });

      // Engagement factor
      const engagementScore = Math.min(100, debriefCount * 10);
      factors.push({
        factor: 'Source Engagement',
        score: engagementScore,
        weight: 0.20,
        notes: `${debriefCount} debriefs conducted`,
      });

      // Recency factor
      const daysSinceContact = source.lastContactDate
        ? Math.floor(
            (Date.now() - new Date(source.lastContactDate).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 999;
      const recencyScore = Math.max(0, 100 - daysSinceContact * 2);
      factors.push({
        factor: 'Contact Recency',
        score: recencyScore,
        weight: 0.20,
        notes: `Last contact ${daysSinceContact} days ago`,
      });

      // Calculate weighted overall score
      const overallScore = Math.round(
        factors.reduce((sum, f) => sum + f.score * f.weight, 0),
      );

      // Determine rating from score
      let sourceRating: CredibilityRating = 'F';
      if (overallScore >= 90) sourceRating = 'A';
      else if (overallScore >= 70) sourceRating = 'B';
      else if (overallScore >= 50) sourceRating = 'C';
      else if (overallScore >= 30) sourceRating = 'D';
      else if (overallScore >= 10) sourceRating = 'E';

      // Determine trend
      const previousScore = source.credibilityScore || overallScore;
      let trend: CredibilityAssessment['trend'] = 'STABLE';
      if (overallScore > previousScore + 5) trend = 'IMPROVING';
      else if (overallScore < previousScore - 5) trend = 'DECLINING';

      // Generate recommendation
      let recommendation = '';
      if (overallScore < 50) {
        recommendation =
          'Consider additional vetting or reducing reliance on this source';
      } else if (daysSinceContact > 30) {
        recommendation = 'Schedule contact to maintain relationship';
      } else if (intelCount === 0) {
        recommendation = 'Focus debriefs on extracting actionable intelligence';
      } else {
        recommendation = 'Continue current engagement pattern';
      }

      return {
        overallScore,
        sourceRating,
        trend,
        factors,
        recommendation,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Check compliance requirements for source
   */
  async checkCompliance(sourceId: string, tenantId: string): Promise<ComplianceCheck> {
    const session = this.ctx.getNeo4jSession();
    try {
      const result = await session.run(
        `
        MATCH (s:HumintSource {id: $sourceId, tenantId: $tenantId})
        RETURN s
        `,
        { sourceId, tenantId },
      );

      if (result.records.length === 0) {
        throw new Error(`Source ${sourceId} not found`);
      }

      const source = result.records[0].get('s').properties;
      const checks: ComplianceCheck['checks'] = [];
      const missingRequirements: string[] = [];
      const expiringItems: ComplianceCheck['expiringItems'] = [];

      // Classification check
      checks.push({
        name: 'Classification Assigned',
        passed: !!source.classification,
        required: true,
        details: source.classification
          ? `Classified as ${source.classification}`
          : 'No classification assigned',
      });
      if (!source.classification) {
        missingRequirements.push('Security classification');
      }

      // Handler assignment
      checks.push({
        name: 'Handler Assigned',
        passed: !!source.handlerId,
        required: true,
        details: source.handlerId
          ? 'Handler assigned'
          : 'No handler assigned',
      });
      if (!source.handlerId) {
        missingRequirements.push('Handler assignment');
      }

      // Recent contact check
      const daysSinceContact = source.lastContactDate
        ? Math.floor(
            (Date.now() - new Date(source.lastContactDate).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 999;
      checks.push({
        name: 'Regular Contact',
        passed: daysSinceContact <= 90,
        required: false,
        details:
          daysSinceContact <= 90
            ? `Last contact ${daysSinceContact} days ago`
            : `No contact for ${daysSinceContact} days`,
      });

      // Valid status
      checks.push({
        name: 'Valid Status',
        passed: ['ACTIVE', 'DEVELOPMENTAL', 'EVALUATION'].includes(source.status),
        required: false,
        details: `Current status: ${source.status}`,
      });

      // Check for expiring items (cover identities, etc.)
      // Would check coverIdentities validTo dates in full implementation

      const compliant = checks.filter((c) => c.required && !c.passed).length === 0;

      return {
        compliant,
        checks,
        missingRequirements,
        expiringItems,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Validate workflow state transition
   */
  validateStateTransition(
    currentStatus: string,
    targetStatus: string,
    entityType: 'debrief',
  ): { valid: boolean; reason?: string } {
    if (entityType === 'debrief') {
      const valid = isValidTransition(
        currentStatus as never,
        targetStatus as never,
      );
      return {
        valid,
        reason: valid
          ? undefined
          : `Invalid transition from ${currentStatus} to ${targetStatus}`,
      };
    }

    return { valid: false, reason: 'Unknown entity type' };
  }

  /**
   * Batch validate multiple sources
   */
  async batchValidateSources(
    sourceIds: string[],
    tenantId: string,
  ): Promise<Map<string, ValidationResult>> {
    const results = new Map<string, ValidationResult>();

    const session = this.ctx.getNeo4jSession();
    try {
      const result = await session.run(
        `
        MATCH (s:HumintSource)
        WHERE s.id IN $sourceIds AND s.tenantId = $tenantId
        RETURN s
        `,
        { sourceIds, tenantId },
      );

      for (const record of result.records) {
        const source = this.mapRecordToSource(record.get('s'));
        const validation = await this.validateSource(source);
        results.set(source.id, validation);
      }
    } finally {
      await session.close();
    }

    return results;
  }

  private mapRecordToSource(record: Record<string, unknown>): HumintSource {
    const props = record.properties || record;
    return {
      id: props.id,
      tenantId: props.tenantId,
      cryptonym: props.cryptonym,
      sourceType: props.sourceType,
      status: props.status,
      handlerId: props.handlerId,
      alternateHandlerId: props.alternateHandlerId,
      credibilityRating: props.credibilityRating || 'F',
      credibilityScore: Number(props.credibilityScore) || 0,
      credibilityTrend: props.credibilityTrend || 'STABLE',
      riskLevel: props.riskLevel || 'MODERATE',
      areaOfOperation: props.areaOfOperation || [],
      topicalAccess: props.topicalAccess || [],
      accessCapabilities: [],
      contactMethods: [],
      coverIdentities: [],
      recruitmentDate: new Date(props.recruitmentDate),
      lastContactDate: props.lastContactDate
        ? new Date(props.lastContactDate)
        : undefined,
      nextScheduledContact: undefined,
      totalDebriefs: Number(props.totalDebriefs) || 0,
      intelligenceReportsCount: Number(props.intelligenceReportsCount) || 0,
      actionableIntelCount: Number(props.actionableIntelCount) || 0,
      languages: props.languages || [],
      specialCapabilities: props.specialCapabilities || [],
      compensation: { type: 'NONE' },
      motivationFactors: props.motivationFactors || [],
      vulnerabilities: props.vulnerabilities || [],
      policyLabels: {
        classification: props.classification || 'UNCLASSIFIED',
        caveats: [],
        releasableTo: [],
        originatorControl: false,
        legalBasis: '',
        needToKnow: [],
        retentionPeriod: 365,
      },
      notes: props.notes || '',
      provenance: [],
      validFrom: new Date(props.validFrom || props.createdAt),
      createdAt: new Date(props.createdAt),
      updatedAt: new Date(props.updatedAt),
      createdBy: props.createdBy,
      updatedBy: props.updatedBy || props.createdBy,
      version: Number(props.version) || 1,
    } as HumintSource;
  }
}
