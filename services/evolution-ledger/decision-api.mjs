#!/usr/bin/env node

/**
 * Evolution Decision API
 *
 * Provides PR classification, merge prediction, and queue assignment.
 */

export class DecisionAPI {
  constructor(config = {}) {
    this.initialized = false;
  }

  async initialize() {
    this.initialized = true;
    console.log('⚠️  No trained model found, using heuristics');
  }

  async predictPROutcome(prMetadata) {
    await this.initialize();

    const features = this.extractFeatures(prMetadata);
    const mergeSuccess = this.calculateMergeSuccess(features);

    return {
      prNumber: prMetadata.prNumber,
      mergeSuccessProbability: mergeSuccess,
      riskScore: 1 - mergeSuccess,
      riskLevel: mergeSuccess > 0.7 ? 'low' : 'medium',
      queueLane: mergeSuccess > 0.8 ? 'merge-now' : 'needs-review',
      features
    };
  }

  extractFeatures(pr) {
    const filesChanged = pr.files_changed ? pr.files_changed.length : (pr.filesChanged || []).length;

    return {
      filesChanged,
      additions: pr.additions || 0,
      deletions: pr.deletions || 0,
      commits: pr.commits || 0,
      testRatio: this.calculateTestRatio(pr.files_changed || pr.filesChanged || [])
    };
  }

  calculateTestRatio(files) {
    if (!files || files.length === 0) return 0;

    const testFiles = files.filter(f =>
      f.includes('test') ||
      f.includes('spec') ||
      f.includes('__tests__')
    ).length;

    return testFiles / files.length;
  }

  calculateMergeSuccess(features) {
    let score = 0.7;
    if (features.filesChanged < 10) score += 0.1;
    if (features.testRatio > 0.2) score += 0.1;
    if (features.commits < 5) score += 0.05;
    return Math.min(score, 1.0);
  }

  /**
   * Predict merge risk for a PR
   * @param {Object} prMetadata - PR metadata
   * @returns {Promise<Object>} Risk assessment with score, level, and factors
   */
  async predictMergeRisk(prMetadata) {
    await this.initialize();

    const features = this.extractFeatures(prMetadata);
    const riskFactors = [];
    let riskScore = 0.2; // Base risk

    // Analyze risk factors
    if (features.filesChanged > 50) {
      const impact = 0.3;
      riskScore += impact;
      riskFactors.push({
        factor: 'Large changeset',
        severity: 'high',
        impact,
        description: `${features.filesChanged} files changed`
      });
    } else if (features.filesChanged > 20) {
      const impact = 0.15;
      riskScore += impact;
      riskFactors.push({
        factor: 'Medium changeset',
        severity: 'medium',
        impact,
        description: `${features.filesChanged} files changed`
      });
    }

    if (features.testRatio < 0.1) {
      const impact = 0.25;
      riskScore += impact;
      riskFactors.push({
        factor: 'Low test coverage',
        severity: 'high',
        impact,
        description: `Only ${(features.testRatio * 100).toFixed(0)}% test files`
      });
    }

    if (features.additions + features.deletions > 5000) {
      const impact = 0.2;
      riskScore += impact;
      riskFactors.push({
        factor: 'Large code delta',
        severity: 'medium',
        impact,
        description: `+${features.additions}/-${features.deletions} lines`
      });
    }

    if (features.commits > 20) {
      const impact = 0.1;
      riskScore += impact;
      riskFactors.push({
        factor: 'Many commits',
        severity: 'low',
        impact,
        description: `${features.commits} commits`
      });
    }

    // Determine risk level
    let riskLevel;
    if (riskScore < 0.3) riskLevel = 'low';
    else if (riskScore < 0.6) riskLevel = 'medium';
    else riskLevel = 'high';

    return {
      riskScore: Math.min(riskScore, 1.0),
      riskLevel,
      riskFactors,
      features,
      predictedEvents: this.generatePredictedEvents(prMetadata, riskScore)
    };
  }

  /**
   * Generate predicted evolution events
   * @param {Object} prMetadata - PR metadata
   * @param {number} riskScore - Risk score
   * @returns {Array} Predicted events with confidence scores
   */
  generatePredictedEvents(prMetadata, riskScore) {
    const events = [];
    const mergeProb = 1 - riskScore;

    if (mergeProb > 0.8) {
      events.push({
        eventType: 'pr_merged',
        confidence: mergeProb,
        expectedTimeframe: 'within 24h'
      });
    }

    if (riskScore > 0.5) {
      events.push({
        eventType: 'pr_review_requested',
        confidence: 0.9,
        expectedTimeframe: 'immediate'
      });
    }

    if (riskScore > 0.7) {
      events.push({
        eventType: 'pr_changes_requested',
        confidence: 0.7,
        expectedTimeframe: 'within 48h'
      });
    }

    if (mergeProb > 0.6 && mergeProb < 0.8) {
      events.push({
        eventType: 'pr_review_approved',
        confidence: mergeProb,
        expectedTimeframe: 'within 72h'
      });
    }

    return events;
  }

  /**
   * Close database connection
   */
  async close() {
    // No database connection to close in heuristic mode
    // This will be used when ML models are integrated
  }
}

export default DecisionAPI;
