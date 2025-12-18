import { v4 as uuid } from 'uuid';
import {
  UserFeedback,
  LearningContext,
  FusionResult,
} from '../types.js';
import { logger } from '../utils/logger.js';

interface ContextConfig {
  maxFeedbackHistory: number;
  learningThreshold: number; // Min feedback count to learn rule
  decayFactor: number; // How much old feedback decays
}

/**
 * Context Persistence Layer
 * Learns from user feedback and corrections to improve fusion over time
 */
export class ContextPersistence {
  private config: ContextConfig;
  private feedback: Map<string, UserFeedback[]> = new Map();
  private contexts: Map<string, LearningContext> = new Map();
  private corrections: Map<string, FieldCorrection[]> = new Map();

  constructor(config: Partial<ContextConfig> = {}) {
    this.config = {
      maxFeedbackHistory: config.maxFeedbackHistory ?? 1000,
      learningThreshold: config.learningThreshold ?? 3,
      decayFactor: config.decayFactor ?? 0.95,
    };
  }

  /**
   * Record user feedback on a fusion result
   */
  recordFeedback(
    userId: string,
    fusionResult: FusionResult,
    feedbackType: UserFeedback['feedbackType'],
    correction?: Record<string, unknown>,
    comment?: string
  ): UserFeedback {
    const feedback: UserFeedback = {
      id: uuid(),
      userId,
      targetType: 'fusion',
      targetId: fusionResult.id,
      feedbackType,
      correction,
      comment,
      createdAt: new Date(),
    };

    // Store feedback
    const key = fusionResult.id;
    const existing = this.feedback.get(key) || [];
    existing.push(feedback);

    // Trim old feedback
    if (existing.length > this.config.maxFeedbackHistory) {
      existing.shift();
    }
    this.feedback.set(key, existing);

    // Process feedback for learning
    this.processForLearning(fusionResult, feedback);

    logger.info('Feedback recorded', {
      feedbackId: feedback.id,
      targetId: fusionResult.id,
      type: feedbackType,
    });

    return feedback;
  }

  /**
   * Process feedback to learn patterns
   */
  private processForLearning(result: FusionResult, feedback: UserFeedback): void {
    if (feedback.feedbackType === 'correct') {
      // Reinforce current fusion rules
      this.reinforceFusionRules(result);
    } else if (feedback.correction) {
      // Learn from correction
      this.learnFromCorrection(result, feedback.correction);
    }
  }

  /**
   * Reinforce fusion rules that produced correct results
   */
  private reinforceFusionRules(result: FusionResult): void {
    for (const sourceId of result.lineage.sources) {
      const context = this.getOrCreateContext(sourceId);

      // Boost confidence in rules used for this fusion
      for (const rule of context.fusionRules) {
        rule.confidence = Math.min(1, rule.confidence + 0.05);
      }

      this.contexts.set(sourceId, context);
    }
  }

  /**
   * Learn from user corrections
   */
  private learnFromCorrection(
    result: FusionResult,
    correction: Record<string, unknown>
  ): void {
    for (const [field, correctValue] of Object.entries(correction)) {
      const wrongValue = result.fusedRecord[field];
      if (wrongValue === correctValue) continue;

      // Record correction
      const key = `${result.lineage.sources.join(',')}:${field}`;
      const corrections = this.corrections.get(key) || [];

      const existing = corrections.find(
        c => String(c.wrongValue) === String(wrongValue)
      );

      if (existing) {
        existing.correctValue = correctValue;
        existing.occurrences++;
      } else {
        corrections.push({
          field,
          wrongValue,
          correctValue,
          occurrences: 1,
          learnedAt: new Date(),
        });
      }

      this.corrections.set(key, corrections);

      // Check if we have enough data to create a rule
      if (corrections.length >= this.config.learningThreshold) {
        this.createCorrectionRule(result.lineage.sources, field, corrections);
      }
    }
  }

  /**
   * Create a learned correction rule
   */
  private createCorrectionRule(
    sourceIds: string[],
    field: string,
    corrections: FieldCorrection[]
  ): void {
    // Find most common correction pattern
    const sorted = corrections.sort((a, b) => b.occurrences - a.occurrences);
    const topCorrection = sorted[0];

    if (topCorrection.occurrences >= this.config.learningThreshold) {
      for (const sourceId of sourceIds) {
        const context = this.getOrCreateContext(sourceId);

        // Add or update rule
        const existingRule = context.fusionRules.find(
          r => r.pattern === `${field}:${String(topCorrection.wrongValue)}`
        );

        if (existingRule) {
          existingRule.confidence = Math.min(1, existingRule.confidence + 0.1);
          existingRule.learnedFrom.push(...corrections.map(c => String(c.wrongValue)));
        } else {
          context.fusionRules.push({
            pattern: `${field}:${String(topCorrection.wrongValue)}`,
            action: `replace:${String(topCorrection.correctValue)}`,
            confidence: 0.6,
            learnedFrom: corrections.map(c => String(c.wrongValue)),
          });
        }

        // Update corrections list
        context.corrections.push({
          field,
          wrongValue: topCorrection.wrongValue,
          correctValue: topCorrection.correctValue,
          occurrences: topCorrection.occurrences,
        });

        this.contexts.set(sourceId, context);

        logger.info('Learned correction rule', {
          sourceId,
          field,
          pattern: `${topCorrection.wrongValue} -> ${topCorrection.correctValue}`,
        });
      }
    }
  }

  /**
   * Apply learned corrections to a fusion result
   */
  applyLearnedCorrections(result: FusionResult): FusionResult {
    const corrected = { ...result.fusedRecord };
    const appliedCorrections: string[] = [];

    for (const sourceId of result.lineage.sources) {
      const context = this.contexts.get(sourceId);
      if (!context) continue;

      for (const correction of context.corrections) {
        if (corrected[correction.field] === correction.wrongValue) {
          corrected[correction.field] = correction.correctValue;
          appliedCorrections.push(
            `${correction.field}: ${String(correction.wrongValue)} -> ${String(correction.correctValue)}`
          );
        }
      }
    }

    if (appliedCorrections.length > 0) {
      logger.info('Applied learned corrections', {
        fusionId: result.id,
        corrections: appliedCorrections,
      });

      return {
        ...result,
        fusedRecord: corrected,
        lineage: {
          ...result.lineage,
          transformations: [
            ...result.lineage.transformations,
            `learned_corrections:${appliedCorrections.length}`,
          ],
        },
      };
    }

    return result;
  }

  /**
   * Get or create learning context for a source
   */
  private getOrCreateContext(sourceId: string): LearningContext {
    let context = this.contexts.get(sourceId);
    if (!context) {
      context = {
        sourceId,
        fusionRules: [],
        corrections: [],
        userPreferences: {},
      };
    }
    return context;
  }

  /**
   * Record user preference
   */
  recordPreference(
    sourceId: string,
    preferenceKey: string,
    value: unknown
  ): void {
    const context = this.getOrCreateContext(sourceId);
    context.userPreferences[preferenceKey] = value;
    this.contexts.set(sourceId, context);

    logger.info('Preference recorded', { sourceId, preferenceKey });
  }

  /**
   * Get user preference
   */
  getPreference(sourceId: string, preferenceKey: string): unknown {
    const context = this.contexts.get(sourceId);
    return context?.userPreferences[preferenceKey];
  }

  /**
   * Get learning context for a source
   */
  getContext(sourceId: string): LearningContext | undefined {
    return this.contexts.get(sourceId);
  }

  /**
   * Get all feedback for a target
   */
  getFeedback(targetId: string): UserFeedback[] {
    return this.feedback.get(targetId) || [];
  }

  /**
   * Get feedback statistics
   */
  getStats(): FeedbackStats {
    let totalFeedback = 0;
    let correct = 0;
    let incorrect = 0;

    for (const feedbackList of this.feedback.values()) {
      totalFeedback += feedbackList.length;
      for (const f of feedbackList) {
        if (f.feedbackType === 'correct') correct++;
        if (f.feedbackType === 'incorrect') incorrect++;
      }
    }

    const totalRules = Array.from(this.contexts.values())
      .reduce((sum, c) => sum + c.fusionRules.length, 0);

    const totalCorrections = Array.from(this.contexts.values())
      .reduce((sum, c) => sum + c.corrections.length, 0);

    return {
      totalFeedback,
      correctFeedback: correct,
      incorrectFeedback: incorrect,
      accuracyRate: totalFeedback > 0 ? correct / totalFeedback : 0,
      learnedRules: totalRules,
      learnedCorrections: totalCorrections,
    };
  }

  /**
   * Export context for persistence
   */
  exportContexts(): Record<string, LearningContext> {
    const result: Record<string, LearningContext> = {};
    for (const [key, value] of this.contexts) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Import contexts from storage
   */
  importContexts(data: Record<string, LearningContext>): void {
    for (const [key, value] of Object.entries(data)) {
      this.contexts.set(key, value);
    }
    logger.info('Imported learning contexts', { count: Object.keys(data).length });
  }

  /**
   * Decay old feedback (call periodically)
   */
  decayFeedback(): void {
    for (const context of this.contexts.values()) {
      for (const rule of context.fusionRules) {
        rule.confidence *= this.config.decayFactor;
      }
    }
  }
}

interface FieldCorrection {
  field: string;
  wrongValue: unknown;
  correctValue: unknown;
  occurrences: number;
  learnedAt: Date;
}

interface FeedbackStats {
  totalFeedback: number;
  correctFeedback: number;
  incorrectFeedback: number;
  accuracyRate: number;
  learnedRules: number;
  learnedCorrections: number;
}
