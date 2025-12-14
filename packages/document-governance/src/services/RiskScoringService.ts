/**
 * Risk Scoring Service
 *
 * Calculates and manages risk scores for documents.
 */

import { Driver } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';
import {
  RiskScore,
  RiskDimension,
  RiskThreshold,
  RiskAssessmentRequest,
} from '../types/compliance.js';
import { RiskLevel, ClassificationLevel } from '../types/document.js';

// Risk dimensions with weights
const RISK_DIMENSIONS: RiskDimension[] = [
  {
    id: 'legal',
    name: 'Legal Risk',
    description: 'Risk of legal liability, litigation, or regulatory penalties',
    weight: 0.20,
    factors: [
      'Contractual obligations exposure',
      'Regulatory compliance requirements',
      'Intellectual property implications',
      'Litigation potential',
    ],
  },
  {
    id: 'financial',
    name: 'Financial Risk',
    description: 'Risk of financial loss or misstatement',
    weight: 0.20,
    factors: [
      'Material financial impact',
      'Audit implications',
      'Revenue recognition impact',
      'Tax implications',
    ],
  },
  {
    id: 'security',
    name: 'Security Risk',
    description: 'Risk to information security and data protection',
    weight: 0.25,
    factors: [
      'Data sensitivity level',
      'Access control requirements',
      'Encryption requirements',
      'Breach notification obligations',
    ],
  },
  {
    id: 'operational',
    name: 'Operational Risk',
    description: 'Risk to business operations and continuity',
    weight: 0.15,
    factors: [
      'Business process dependency',
      'Recovery time requirements',
      'Operational complexity',
      'Change management impact',
    ],
  },
  {
    id: 'regulatory',
    name: 'Regulatory Risk',
    description: 'Risk of regulatory non-compliance',
    weight: 0.10,
    factors: [
      'Number of applicable regulations',
      'Audit frequency',
      'Reporting requirements',
      'Certification dependencies',
    ],
  },
  {
    id: 'reputational',
    name: 'Reputational Risk',
    description: 'Risk to company reputation and stakeholder trust',
    weight: 0.10,
    factors: [
      'Public exposure',
      'Customer impact',
      'Partner relationship impact',
      'Media attention potential',
    ],
  },
];

// Risk thresholds
const RISK_THRESHOLDS: RiskThreshold[] = [
  {
    level: 'Low',
    min: 0,
    max: 3,
    color: '#22c55e',
    description: 'Minimal risk, standard handling procedures',
    actions: ['Standard document management', 'Regular review cycle'],
  },
  {
    level: 'Medium',
    min: 3,
    max: 6,
    color: '#f59e0b',
    description: 'Moderate risk, enhanced controls recommended',
    actions: ['Enhanced access controls', 'More frequent reviews', 'Stakeholder notification'],
  },
  {
    level: 'High',
    min: 6,
    max: 8,
    color: '#ef4444',
    description: 'Significant risk, strict controls required',
    actions: ['Restricted access', 'Executive oversight', 'Audit trail requirements', 'Legal review'],
  },
  {
    level: 'Critical',
    min: 8,
    max: 10,
    color: '#dc2626',
    description: 'Severe risk, maximum controls and monitoring',
    actions: [
      'C-level approval required',
      'Continuous monitoring',
      'Immediate escalation procedures',
      'Board notification if applicable',
    ],
  },
];

// Classification level modifiers
const CLASSIFICATION_MODIFIERS: Record<ClassificationLevel, number> = {
  Public: -1.0,
  Internal: 0,
  Confidential: 0.5,
  Restricted: 1.0,
  HighlyRestricted: 1.5,
  Classified_Internal: 2.0,
  Classified_Regulated: 2.5,
};

// Default risk scores by document type
const DEFAULT_RISK_SCORES: Record<string, Record<string, number>> = {
  'doc.articles_of_incorporation': { legal: 9, financial: 7, security: 5, operational: 8, regulatory: 8, reputational: 7 },
  'doc.penetration_test_report': { legal: 6, financial: 4, security: 10, operational: 7, regulatory: 8, reputational: 9 },
  'doc.employment_agreement': { legal: 8, financial: 5, security: 6, operational: 4, regulatory: 7, reputational: 5 },
  'doc.msa': { legal: 8, financial: 7, security: 5, operational: 6, regulatory: 5, reputational: 6 },
  'doc.security_policy': { legal: 6, financial: 3, security: 9, operational: 7, regulatory: 8, reputational: 7 },
  'doc.privacy_policy': { legal: 7, financial: 4, security: 7, operational: 4, regulatory: 9, reputational: 8 },
  'doc.prd': { legal: 3, financial: 4, security: 4, operational: 6, regulatory: 2, reputational: 3 },
  'doc.model_card': { legal: 5, financial: 3, security: 6, operational: 5, regulatory: 8, reputational: 7 },
};

export class RiskScoringService {
  constructor(private driver: Driver) {}

  /**
   * Get all risk dimensions
   */
  getRiskDimensions(): RiskDimension[] {
    return RISK_DIMENSIONS;
  }

  /**
   * Get risk thresholds
   */
  getRiskThresholds(): RiskThreshold[] {
    return RISK_THRESHOLDS;
  }

  /**
   * Calculate risk level from score
   */
  getRiskLevel(score: number): RiskLevel {
    for (const threshold of RISK_THRESHOLDS) {
      if (score >= threshold.min && score < threshold.max) {
        return threshold.level;
      }
    }
    return score >= 8 ? 'Critical' : 'Low';
  }

  /**
   * Calculate risk score for a document
   */
  async calculateRiskScore(request: RiskAssessmentRequest): Promise<RiskScore> {
    const session = this.driver.session();
    try {
      // Get document details
      const result = await session.run(
        `
        MATCH (d:Document {id: $documentId})
        MATCH (dt:DocumentType {id: d.document_type_id})
        RETURN d, dt
        `,
        { documentId: request.document_id }
      );

      if (result.records.length === 0) {
        throw new Error(`Document not found: ${request.document_id}`);
      }

      const record = result.records[0];
      const doc = record.get('d').properties;
      const docType = record.get('dt').properties;

      // Get base scores from document type defaults
      const baseScores = DEFAULT_RISK_SCORES[docType.id] || {
        legal: 5,
        financial: 5,
        security: 5,
        operational: 5,
        regulatory: 5,
        reputational: 5,
      };

      // Apply dimension overrides if provided
      const dimensionScores: Record<string, number> = {};
      for (const dim of RISK_DIMENSIONS) {
        dimensionScores[dim.id] = request.dimension_overrides?.[dim.id] ?? baseScores[dim.id] ?? 5;
      }

      // Calculate weighted score
      let weightedScore = 0;
      for (const dim of RISK_DIMENSIONS) {
        weightedScore += dimensionScores[dim.id] * dim.weight;
      }

      // Apply modifiers
      const modifiersApplied: Array<{ name: string; value: number; reason: string }> = [];

      // Classification level modifier
      const classificationModifier = CLASSIFICATION_MODIFIERS[doc.classification as ClassificationLevel] || 0;
      if (classificationModifier !== 0) {
        modifiersApplied.push({
          name: 'Classification Level',
          value: classificationModifier,
          reason: `Document classification: ${doc.classification}`,
        });
        weightedScore += classificationModifier;
      }

      // External facing modifier
      if (docType.subcategory === 'ExternalPolicy') {
        modifiersApplied.push({
          name: 'External Facing',
          value: 0.5,
          reason: 'Document is externally facing',
        });
        weightedScore += 0.5;
      }

      // Clamp score to 0-10
      weightedScore = Math.max(0, Math.min(10, weightedScore));

      const riskScore: RiskScore = {
        document_id: request.document_id,
        scored_at: new Date().toISOString(),
        dimension_scores: dimensionScores,
        weighted_score: Math.round(weightedScore * 100) / 100,
        risk_level: this.getRiskLevel(weightedScore),
        modifiers_applied: modifiersApplied,
        factors: RISK_DIMENSIONS.flatMap((dim) =>
          dim.factors.map((factor) => ({
            dimension: dim.id,
            factor,
            score: dimensionScores[dim.id],
          }))
        ),
      };

      // Store the risk score
      await session.run(
        `
        MATCH (d:Document {id: $documentId})
        MERGE (rs:RiskScore {document_id: $documentId})
        SET rs.scored_at = datetime(),
            rs.dimension_scores = $dimensionScores,
            rs.weighted_score = $weightedScore,
            rs.risk_level = $riskLevel,
            rs.modifiers_applied = $modifiersApplied
        `,
        {
          documentId: request.document_id,
          dimensionScores: JSON.stringify(dimensionScores),
          weightedScore: riskScore.weighted_score,
          riskLevel: riskScore.risk_level,
          modifiersApplied: JSON.stringify(modifiersApplied),
        }
      );

      return riskScore;
    } finally {
      await session.close();
    }
  }

  /**
   * Get risk score for a document
   */
  async getRiskScore(documentId: string): Promise<RiskScore | null> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (rs:RiskScore {document_id: $documentId})
        RETURN rs
        `,
        { documentId }
      );

      if (result.records.length === 0) {
        return null;
      }

      const rs = result.records[0].get('rs').properties;
      return {
        document_id: rs.document_id,
        scored_at: rs.scored_at.toString(),
        dimension_scores: JSON.parse(rs.dimension_scores),
        weighted_score: rs.weighted_score,
        risk_level: rs.risk_level as RiskLevel,
        modifiers_applied: JSON.parse(rs.modifiers_applied),
        factors: [],
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Get high-risk documents
   */
  async getHighRiskDocuments(minRiskLevel: RiskLevel = 'High'): Promise<RiskScore[]> {
    const session = this.driver.session();
    try {
      const minScore = minRiskLevel === 'Critical' ? 8 : minRiskLevel === 'High' ? 6 : 3;

      const result = await session.run(
        `
        MATCH (rs:RiskScore)
        WHERE rs.weighted_score >= $minScore
        RETURN rs
        ORDER BY rs.weighted_score DESC
        `,
        { minScore }
      );

      return result.records.map((record) => {
        const rs = record.get('rs').properties;
        return {
          document_id: rs.document_id,
          scored_at: rs.scored_at.toString(),
          dimension_scores: JSON.parse(rs.dimension_scores),
          weighted_score: rs.weighted_score,
          risk_level: rs.risk_level as RiskLevel,
          modifiers_applied: JSON.parse(rs.modifiers_applied),
          factors: [],
        };
      });
    } finally {
      await session.close();
    }
  }
}
