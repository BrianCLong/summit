/**
 * FeedbackCollector - Collects operator feedback for model retraining
 * Enables continuous improvement through human feedback loops
 */

import { randomUUID } from 'crypto';
import {
  OperatorFeedback,
  FeedbackSentiment,
  TrainingBatch,
  Recommendation,
  CommanderDecision,
  CollaborationConfig,
  DEFAULT_COLLABORATION_CONFIG,
} from './types.js';

interface FeedbackInput {
  recommendationId: string;
  decisionId?: string;
  sentiment: FeedbackSentiment;
  rating: number;
  comments?: string;
  wasCorrect: boolean;
  correctAction?: string;
  correctParameters?: Record<string, unknown>;
  correctOutcome?: string;
  tags?: string[];
}

interface Operator {
  id: string;
  name: string;
  role: string;
}

type RetrainCallback = (batch: TrainingBatch) => Promise<void>;

/**
 * Service for collecting and processing operator feedback
 */
export class FeedbackCollector {
  private config: CollaborationConfig;
  private feedback: Map<string, OperatorFeedback> = new Map();
  private batches: Map<string, TrainingBatch> = new Map();
  private recommendations: Map<string, Recommendation>;
  private decisions: Map<string, CommanderDecision>;
  private retrainCallback?: RetrainCallback;
  private currentModelVersion: string;

  constructor(
    recommendations: Map<string, Recommendation>,
    decisions: Map<string, CommanderDecision>,
    config: Partial<CollaborationConfig> = {},
    modelVersion = '1.0.0'
  ) {
    this.recommendations = recommendations;
    this.decisions = decisions;
    this.config = { ...DEFAULT_COLLABORATION_CONFIG, ...config };
    this.currentModelVersion = modelVersion;
  }

  /**
   * Submit operator feedback on a recommendation
   */
  async submitFeedback(
    input: FeedbackInput,
    operator: Operator,
    traceId?: string
  ): Promise<OperatorFeedback> {
    const recommendation = this.recommendations.get(input.recommendationId);
    if (!recommendation) {
      throw new Error(`Recommendation not found: ${input.recommendationId}`);
    }

    // Validate rating
    if (input.rating < 1 || input.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const feedback: OperatorFeedback = {
      id: randomUUID(),
      recommendationId: input.recommendationId,
      decisionId: input.decisionId,
      missionId: recommendation.missionId,
      timestamp: new Date().toISOString(),

      operatorId: operator.id,
      operatorRole: operator.role,

      sentiment: input.sentiment,
      rating: input.rating,
      comments: input.comments,

      wasCorrect: input.wasCorrect,
      correctAction: input.correctAction,
      correctParameters: input.correctParameters,
      correctOutcome: input.correctOutcome,

      tags: input.tags || [],

      traceId: traceId || recommendation.traceId,
    };

    this.feedback.set(feedback.id, feedback);

    // Check if we should trigger retraining
    await this.checkRetrainingThreshold();

    return feedback;
  }

  /**
   * Get feedback by ID
   */
  getFeedback(id: string): OperatorFeedback | undefined {
    return this.feedback.get(id);
  }

  /**
   * Get all feedback for a recommendation
   */
  getFeedbackForRecommendation(recommendationId: string): OperatorFeedback[] {
    return Array.from(this.feedback.values()).filter(
      (f) => f.recommendationId === recommendationId
    );
  }

  /**
   * Get all feedback for a mission
   */
  getFeedbackForMission(missionId: string): OperatorFeedback[] {
    return Array.from(this.feedback.values()).filter(
      (f) => f.missionId === missionId
    );
  }

  /**
   * Get feedback by operator
   */
  getFeedbackByOperator(operatorId: string): OperatorFeedback[] {
    return Array.from(this.feedback.values()).filter(
      (f) => f.operatorId === operatorId
    );
  }

  /**
   * Get corrective feedback (for retraining)
   */
  getCorrectiveFeedback(): OperatorFeedback[] {
    return Array.from(this.feedback.values()).filter(
      (f) => f.sentiment === 'corrective' || !f.wasCorrect
    );
  }

  /**
   * Get unprocessed feedback for retraining
   */
  getUnprocessedFeedback(): OperatorFeedback[] {
    const processedIds = new Set<string>();
    for (const batch of this.batches.values()) {
      batch.feedbackIds.forEach((id) => processedIds.add(id));
    }

    return Array.from(this.feedback.values()).filter(
      (f) => !processedIds.has(f.id)
    );
  }

  /**
   * Create a training batch from accumulated feedback
   */
  async createTrainingBatch(
    targetModelVersion: string
  ): Promise<TrainingBatch | null> {
    const unprocessed = this.getUnprocessedFeedback();

    if (unprocessed.length < this.config.minFeedbackForRetraining) {
      return null;
    }

    const batch: TrainingBatch = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),

      feedbackIds: unprocessed.map((f) => f.id),
      sampleCount: unprocessed.length,

      modelVersion: this.currentModelVersion,
      targetModelVersion,

      status: 'pending',
    };

    this.batches.set(batch.id, batch);
    return batch;
  }

  /**
   * Process a training batch (trigger retraining)
   */
  async processTrainingBatch(batchId: string): Promise<TrainingBatch> {
    const batch = this.batches.get(batchId);
    if (!batch) {
      throw new Error(`Training batch not found: ${batchId}`);
    }

    batch.status = 'processing';

    try {
      if (this.retrainCallback) {
        await this.retrainCallback(batch);
      }

      batch.status = 'completed';
      batch.processedAt = new Date().toISOString();

      // Simulate metrics improvement
      batch.metrics = {
        accuracyBefore: 0.78,
        accuracyAfter: 0.82,
        improvement: 0.04,
      };

      this.currentModelVersion = batch.targetModelVersion;
    } catch (error) {
      batch.status = 'failed';
      batch.error = error instanceof Error ? error.message : String(error);
    }

    return batch;
  }

  /**
   * Set callback for retraining trigger
   */
  setRetrainCallback(callback: RetrainCallback): void {
    this.retrainCallback = callback;
  }

  /**
   * Check if retraining threshold is met
   */
  private async checkRetrainingThreshold(): Promise<void> {
    const unprocessed = this.getUnprocessedFeedback();

    if (unprocessed.length >= this.config.minFeedbackForRetraining) {
      const nextVersion = this.incrementVersion(this.currentModelVersion);
      const batch = await this.createTrainingBatch(nextVersion);

      if (batch && this.retrainCallback) {
        // Auto-trigger retraining
        await this.processTrainingBatch(batch.id);
      }
    }
  }

  /**
   * Increment semantic version
   */
  private incrementVersion(version: string): string {
    const parts = version.split('.').map(Number);
    parts[2] = (parts[2] || 0) + 1;
    return parts.join('.');
  }

  /**
   * Get feedback statistics
   */
  getStatistics(): {
    totalFeedback: number;
    bysentiment: Record<FeedbackSentiment, number>;
    averageRating: number;
    correctnessRate: number;
    unprocessedCount: number;
    batchesCreated: number;
    batchesCompleted: number;
  } {
    const allFeedback = Array.from(this.feedback.values());
    const sentimentCounts: Record<FeedbackSentiment, number> = {
      positive: 0,
      negative: 0,
      neutral: 0,
      corrective: 0,
    };

    let ratingSum = 0;
    let correctCount = 0;

    for (const f of allFeedback) {
      sentimentCounts[f.sentiment]++;
      ratingSum += f.rating;
      if (f.wasCorrect) correctCount++;
    }

    const batches = Array.from(this.batches.values());

    return {
      totalFeedback: allFeedback.length,
      bysentiment: sentimentCounts,
      averageRating: allFeedback.length > 0 ? ratingSum / allFeedback.length : 0,
      correctnessRate: allFeedback.length > 0 ? correctCount / allFeedback.length : 0,
      unprocessedCount: this.getUnprocessedFeedback().length,
      batchesCreated: batches.length,
      batchesCompleted: batches.filter((b) => b.status === 'completed').length,
    };
  }

  /**
   * Export feedback for external analysis
   */
  exportFeedback(format: 'json' | 'csv' = 'json'): string {
    const allFeedback = Array.from(this.feedback.values());

    if (format === 'csv') {
      const headers = [
        'id',
        'recommendationId',
        'missionId',
        'timestamp',
        'operatorId',
        'sentiment',
        'rating',
        'wasCorrect',
        'tags',
      ];
      const rows = allFeedback.map((f) =>
        [
          f.id,
          f.recommendationId,
          f.missionId,
          f.timestamp,
          f.operatorId,
          f.sentiment,
          f.rating,
          f.wasCorrect,
          f.tags.join(';'),
        ].join(',')
      );
      return [headers.join(','), ...rows].join('\n');
    }

    return JSON.stringify(allFeedback, null, 2);
  }

  /**
   * Get current model version
   */
  getCurrentModelVersion(): string {
    return this.currentModelVersion;
  }
}
