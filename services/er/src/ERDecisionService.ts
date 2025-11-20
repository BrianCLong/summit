/**
 * ER Decision Service
 * Threshold-based routing for entity resolution decisions
 */

import {
  ERMatchScore,
  ERDecision,
  ERThresholds,
  CanonicalEntityType,
} from '@summit/canonical-schema';
import { v4 as uuidv4 } from 'uuid';

export class ERDecisionService {
  /**
   * Route a match score to a decision based on thresholds
   */
  async routeDecision(
    matchScore: ERMatchScore,
    thresholds: ERThresholds,
    entityType: CanonicalEntityType
  ): Promise<ERDecision> {
    const { overallScore } = matchScore;

    let decision: 'MERGE' | 'NO_MERGE' | 'DEFER';
    let reviewRequired: boolean;
    let decisionMethod: 'auto' | 'manual';

    // Apply threshold rules
    if (overallScore >= thresholds.autoMergeThreshold) {
      // High confidence: auto-merge
      decision = 'MERGE';
      reviewRequired = false;
      decisionMethod = 'auto';
    } else if (overallScore >= thresholds.manualReviewThreshold) {
      // Medium confidence: manual review
      decision = 'DEFER';
      reviewRequired = true;
      decisionMethod = 'manual';
    } else {
      // Low confidence: reject
      decision = 'NO_MERGE';
      reviewRequired = false;
      decisionMethod = 'auto';
    }

    return {
      id: uuidv4(),
      matchScore,
      decision,
      decisionMethod,
      decidedAt: new Date(),
      reviewRequired,
      entityType,
      audit: {
        traceId: uuidv4(),
      },
    };
  }

  /**
   * Get default thresholds for an entity type
   */
  getDefaultThresholds(entityType: CanonicalEntityType): ERThresholds {
    const thresholdMap: Record<string, Partial<ERThresholds>> = {
      [CanonicalEntityType.PERSON]: {
        autoMergeThreshold: 0.90,
        manualReviewThreshold: 0.70,
        rejectThreshold: 0.70,
        targetPrecision: 0.90,
      },
      [CanonicalEntityType.ORGANIZATION]: {
        autoMergeThreshold: 0.88,
        manualReviewThreshold: 0.70,
        rejectThreshold: 0.70,
        targetPrecision: 0.88,
      },
      [CanonicalEntityType.LOCATION]: {
        autoMergeThreshold: 0.85,
        manualReviewThreshold: 0.65,
        rejectThreshold: 0.65,
        targetPrecision: 0.85,
      },
      [CanonicalEntityType.ASSET]: {
        autoMergeThreshold: 0.82,
        manualReviewThreshold: 0.65,
        rejectThreshold: 0.65,
        targetPrecision: 0.82,
      },
    };

    const defaults = thresholdMap[entityType] || {
      autoMergeThreshold: 0.85,
      manualReviewThreshold: 0.70,
      rejectThreshold: 0.70,
      targetPrecision: 0.85,
    };

    return {
      entityType,
      autoMergeThreshold: defaults.autoMergeThreshold!,
      manualReviewThreshold: defaults.manualReviewThreshold!,
      rejectThreshold: defaults.rejectThreshold!,
      targetPrecision: defaults.targetPrecision!,
      currentPrecision: 0,
      sampleSize: 0,
      lastCalibrated: new Date(),
    };
  }

  /**
   * Update thresholds based on precision metrics
   */
  async calibrateThresholds(
    entityType: CanonicalEntityType,
    decisions: ERDecision[]
  ): Promise<ERThresholds> {
    // Count merge decisions with high confidence
    const mergeDecisions = decisions.filter(d => d.decision === 'MERGE');
    const highConfidenceMerges = mergeDecisions.filter(
      d => d.matchScore.confidence >= 0.8
    );

    const currentPrecision =
      mergeDecisions.length > 0
        ? highConfidenceMerges.length / mergeDecisions.length
        : 0;

    const thresholds = this.getDefaultThresholds(entityType);
    thresholds.currentPrecision = currentPrecision;
    thresholds.sampleSize = decisions.length;
    thresholds.lastCalibrated = new Date();

    // Adjust thresholds if precision is below target
    if (currentPrecision < thresholds.targetPrecision && mergeDecisions.length >= 100) {
      // Increase threshold to improve precision
      thresholds.autoMergeThreshold = Math.min(
        0.95,
        thresholds.autoMergeThreshold + 0.02
      );
      console.log(
        `Calibrated ${entityType} threshold to ${thresholds.autoMergeThreshold.toFixed(3)} ` +
        `(precision: ${currentPrecision.toFixed(3)} < target: ${thresholds.targetPrecision})`
      );
    }

    return thresholds;
  }
}
