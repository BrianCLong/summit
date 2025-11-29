/**
 * ContinualLearningSystem - Online Learning and Adaptation
 *
 * Implements continual learning capabilities:
 * - Concept drift detection and adaptation
 * - Regime shift identification
 * - Experience replay and consolidation
 * - Model parameter updates with safety constraints
 * - A/B testing of control policies
 * - Knowledge distillation from outcomes
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import type {
  CognitionSession,
  Decision,
  Outcome,
  Learning,
  Pattern,
  ReasoningStep,
  ObservedMetric,
} from '../types/index.js';

const logger = pino({ name: 'ContinualLearningSystem' });

export interface LearningConfig {
  learningRate: number;
  batchSize: number;
  experienceBufferSize: number;
  driftThreshold: number;
  adaptationSpeed: 'SLOW' | 'MEDIUM' | 'FAST';
  enableOnlineLearning: boolean;
  safetyMargin: number;
  consolidationInterval: number;
}

export interface LearningState {
  totalExperiences: number;
  learnedPatterns: number;
  driftEvents: number;
  lastConsolidation: Date;
  modelVersion: string;
  performance: PerformanceMetrics;
}

export interface PerformanceMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  meanAbsoluteError: number;
  predictionLatency: number;
}

export interface Experience {
  id: string;
  sessionId: string;
  decision: Decision;
  outcome: Outcome;
  context: ExperienceContext;
  reward: number;
  timestamp: Date;
  used: boolean;
}

export interface ExperienceContext {
  twinState: Record<string, unknown>;
  reasoningTrace: ReasoningStep[];
  environmentState: Record<string, unknown>;
}

export interface DriftDetection {
  detected: boolean;
  type: 'GRADUAL' | 'SUDDEN' | 'RECURRING' | 'NONE';
  magnitude: number;
  affectedFeatures: string[];
  confidence: number;
  timestamp: Date;
}

export interface PolicyExperiment {
  id: string;
  name: string;
  hypotheses: PolicyHypothesis[];
  status: 'RUNNING' | 'COMPLETED' | 'ABORTED';
  startedAt: Date;
  completedAt?: Date;
  results?: ExperimentResults;
}

export interface PolicyHypothesis {
  id: string;
  name: string;
  policy: PolicyDefinition;
  allocation: number;
  metrics: Map<string, number[]>;
}

export interface PolicyDefinition {
  type: string;
  parameters: Record<string, unknown>;
  constraints: Record<string, unknown>;
}

export interface ExperimentResults {
  winner: string;
  confidence: number;
  metrics: Record<string, number>;
  statisticalSignificance: number;
}

export interface KnowledgeUpdate {
  id: string;
  type: 'PATTERN' | 'RULE' | 'PARAMETER' | 'MODEL';
  content: unknown;
  source: string;
  confidence: number;
  applicability: string[];
  validFrom: Date;
  validUntil?: Date;
}

export class ContinualLearningSystem extends EventEmitter {
  private config: LearningConfig;
  private experienceBuffer: Experience[] = [];
  private learnedPatterns: Map<string, LearnedPattern> = new Map();
  private knowledgeBase: Map<string, KnowledgeUpdate> = new Map();
  private activeExperiments: Map<string, PolicyExperiment> = new Map();
  private driftHistory: DriftDetection[] = [];
  private featureStatistics: Map<string, FeatureStatistics> = new Map();
  private modelVersion: string = '1.0.0';

  constructor(config: Partial<LearningConfig> = {}) {
    super();
    this.config = {
      learningRate: config.learningRate ?? 0.01,
      batchSize: config.batchSize ?? 32,
      experienceBufferSize: config.experienceBufferSize ?? 10000,
      driftThreshold: config.driftThreshold ?? 0.15,
      adaptationSpeed: config.adaptationSpeed ?? 'MEDIUM',
      enableOnlineLearning: config.enableOnlineLearning ?? true,
      safetyMargin: config.safetyMargin ?? 0.1,
      consolidationInterval: config.consolidationInterval ?? 3600000, // 1 hour
    };

    // Start periodic consolidation
    if (this.config.enableOnlineLearning) {
      setInterval(() => this.consolidateKnowledge(), this.config.consolidationInterval);
    }
  }

  /**
   * Record a new experience from a completed decision
   */
  async recordExperience(
    session: CognitionSession,
    decision: Decision,
    outcome: Outcome,
  ): Promise<Experience> {
    const reward = this.calculateReward(decision, outcome);

    const experience: Experience = {
      id: uuidv4(),
      sessionId: session.id,
      decision,
      outcome,
      context: {
        twinState: session.context.twinState.properties,
        reasoningTrace: session.reasoningTrace,
        environmentState: this.extractEnvironmentState(session),
      },
      reward,
      timestamp: new Date(),
      used: false,
    };

    this.experienceBuffer.push(experience);

    // Maintain buffer size
    while (this.experienceBuffer.length > this.config.experienceBufferSize) {
      this.experienceBuffer.shift();
    }

    // Update feature statistics for drift detection
    this.updateFeatureStatistics(experience);

    // Trigger online learning if enabled
    if (this.config.enableOnlineLearning) {
      await this.learnFromExperience(experience);
    }

    this.emit('experience:recorded', { experienceId: experience.id, reward });
    logger.debug({ experienceId: experience.id, reward }, 'Experience recorded');

    return experience;
  }

  private calculateReward(decision: Decision, outcome: Outcome): number {
    let reward = 0;

    // Base reward from success
    if (outcome.success) {
      reward += 1.0;
    } else {
      reward -= 0.5;
    }

    // Adjust based on metric performance
    for (const metric of outcome.metrics) {
      if (metric.withinTolerance) {
        reward += 0.2;
      } else {
        const deviationPenalty = Math.min(1, Math.abs(metric.deviation));
        reward -= deviationPenalty * 0.3;
      }
    }

    // Adjust based on confidence alignment
    const confidenceBonus =
      (decision.confidence - 0.5) * (outcome.success ? 0.2 : -0.2);
    reward += confidenceBonus;

    // Normalize to [-1, 1]
    return Math.max(-1, Math.min(1, reward));
  }

  private extractEnvironmentState(session: CognitionSession): Record<string, unknown> {
    return {
      marketContext: session.context.marketContext,
      weatherContext: session.context.weatherContext,
      activeAlerts: session.context.activeAlerts.length,
      recognizedPatterns: session.context.recognizedPatterns.length,
    };
  }

  /**
   * Learn from a single experience (online learning)
   */
  private async learnFromExperience(experience: Experience): Promise<void> {
    // Extract learnable insights
    const insights = this.extractInsights(experience);

    for (const insight of insights) {
      // Check if this updates existing knowledge
      const existingKey = this.findSimilarKnowledge(insight);

      if (existingKey) {
        // Update existing knowledge with weighted average
        const existing = this.knowledgeBase.get(existingKey)!;
        this.updateKnowledge(existing, insight, experience.reward);
      } else {
        // Add new knowledge
        this.knowledgeBase.set(insight.id, insight);
        this.emit('knowledge:added', insight);
      }
    }

    // Update pattern library
    await this.updatePatterns(experience);

    experience.used = true;
  }

  private extractInsights(experience: Experience): KnowledgeUpdate[] {
    const insights: KnowledgeUpdate[] = [];

    // Extract from successful decisions
    if (experience.outcome.success && experience.reward > 0.5) {
      insights.push({
        id: uuidv4(),
        type: 'RULE',
        content: {
          condition: this.summarizeContext(experience.context),
          action: experience.decision.action.type,
          parameters: experience.decision.action.parameters,
        },
        source: experience.sessionId,
        confidence: experience.decision.confidence * (0.5 + experience.reward * 0.5),
        applicability: [experience.decision.type],
        validFrom: new Date(),
      });
    }

    // Extract parameter adjustments
    if (experience.decision.type === 'CONTROL_ADJUSTMENT') {
      const effectiveParams = this.extractEffectiveParameters(experience);
      if (effectiveParams) {
        insights.push({
          id: uuidv4(),
          type: 'PARAMETER',
          content: effectiveParams,
          source: experience.sessionId,
          confidence: 0.5 + experience.reward * 0.5,
          applicability: ['CONTROL_ADJUSTMENT'],
          validFrom: new Date(),
        });
      }
    }

    return insights;
  }

  private summarizeContext(context: ExperienceContext): Record<string, unknown> {
    const summary: Record<string, unknown> = {};

    // Extract key state features
    for (const [key, value] of Object.entries(context.twinState)) {
      if (typeof value === 'number') {
        summary[`state_${key}`] = this.discretize(value);
      } else if (typeof value === 'boolean') {
        summary[`state_${key}`] = value;
      }
    }

    // Extract reasoning characteristics
    summary['reasoning_paradigms'] = [
      ...new Set(context.reasoningTrace.map((r) => r.paradigm)),
    ];
    summary['reasoning_confidence'] =
      context.reasoningTrace.length > 0
        ? context.reasoningTrace.reduce((s, r) => s + r.confidence, 0) /
          context.reasoningTrace.length
        : 0;

    return summary;
  }

  private discretize(value: number): string {
    if (value < 0.2) return 'VERY_LOW';
    if (value < 0.4) return 'LOW';
    if (value < 0.6) return 'MEDIUM';
    if (value < 0.8) return 'HIGH';
    return 'VERY_HIGH';
  }

  private extractEffectiveParameters(
    experience: Experience,
  ): Record<string, unknown> | null {
    if (!experience.outcome.success) return null;

    return {
      parameters: experience.decision.action.parameters,
      effectiveRange: this.estimateEffectiveRange(experience),
    };
  }

  private estimateEffectiveRange(experience: Experience): Record<string, unknown> {
    const range: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(
      experience.decision.action.parameters,
    )) {
      if (typeof value === 'number') {
        range[key] = {
          optimal: value,
          min: value * 0.9,
          max: value * 1.1,
        };
      }
    }

    return range;
  }

  private findSimilarKnowledge(insight: KnowledgeUpdate): string | null {
    for (const [key, existing] of this.knowledgeBase) {
      if (existing.type !== insight.type) continue;

      // Compare content similarity
      const similarity = this.calculateContentSimilarity(
        existing.content,
        insight.content,
      );
      if (similarity > 0.8) {
        return key;
      }
    }

    return null;
  }

  private calculateContentSimilarity(a: unknown, b: unknown): number {
    const aStr = JSON.stringify(a);
    const bStr = JSON.stringify(b);

    // Simple Jaccard similarity on tokens
    const aTokens = new Set(aStr.toLowerCase().split(/\W+/));
    const bTokens = new Set(bStr.toLowerCase().split(/\W+/));

    const intersection = new Set([...aTokens].filter((x) => bTokens.has(x)));
    const union = new Set([...aTokens, ...bTokens]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private updateKnowledge(
    existing: KnowledgeUpdate,
    newInsight: KnowledgeUpdate,
    reward: number,
  ): void {
    // Weighted update based on reward
    const weight = 0.5 + reward * 0.5;
    existing.confidence =
      existing.confidence * (1 - this.config.learningRate * weight) +
      newInsight.confidence * (this.config.learningRate * weight);

    // Extend applicability
    existing.applicability = [
      ...new Set([...existing.applicability, ...newInsight.applicability]),
    ];

    this.emit('knowledge:updated', existing);
  }

  /**
   * Update pattern library based on experience
   */
  private async updatePatterns(experience: Experience): Promise<void> {
    // Look for recurring patterns in the context
    const contextFingerprint = this.createContextFingerprint(experience.context);

    const existingPattern = this.learnedPatterns.get(contextFingerprint);
    if (existingPattern) {
      // Update pattern statistics
      existingPattern.occurrences++;
      existingPattern.lastSeen = new Date();
      existingPattern.avgReward =
        (existingPattern.avgReward * (existingPattern.occurrences - 1) +
          experience.reward) /
        existingPattern.occurrences;

      // Learn best action for this pattern
      if (experience.reward > existingPattern.bestReward) {
        existingPattern.bestAction = experience.decision.action;
        existingPattern.bestReward = experience.reward;
      }
    } else if (experience.reward > 0) {
      // Create new pattern
      const pattern: LearnedPattern = {
        id: uuidv4(),
        fingerprint: contextFingerprint,
        description: `Pattern from session ${experience.sessionId}`,
        occurrences: 1,
        lastSeen: new Date(),
        avgReward: experience.reward,
        bestAction: experience.decision.action,
        bestReward: experience.reward,
        confidence: 0.5,
      };
      this.learnedPatterns.set(contextFingerprint, pattern);
    }
  }

  private createContextFingerprint(context: ExperienceContext): string {
    const features: string[] = [];

    // Extract key features from context
    for (const [key, value] of Object.entries(context.twinState)) {
      if (typeof value === 'number') {
        features.push(`${key}:${this.discretize(value)}`);
      } else if (typeof value === 'boolean') {
        features.push(`${key}:${value}`);
      }
    }

    // Sort for consistency
    features.sort();
    return features.join('|');
  }

  /**
   * Detect concept drift in feature distributions
   */
  async detectDrift(): Promise<DriftDetection> {
    const affectedFeatures: string[] = [];
    let maxDrift = 0;

    for (const [feature, stats] of this.featureStatistics) {
      if (stats.recentValues.length < 50) continue;

      // Compare recent window to historical distribution
      const recentMean =
        stats.recentValues.reduce((a, b) => a + b, 0) / stats.recentValues.length;
      const drift = Math.abs(recentMean - stats.historicalMean) / (stats.historicalStd || 1);

      if (drift > this.config.driftThreshold) {
        affectedFeatures.push(feature);
        maxDrift = Math.max(maxDrift, drift);
      }
    }

    const detected = affectedFeatures.length > 0;
    const driftType = this.classifyDriftType(affectedFeatures);

    const detection: DriftDetection = {
      detected,
      type: driftType,
      magnitude: maxDrift,
      affectedFeatures,
      confidence: detected ? Math.min(0.95, 0.5 + maxDrift * 0.3) : 0,
      timestamp: new Date(),
    };

    if (detected) {
      this.driftHistory.push(detection);
      this.emit('drift:detected', detection);
      logger.warn({ detection }, 'Concept drift detected');

      // Trigger adaptation
      await this.adaptToDrift(detection);
    }

    return detection;
  }

  private classifyDriftType(
    affectedFeatures: string[],
  ): DriftDetection['type'] {
    if (affectedFeatures.length === 0) return 'NONE';

    // Check for recurring drift
    const recentDrifts = this.driftHistory.filter(
      (d) =>
        d.detected &&
        Date.now() - d.timestamp.getTime() < 24 * 3600 * 1000,
    );

    if (recentDrifts.length >= 3) {
      const recurring = recentDrifts.filter((d) =>
        d.affectedFeatures.some((f) => affectedFeatures.includes(f)),
      );
      if (recurring.length >= 2) return 'RECURRING';
    }

    // Check for sudden vs gradual
    const recentStats = this.featureStatistics.get(affectedFeatures[0]);
    if (recentStats) {
      const changeRate =
        Math.abs(
          recentStats.recentValues[recentStats.recentValues.length - 1] -
            recentStats.recentValues[0],
        ) / recentStats.recentValues.length;

      if (changeRate > 0.1) return 'SUDDEN';
    }

    return 'GRADUAL';
  }

  /**
   * Adapt to detected drift
   */
  private async adaptToDrift(drift: DriftDetection): Promise<void> {
    const adaptationSpeed = {
      SLOW: 0.005,
      MEDIUM: 0.01,
      FAST: 0.02,
    }[this.config.adaptationSpeed];

    // Reset feature statistics for affected features
    for (const feature of drift.affectedFeatures) {
      const stats = this.featureStatistics.get(feature);
      if (stats) {
        // Gradually shift historical mean towards recent mean
        const recentMean =
          stats.recentValues.reduce((a, b) => a + b, 0) /
          stats.recentValues.length;
        stats.historicalMean =
          stats.historicalMean * (1 - adaptationSpeed) +
          recentMean * adaptationSpeed;
      }
    }

    // Reduce confidence in affected knowledge
    for (const knowledge of this.knowledgeBase.values()) {
      const affected = drift.affectedFeatures.some((f) =>
        JSON.stringify(knowledge.content).includes(f),
      );
      if (affected) {
        knowledge.confidence *= 0.9;
      }
    }

    // Increase learning rate temporarily
    this.config.learningRate *= 1.5;
    setTimeout(() => {
      this.config.learningRate /= 1.5;
    }, 3600000); // Reset after 1 hour

    this.emit('adaptation:completed', { drift, newLearningRate: this.config.learningRate });
  }

  private updateFeatureStatistics(experience: Experience): void {
    for (const [key, value] of Object.entries(experience.context.twinState)) {
      if (typeof value !== 'number') continue;

      let stats = this.featureStatistics.get(key);
      if (!stats) {
        stats = {
          historicalMean: value,
          historicalStd: 1,
          recentValues: [],
        };
        this.featureStatistics.set(key, stats);
      }

      stats.recentValues.push(value);
      if (stats.recentValues.length > 100) {
        stats.recentValues.shift();
      }

      // Update historical statistics with exponential moving average
      stats.historicalMean = stats.historicalMean * 0.99 + value * 0.01;
      const deviation = Math.abs(value - stats.historicalMean);
      stats.historicalStd = stats.historicalStd * 0.99 + deviation * 0.01;
    }
  }

  /**
   * Start an A/B test for policy comparison
   */
  async startExperiment(
    name: string,
    policies: PolicyDefinition[],
  ): Promise<PolicyExperiment> {
    const experiment: PolicyExperiment = {
      id: uuidv4(),
      name,
      hypotheses: policies.map((policy, i) => ({
        id: uuidv4(),
        name: `Policy ${i + 1}`,
        policy,
        allocation: 1 / policies.length,
        metrics: new Map(),
      })),
      status: 'RUNNING',
      startedAt: new Date(),
    };

    this.activeExperiments.set(experiment.id, experiment);
    this.emit('experiment:started', experiment);

    logger.info({ experimentId: experiment.id, name }, 'Experiment started');

    return experiment;
  }

  /**
   * Record experiment outcome
   */
  async recordExperimentOutcome(
    experimentId: string,
    hypothesisId: string,
    metricName: string,
    value: number,
  ): Promise<void> {
    const experiment = this.activeExperiments.get(experimentId);
    if (!experiment || experiment.status !== 'RUNNING') return;

    const hypothesis = experiment.hypotheses.find((h) => h.id === hypothesisId);
    if (!hypothesis) return;

    const metrics = hypothesis.metrics.get(metricName) ?? [];
    metrics.push(value);
    hypothesis.metrics.set(metricName, metrics);

    // Check if we have enough data to conclude
    await this.checkExperimentCompletion(experiment);
  }

  private async checkExperimentCompletion(experiment: PolicyExperiment): Promise<void> {
    const minSamples = 100;

    // Check if all hypotheses have enough samples
    const allHaveEnough = experiment.hypotheses.every((h) => {
      const primaryMetric = h.metrics.values().next().value;
      return primaryMetric && primaryMetric.length >= minSamples;
    });

    if (!allHaveEnough) return;

    // Run statistical test
    const results = this.analyzeExperiment(experiment);

    if (results.statisticalSignificance > 0.95) {
      experiment.status = 'COMPLETED';
      experiment.completedAt = new Date();
      experiment.results = results;

      this.emit('experiment:completed', { experiment, results });

      // Apply winning policy
      await this.applyWinningPolicy(experiment, results);
    }
  }

  private analyzeExperiment(experiment: PolicyExperiment): ExperimentResults {
    const hypothesisStats: Array<{ id: string; mean: number; std: number; n: number }> = [];

    for (const hypothesis of experiment.hypotheses) {
      const primaryMetric = hypothesis.metrics.values().next().value ?? [];
      if (primaryMetric.length === 0) continue;

      const mean = primaryMetric.reduce((a: number, b: number) => a + b, 0) / primaryMetric.length;
      const std = Math.sqrt(
        primaryMetric.reduce((sum: number, v: number) => sum + Math.pow(v - mean, 2), 0) /
          primaryMetric.length,
      );

      hypothesisStats.push({
        id: hypothesis.id,
        mean,
        std,
        n: primaryMetric.length,
      });
    }

    if (hypothesisStats.length < 2) {
      return {
        winner: experiment.hypotheses[0]?.id ?? 'unknown',
        confidence: 0,
        metrics: {},
        statisticalSignificance: 0,
      };
    }

    // Find best performing hypothesis
    hypothesisStats.sort((a, b) => b.mean - a.mean);
    const winner = hypothesisStats[0];
    const runnerUp = hypothesisStats[1];

    // Calculate t-test for statistical significance
    const pooledStd = Math.sqrt(
      (winner.std ** 2 / winner.n + runnerUp.std ** 2 / runnerUp.n),
    );
    const tStat = (winner.mean - runnerUp.mean) / pooledStd;

    // Approximate p-value (simplified)
    const significance = Math.min(0.999, 1 - Math.exp(-Math.abs(tStat) / 2));

    return {
      winner: winner.id,
      confidence: significance,
      metrics: {
        winnerMean: winner.mean,
        runnerUpMean: runnerUp.mean,
        difference: winner.mean - runnerUp.mean,
      },
      statisticalSignificance: significance,
    };
  }

  private async applyWinningPolicy(
    experiment: PolicyExperiment,
    results: ExperimentResults,
  ): Promise<void> {
    const winner = experiment.hypotheses.find((h) => h.id === results.winner);
    if (!winner) return;

    // Store as learned knowledge
    this.knowledgeBase.set(`policy_${experiment.id}`, {
      id: uuidv4(),
      type: 'PARAMETER',
      content: {
        experimentName: experiment.name,
        policy: winner.policy,
        performance: results.metrics,
      },
      source: experiment.id,
      confidence: results.confidence,
      applicability: ['POLICY'],
      validFrom: new Date(),
    });

    logger.info(
      { experimentId: experiment.id, winner: winner.name },
      'Winning policy applied',
    );
  }

  /**
   * Consolidate knowledge and patterns
   */
  async consolidateKnowledge(): Promise<void> {
    const startTime = Date.now();

    // Remove low-confidence knowledge
    for (const [key, knowledge] of this.knowledgeBase) {
      if (knowledge.confidence < 0.3) {
        this.knowledgeBase.delete(key);
      }
    }

    // Remove stale patterns
    const staleThreshold = Date.now() - 7 * 24 * 3600 * 1000; // 7 days
    for (const [key, pattern] of this.learnedPatterns) {
      if (pattern.lastSeen.getTime() < staleThreshold && pattern.occurrences < 5) {
        this.learnedPatterns.delete(key);
      }
    }

    // Merge similar patterns
    await this.mergeSimilarPatterns();

    // Update model version
    this.modelVersion = `1.0.${Date.now()}`;

    const duration = Date.now() - startTime;
    logger.info(
      {
        duration,
        knowledgeCount: this.knowledgeBase.size,
        patternCount: this.learnedPatterns.size,
      },
      'Knowledge consolidation completed',
    );

    this.emit('consolidation:completed', {
      knowledgeCount: this.knowledgeBase.size,
      patternCount: this.learnedPatterns.size,
      modelVersion: this.modelVersion,
    });
  }

  private async mergeSimilarPatterns(): Promise<void> {
    const patterns = Array.from(this.learnedPatterns.values());
    const toMerge: Array<[string, string]> = [];

    for (let i = 0; i < patterns.length; i++) {
      for (let j = i + 1; j < patterns.length; j++) {
        const similarity = this.calculatePatternSimilarity(patterns[i], patterns[j]);
        if (similarity > 0.8) {
          toMerge.push([patterns[i].fingerprint, patterns[j].fingerprint]);
        }
      }
    }

    for (const [fp1, fp2] of toMerge) {
      const pattern1 = this.learnedPatterns.get(fp1);
      const pattern2 = this.learnedPatterns.get(fp2);
      if (!pattern1 || !pattern2) continue;

      // Merge into pattern with more occurrences
      if (pattern1.occurrences >= pattern2.occurrences) {
        pattern1.occurrences += pattern2.occurrences;
        pattern1.avgReward =
          (pattern1.avgReward * pattern1.occurrences +
            pattern2.avgReward * pattern2.occurrences) /
          (pattern1.occurrences + pattern2.occurrences);
        if (pattern2.bestReward > pattern1.bestReward) {
          pattern1.bestAction = pattern2.bestAction;
          pattern1.bestReward = pattern2.bestReward;
        }
        this.learnedPatterns.delete(fp2);
      } else {
        pattern2.occurrences += pattern1.occurrences;
        this.learnedPatterns.delete(fp1);
      }
    }
  }

  private calculatePatternSimilarity(a: LearnedPattern, b: LearnedPattern): number {
    const aTokens = new Set(a.fingerprint.split('|'));
    const bTokens = new Set(b.fingerprint.split('|'));

    const intersection = new Set([...aTokens].filter((x) => bTokens.has(x)));
    const union = new Set([...aTokens, ...bTokens]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Get recommended action for a context
   */
  getRecommendedAction(context: ExperienceContext): {
    action: Decision['action'] | null;
    confidence: number;
    source: string;
  } {
    const fingerprint = this.createContextFingerprint(context);
    const pattern = this.learnedPatterns.get(fingerprint);

    if (pattern && pattern.confidence > 0.6) {
      return {
        action: pattern.bestAction,
        confidence: pattern.confidence,
        source: 'learned_pattern',
      };
    }

    // Try to find similar pattern
    let bestMatch: LearnedPattern | null = null;
    let bestSimilarity = 0;

    for (const pattern of this.learnedPatterns.values()) {
      const similarity = this.calculatePatternSimilarity(
        { fingerprint, id: '', description: '', occurrences: 0, lastSeen: new Date(), avgReward: 0, bestAction: null as any, bestReward: 0, confidence: 0 },
        pattern,
      );
      if (similarity > bestSimilarity && similarity > 0.5) {
        bestSimilarity = similarity;
        bestMatch = pattern;
      }
    }

    if (bestMatch) {
      return {
        action: bestMatch.bestAction,
        confidence: bestMatch.confidence * bestSimilarity,
        source: 'similar_pattern',
      };
    }

    return {
      action: null,
      confidence: 0,
      source: 'none',
    };
  }

  /**
   * Get learning state summary
   */
  getLearningState(): LearningState {
    const experiences = this.experienceBuffer;
    const usedExperiences = experiences.filter((e) => e.used);

    let accuracy = 0;
    let totalPredictions = 0;

    for (const exp of usedExperiences) {
      if (exp.outcome.success) accuracy++;
      totalPredictions++;
    }

    return {
      totalExperiences: experiences.length,
      learnedPatterns: this.learnedPatterns.size,
      driftEvents: this.driftHistory.filter((d) => d.detected).length,
      lastConsolidation: new Date(),
      modelVersion: this.modelVersion,
      performance: {
        accuracy: totalPredictions > 0 ? accuracy / totalPredictions : 0,
        precision: 0.8, // Placeholder
        recall: 0.75, // Placeholder
        f1Score: 0.77, // Placeholder
        meanAbsoluteError: 0.1, // Placeholder
        predictionLatency: 50, // ms
      },
    };
  }

  /**
   * Export learned knowledge for persistence
   */
  exportKnowledge(): {
    patterns: Array<LearnedPattern & { fingerprint: string }>;
    knowledge: KnowledgeUpdate[];
    version: string;
  } {
    return {
      patterns: Array.from(this.learnedPatterns.entries()).map(([fp, p]) => ({
        ...p,
        fingerprint: fp,
      })),
      knowledge: Array.from(this.knowledgeBase.values()),
      version: this.modelVersion,
    };
  }

  /**
   * Import previously learned knowledge
   */
  importKnowledge(data: ReturnType<typeof this.exportKnowledge>): void {
    for (const pattern of data.patterns) {
      this.learnedPatterns.set(pattern.fingerprint, pattern);
    }

    for (const knowledge of data.knowledge) {
      this.knowledgeBase.set(knowledge.id, knowledge);
    }

    this.modelVersion = data.version;
    logger.info(
      { patterns: data.patterns.length, knowledge: data.knowledge.length },
      'Knowledge imported',
    );
  }
}

// Supporting types
interface LearnedPattern {
  id: string;
  fingerprint: string;
  description: string;
  occurrences: number;
  lastSeen: Date;
  avgReward: number;
  bestAction: Decision['action'];
  bestReward: number;
  confidence: number;
}

interface FeatureStatistics {
  historicalMean: number;
  historicalStd: number;
  recentValues: number[];
}

export default ContinualLearningSystem;
