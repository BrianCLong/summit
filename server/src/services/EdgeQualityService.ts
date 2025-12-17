import logger from '../utils/logger.js';

/**
 * Represents a piece of evidence supporting an edge.
 */
export interface EdgeEvidence {
  id: string;
  source: string;
  timestamp: Date | string | number;
  confidence: number; // 0-1
  type: string; // e.g., 'document', 'human_verification', 'inference'
}

/**
 * Represents the provenance information of an edge.
 */
export interface EdgeProvenance {
  source: string; // e.g., 'manual', 'ai_inference', 'system_import'
  method: string; // e.g., 'user_created', 'nlp_extraction'
  authorId?: string;
  generatedAt: Date | string | number;
}

/**
 * Represents the edge to be assessed.
 */
export interface AssessableEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  provenance: EdgeProvenance;
  evidence?: EdgeEvidence[];
}

/**
 * Result of the edge quality assessment.
 */
export interface EdgeQualityScore {
  overallScore: number; // 0-1
  factors: {
    evidenceScore: number; // 0-1
    recencyScore: number; // 0-1
    provenanceScore: number; // 0-1
  };
  details: string[];
  assessedAt: Date;
}

/**
 * Service to assess the reliability and quality of graph edges based on
 * evidence, timestamp, and provenance.
 */
export class EdgeQualityService {
  // Configurable weights for the overall score
  // evidence (50%) + recency (20%) + provenance (30%)
  private static readonly WEIGHTS = {
    evidence: 0.5,
    recency: 0.2,
    provenance: 0.3,
  };

  // Base trust scores for known provenance sources
  private static readonly SOURCE_TRUST: Record<string, number> = {
    'manual': 1.0,           // Human verified
    'verified_feed': 0.9,    // Trusted external feed
    'system_import': 0.8,    // Batch import from reliable system
    'script': 0.7,           // Automated script
    'ai_inference': 0.6,     // AI generated
    'unknown': 0.1,          // Fallback
  };

  /**
   * Assess the quality of a single edge.
   * @param edge The edge to assess.
   * @returns The quality score result.
   */
  public assessEdge(edge: AssessableEdge): EdgeQualityScore {
    const evidenceScore = this.calculateEvidenceScore(edge.evidence || []);
    const recencyScore = this.calculateRecencyScore(edge.provenance.generatedAt);
    const provenanceScore = this.calculateProvenanceScore(edge.provenance.source);

    const overallScore = (
      (evidenceScore * EdgeQualityService.WEIGHTS.evidence) +
      (recencyScore * EdgeQualityService.WEIGHTS.recency) +
      (provenanceScore * EdgeQualityService.WEIGHTS.provenance)
    );

    const details: string[] = [];
    if (evidenceScore > 0.8) details.push('Strong evidence support');
    else if (evidenceScore < 0.3) details.push('Weak or missing evidence');

    if (recencyScore > 0.8) details.push('Recently updated');
    else if (recencyScore < 0.3) details.push('Stale data');

    if (provenanceScore > 0.8) details.push('High-trust source');
    else if (provenanceScore < 0.5) details.push('Low-trust source');

    const result = {
      overallScore: Number(overallScore.toFixed(4)),
      factors: {
        evidenceScore: Number(evidenceScore.toFixed(4)),
        recencyScore: Number(recencyScore.toFixed(4)),
        provenanceScore: Number(provenanceScore.toFixed(4)),
      },
      details,
      assessedAt: new Date(),
    };

    logger.info('Edge assessed', { edgeId: edge.id, score: result.overallScore });
    return result;
  }

  /**
   * Calculates a score based on the quantity and quality of evidence.
   */
  private calculateEvidenceScore(evidence: EdgeEvidence[]): number {
    if (!evidence || evidence.length === 0) {
      // If no evidence, return a baseline low score (not 0, to avoid punishing raw inputs too hard)
      // However, for strict reliability, 0 might be appropriate.
      // Let's go with 0.1 representing "unsubstantiated".
      return 0.1;
    }

    // Average confidence of evidence
    const totalConfidence = evidence.reduce((sum, e) => sum + (e.confidence || 0), 0);
    const averageConfidence = totalConfidence / evidence.length;

    // Quantity boost: more independent pieces of evidence increase confidence
    // Logarithmic boost: 1->1.0, 2->1.1, 3->1.2 (approx)
    // We cap the multiplier to avoid over-inflation
    const countBoost = 1 + (Math.log(evidence.length) * 0.1);

    // Final score capped at 1.0
    return Math.min(1.0, averageConfidence * countBoost);
  }

  /**
   * Calculates a score based on how recent the edge is.
   * Decays over time.
   */
  private calculateRecencyScore(dateInput: Date | string | number): number {
    const now = Date.now();
    const timestamp = new Date(dateInput).getTime();

    // Avoid future dates
    if (timestamp > now) return 1.0;

    const ageInDays = (now - timestamp) / (1000 * 60 * 60 * 24);

    // Decay function:
    // 0 days -> 1.0
    // 30 days -> ~0.5
    // 365 days -> ~0.08
    const halfLifeDays = 30;
    const score = 1 / (1 + (ageInDays / halfLifeDays));

    return score;
  }

  /**
   * Calculates a score based on the trustworthiness of the source.
   */
  private calculateProvenanceScore(source: string): number {
    const normalizedSource = source.toLowerCase();
    // Default to 'unknown' if not found
    return EdgeQualityService.SOURCE_TRUST[normalizedSource] ?? EdgeQualityService.SOURCE_TRUST['unknown'];
  }
}

export const edgeQualityService = new EdgeQualityService();
