// server/src/conductor/premium-routing/thompson-sampling-engine.ts

import { Pool } from 'pg';
import Redis from 'ioredis';
import logger from '../../config/logger.js';
import { prometheusConductorMetrics } from '../observability/prometheus.js';

interface ContextFeatures {
  queryComplexity: number; // 0-1 complexity score
  queryLength: number; // Token count
  urgency: 'low' | 'medium' | 'high' | 'critical';
  taskType: string;
  domainSpecialty?: string; // Optional domain specialization
  expectedOutputLength: number; // Expected response tokens
  qualityRequirement: number; // 0-1 quality threshold
  budgetConstraint: number; // Available budget
  timeConstraint?: number; // Max latency in ms
}

interface ModelArm {
  modelId: string;
  contextHash: string; // Hash of context features
  alpha: number; // Success count + 1 (Beta distribution)
  beta: number; // Failure count + 1 (Beta distribution)
  rewardSum: number; // Cumulative reward
  pullCount: number; // Number of times selected
  lastUpdated: Date;
  qualityScore: number; // Average quality score
  costEfficiency: number; // Reward per dollar spent
  latencyScore: number; // Speed performance
  contextualReward: number; // Context-specific reward
}

interface BandidReward {
  qualityScore: number; // 0-1 quality rating
  costEfficiency: number; // Value per dollar
  speedScore: number; // Latency performance 0-1
  successFlag: boolean; // Binary success/failure
  userFeedback?: number; // Optional 1-5 user rating
  actualCost: number;
  actualLatency: number;
}

interface ThompsonSamplingResult {
  selectedModelId: string;
  sampledReward: number;
  explorationFactor: number;
  contextConfidence: number;
  reasoningTrace: string;
  fallbackRanking: string[];
}

export class ThompsonSamplingEngine {
  private pool: Pool;
  private redis: Redis;
  private contextualArms: Map<string, ModelArm[]> = new Map();
  private contextFeatureCache: Map<string, ContextFeatures> = new Map();
  private explorationDecay = 0.95; // Decay factor for exploration
  private minExplorationRate = 0.1; // Minimum exploration rate
  private contextSimilarityThreshold = 0.8;

  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.redis = new Redis(process.env.REDIS_URL);
  }

  async initialize(): Promise<void> {
    await this.redis.connect();
    await this.loadContextualArms();
    logger.info('Thompson Sampling Engine initialized with contextual bandits');
  }

  /**
   * Advanced Thompson Sampling with contextual features
   */
  async selectModel(
    availableModels: string[],
    contextFeatures: ContextFeatures,
    sessionId?: string,
  ): Promise<ThompsonSamplingResult> {
    const contextHash = this.hashContextFeatures(contextFeatures);
    const startTime = Date.now();

    try {
      // Get or create contextual arms for this context
      let contextArms = this.contextualArms.get(contextHash);
      if (!contextArms) {
        contextArms = await this.initializeContextualArms(
          availableModels,
          contextHash,
          contextFeatures,
        );
        this.contextualArms.set(contextHash, contextArms);
      }

      // Filter arms for available models
      const availableArms = contextArms.filter((arm) =>
        availableModels.includes(arm.modelId),
      );

      if (availableArms.length === 0) {
        throw new Error('No available models for contextual selection');
      }

      // Calculate exploration rate based on total pulls and time decay
      const totalPulls = availableArms.reduce(
        (sum, arm) => sum + arm.pullCount,
        0,
      );
      const explorationRate = Math.max(
        this.minExplorationRate,
        (1 / Math.sqrt(totalPulls + 1)) * this.explorationDecay,
      );

      // Sample from posterior distributions for each arm
      const sampledArms = availableArms.map((arm) => ({
        arm,
        sampledReward: this.sampleFromPosterior(
          arm,
          contextFeatures,
          explorationRate,
        ),
        contextualScore: this.calculateContextualScore(arm, contextFeatures),
      }));

      // Apply Upper Confidence Bound (UCB) for exploration bonus
      const ucbArms = sampledArms.map(
        ({ arm, sampledReward, contextualScore }) => {
          const ucbBonus = Math.sqrt(
            (2 * Math.log(totalPulls + 1)) / (arm.pullCount + 1),
          );
          const explorationBonus = explorationRate * ucbBonus;

          return {
            arm,
            finalScore: sampledReward + contextualScore + explorationBonus,
            sampledReward,
            explorationBonus,
            contextualScore,
          };
        },
      );

      // Select best arm with highest final score
      ucbArms.sort((a, b) => b.finalScore - a.finalScore);
      const selectedArm = ucbArms[0];

      // Calculate context confidence based on historical performance
      const contextConfidence = this.calculateContextConfidence(
        selectedArm.arm,
        contextFeatures,
      );

      // Generate reasoning trace
      const reasoningTrace = this.generateReasoningTrace(
        selectedArm,
        contextFeatures,
        explorationRate,
        totalPulls,
      );

      // Create fallback ranking
      const fallbackRanking = ucbArms.slice(1, 4).map((arm) => arm.arm.modelId);

      const result: ThompsonSamplingResult = {
        selectedModelId: selectedArm.arm.modelId,
        sampledReward: selectedArm.sampledReward,
        explorationFactor: explorationRate,
        contextConfidence,
        reasoningTrace,
        fallbackRanking,
      };

      // Update pull count immediately
      selectedArm.arm.pullCount++;
      selectedArm.arm.lastUpdated = new Date();
      await this.updateArmInDatabase(selectedArm.arm);

      // Record metrics
      const selectionTime = Date.now() - startTime;
      prometheusConductorMetrics.recordOperationalMetric(
        'thompson_sampling_selection_time',
        selectionTime,
        {
          selected_model: selectedArm.arm.modelId,
          context_hash: contextHash.substring(0, 8),
          exploration_rate: explorationRate.toFixed(3),
        },
      );

      prometheusConductorMetrics.recordOperationalEvent(
        'thompson_sampling_selection',
        true,
        {
          model_id: selectedArm.arm.modelId,
          context_confidence: contextConfidence.toFixed(2),
          total_pulls: totalPulls.toString(),
        },
      );

      logger.info('Thompson sampling selection completed', {
        selectedModel: selectedArm.arm.modelId,
        sampledReward: selectedArm.sampledReward,
        explorationRate,
        contextConfidence,
        selectionTime,
        sessionId,
      });

      return result;
    } catch (error) {
      const selectionTime = Date.now() - startTime;

      prometheusConductorMetrics.recordOperationalEvent(
        'thompson_sampling_error',
        false,
        { error_type: error.name, context_hash: contextHash.substring(0, 8) },
      );

      logger.error('Thompson sampling selection failed', {
        error: error.message,
        contextHash: contextHash.substring(0, 8),
        availableModels,
        selectionTime,
      });

      throw error;
    }
  }

  /**
   * Update arm with execution results for learning
   */
  async updateArm(
    modelId: string,
    contextFeatures: ContextFeatures,
    reward: BandidReward,
    sessionId?: string,
  ): Promise<void> {
    const contextHash = this.hashContextFeatures(contextFeatures);
    const contextArms = this.contextualArms.get(contextHash);

    if (!contextArms) {
      logger.warn('No contextual arms found for reward update', {
        modelId,
        contextHash,
      });
      return;
    }

    const arm = contextArms.find((a) => a.modelId === modelId);
    if (!arm) {
      logger.warn('Arm not found for reward update', { modelId, contextHash });
      return;
    }

    try {
      // Calculate composite reward score
      const compositeReward = this.calculateCompositeReward(
        reward,
        contextFeatures,
      );

      // Update Beta distribution parameters
      if (reward.successFlag) {
        arm.alpha += compositeReward;
      } else {
        arm.beta += 1 - compositeReward;
      }

      // Update running averages with exponential moving average
      const learningRate = 0.1;
      arm.qualityScore =
        arm.qualityScore * (1 - learningRate) +
        reward.qualityScore * learningRate;
      arm.costEfficiency =
        arm.costEfficiency * (1 - learningRate) +
        reward.costEfficiency * learningRate;
      arm.latencyScore =
        arm.latencyScore * (1 - learningRate) +
        (1 - Math.min(reward.actualLatency / 10000, 1)) * learningRate; // Normalize latency to 0-1 scale

      // Update contextual reward with context-specific weighting
      const contextWeight = this.calculateContextWeight(contextFeatures);
      arm.contextualReward =
        arm.contextualReward * (1 - contextWeight) +
        compositeReward * contextWeight;

      // Update cumulative metrics
      arm.rewardSum += compositeReward;
      arm.lastUpdated = new Date();

      // Persist to database and cache
      await this.updateArmInDatabase(arm);
      await this.cacheContextFeatures(contextHash, contextFeatures);

      // Record learning metrics
      prometheusConductorMetrics.recordOperationalMetric(
        'thompson_sampling_reward',
        compositeReward,
        {
          model_id: modelId,
          context_hash: contextHash.substring(0, 8),
          success: reward.successFlag.toString(),
        },
      );

      prometheusConductorMetrics.recordOperationalMetric(
        'model_quality_score',
        arm.qualityScore,
        { model_id: modelId, context_hash: contextHash.substring(0, 8) },
      );

      logger.info('Thompson sampling arm updated', {
        modelId,
        compositeReward,
        alpha: arm.alpha,
        beta: arm.beta,
        qualityScore: arm.qualityScore,
        costEfficiency: arm.costEfficiency,
        sessionId,
      });
    } catch (error) {
      logger.error('Failed to update Thompson sampling arm', {
        error: error.message,
        modelId,
        contextHash,
      });
    }
  }

  /**
   * Advanced Beta distribution sampling with contextual adjustments
   */
  private sampleFromPosterior(
    arm: ModelArm,
    contextFeatures: ContextFeatures,
    explorationRate: number,
  ): number {
    // Sample from Beta distribution
    const betaSample = this.sampleBetaDistribution(arm.alpha, arm.beta);

    // Apply contextual adjustments
    const contextualBonus = this.calculateContextualBonus(arm, contextFeatures);

    // Apply exploration bonus for less-explored arms
    const explorationBonus =
      explorationRate * (1 / Math.sqrt(arm.pullCount + 1));

    // Combine all factors
    const adjustedSample = Math.min(
      1,
      betaSample + contextualBonus + explorationBonus,
    );

    return adjustedSample;
  }

  /**
   * Calculate contextual score based on feature similarity
   */
  private calculateContextualScore(
    arm: ModelArm,
    contextFeatures: ContextFeatures,
  ): number {
    // Weight different contextual factors
    const weights = {
      complexity: 0.25,
      urgency: 0.2,
      taskType: 0.2,
      quality: 0.15,
      budget: 0.1,
      latency: 0.1,
    };

    let score = 0;

    // Complexity matching
    if (contextFeatures.queryComplexity > 0.7 && arm.qualityScore > 0.8) {
      score += weights.complexity * 0.8;
    } else if (
      contextFeatures.queryComplexity < 0.3 &&
      arm.costEfficiency > 0.7
    ) {
      score += weights.complexity * 0.8;
    }

    // Urgency matching
    const urgencyScores = { critical: 1.0, high: 0.8, medium: 0.5, low: 0.3 };
    if (contextFeatures.urgency === 'critical' && arm.latencyScore > 0.8) {
      score += weights.urgency;
    } else if (contextFeatures.urgency === 'low' && arm.costEfficiency > 0.8) {
      score += weights.urgency;
    }

    // Quality requirement matching
    if (contextFeatures.qualityRequirement > 0.8 && arm.qualityScore > 0.85) {
      score += weights.quality;
    }

    // Budget efficiency matching
    if (contextFeatures.budgetConstraint < 10 && arm.costEfficiency > 0.8) {
      score += weights.budget;
    }

    return Math.min(1, score);
  }

  /**
   * Calculate context confidence based on historical performance
   */
  private calculateContextConfidence(
    arm: ModelArm,
    contextFeatures: ContextFeatures,
  ): number {
    const pullCount = arm.pullCount;
    const successRate = arm.alpha / (arm.alpha + arm.beta);

    // Confidence increases with more data points and higher success rate
    const dataConfidence = Math.min(1, pullCount / 50); // Normalize to 50 pulls for full confidence
    const performanceConfidence = successRate;

    // Context-specific confidence adjustments
    const contextMatch = this.calculateContextualScore(arm, contextFeatures);

    return (
      dataConfidence * 0.4 + performanceConfidence * 0.4 + contextMatch * 0.2
    );
  }

  /**
   * Generate detailed reasoning trace for transparency
   */
  private generateReasoningTrace(
    selectedArm: any,
    contextFeatures: ContextFeatures,
    explorationRate: number,
    totalPulls: number,
  ): string {
    const arm = selectedArm.arm;
    const successRate = ((arm.alpha / (arm.alpha + arm.beta)) * 100).toFixed(1);

    return (
      `Selected model ${arm.modelId} based on Thompson Sampling with contextual bandits. ` +
      `Sampled reward: ${selectedArm.sampledReward.toFixed(3)}, ` +
      `Historical success rate: ${successRate}%, ` +
      `Pull count: ${arm.pullCount}, ` +
      `Quality score: ${(arm.qualityScore * 100).toFixed(1)}%, ` +
      `Cost efficiency: ${(arm.costEfficiency * 100).toFixed(1)}%, ` +
      `Contextual match: ${(selectedArm.contextualScore * 100).toFixed(1)}%, ` +
      `Exploration rate: ${(explorationRate * 100).toFixed(1)}%, ` +
      `Total arms pulled: ${totalPulls}. ` +
      `Context: ${contextFeatures.taskType}, urgency=${contextFeatures.urgency}, ` +
      `complexity=${(contextFeatures.queryComplexity * 100).toFixed(0)}%.`
    );
  }

  /**
   * Calculate composite reward from multiple performance metrics
   */
  private calculateCompositeReward(
    reward: BandidReward,
    contextFeatures: ContextFeatures,
  ): number {
    // Dynamic weights based on context
    const weights = this.calculateRewardWeights(contextFeatures);

    const compositeReward =
      reward.qualityScore * weights.quality +
      reward.costEfficiency * weights.cost +
      reward.speedScore * weights.speed +
      (reward.successFlag ? 1 : 0) * weights.success +
      ((reward.userFeedback || 3) / 5) * weights.feedback;

    return Math.min(1, Math.max(0, compositeReward));
  }

  /**
   * Calculate context-specific reward weights
   */
  private calculateRewardWeights(contextFeatures: ContextFeatures): any {
    const urgencyWeights = {
      critical: {
        quality: 0.2,
        cost: 0.1,
        speed: 0.4,
        success: 0.2,
        feedback: 0.1,
      },
      high: {
        quality: 0.3,
        cost: 0.15,
        speed: 0.3,
        success: 0.15,
        feedback: 0.1,
      },
      medium: {
        quality: 0.35,
        cost: 0.25,
        speed: 0.2,
        success: 0.1,
        feedback: 0.1,
      },
      low: {
        quality: 0.3,
        cost: 0.4,
        speed: 0.15,
        success: 0.05,
        feedback: 0.1,
      },
    };

    const baseWeights =
      urgencyWeights[contextFeatures.urgency] || urgencyWeights.medium;

    // Adjust weights based on quality requirements
    if (contextFeatures.qualityRequirement > 0.8) {
      baseWeights.quality *= 1.2;
      baseWeights.cost *= 0.8;
    }

    // Adjust weights based on budget constraints
    if (contextFeatures.budgetConstraint < 5) {
      baseWeights.cost *= 1.3;
      baseWeights.quality *= 0.9;
    }

    return baseWeights;
  }

  /**
   * Calculate contextual bonus for similar contexts
   */
  private calculateContextualBonus(
    arm: ModelArm,
    contextFeatures: ContextFeatures,
  ): number {
    // Find similar contexts and apply transfer learning
    const similarContexts = this.findSimilarContexts(contextFeatures);
    let bonusSum = 0;
    let bonusCount = 0;

    for (const [contextHash, similarity] of similarContexts) {
      const contextArms = this.contextualArms.get(contextHash);
      const similarArm = contextArms?.find((a) => a.modelId === arm.modelId);

      if (similarArm && similarity > this.contextSimilarityThreshold) {
        const transferReward = similarArm.contextualReward * similarity;
        bonusSum += transferReward;
        bonusCount++;
      }
    }

    return bonusCount > 0 ? (bonusSum / bonusCount) * 0.1 : 0; // Small bonus for similar contexts
  }

  /**
   * Find similar contexts based on feature distance
   */
  private findSimilarContexts(
    contextFeatures: ContextFeatures,
  ): Array<[string, number]> {
    const similarities: Array<[string, number]> = [];

    for (const [contextHash, cachedFeatures] of this.contextFeatureCache) {
      const similarity = this.calculateContextSimilarity(
        contextFeatures,
        cachedFeatures,
      );
      if (similarity > 0.5) {
        // Only consider reasonably similar contexts
        similarities.push([contextHash, similarity]);
      }
    }

    return similarities.sort((a, b) => b[1] - a[1]).slice(0, 5); // Top 5 similar contexts
  }

  /**
   * Calculate similarity between two contexts
   */
  private calculateContextSimilarity(
    context1: ContextFeatures,
    context2: ContextFeatures,
  ): number {
    let similarity = 0;
    let factors = 0;

    // Task type similarity
    if (context1.taskType === context2.taskType) {
      similarity += 0.3;
    }
    factors += 0.3;

    // Urgency similarity
    const urgencyMap = { low: 0, medium: 1, high: 2, critical: 3 };
    const urgencyDiff = Math.abs(
      urgencyMap[context1.urgency] - urgencyMap[context2.urgency],
    );
    similarity += (1 - urgencyDiff / 3) * 0.2;
    factors += 0.2;

    // Complexity similarity
    const complexityDiff = Math.abs(
      context1.queryComplexity - context2.queryComplexity,
    );
    similarity += (1 - complexityDiff) * 0.2;
    factors += 0.2;

    // Quality requirement similarity
    const qualityDiff = Math.abs(
      context1.qualityRequirement - context2.qualityRequirement,
    );
    similarity += (1 - qualityDiff) * 0.15;
    factors += 0.15;

    // Budget similarity (normalized)
    const budgetDiff =
      Math.abs(context1.budgetConstraint - context2.budgetConstraint) /
      Math.max(context1.budgetConstraint, context2.budgetConstraint, 1);
    similarity += (1 - budgetDiff) * 0.15;
    factors += 0.15;

    return similarity / factors;
  }

  // Utility methods
  private hashContextFeatures(features: ContextFeatures): string {
    const key = `${features.taskType}-${features.urgency}-${Math.floor(features.queryComplexity * 10)}-${Math.floor(features.qualityRequirement * 10)}-${Math.floor(features.budgetConstraint / 5)}`;
    return require('crypto').createHash('md5').update(key).digest('hex');
  }

  private calculateContextWeight(contextFeatures: ContextFeatures): number {
    // Higher weight for more specific/constrainted contexts
    let weight = 0.1; // Base weight

    if (contextFeatures.qualityRequirement > 0.8) weight += 0.1;
    if (contextFeatures.urgency === 'critical') weight += 0.15;
    if (contextFeatures.queryComplexity > 0.7) weight += 0.1;
    if (contextFeatures.budgetConstraint < 10) weight += 0.05;

    return Math.min(0.5, weight); // Max 50% contextual weighting
  }

  private sampleBetaDistribution(alpha: number, beta: number): number {
    // Use Gamma distribution sampling to generate Beta samples
    const gammaA = this.sampleGammaDistribution(alpha, 1);
    const gammaB = this.sampleGammaDistribution(beta, 1);

    return gammaA / (gammaA + gammaB);
  }

  private sampleGammaDistribution(shape: number, rate: number): number {
    // Simple Gamma distribution sampling using Marsaglia-Tsang method
    // For production, use a proper statistical library
    if (shape < 1) {
      return (
        this.sampleGammaDistribution(shape + 1, rate) *
        Math.pow(Math.random(), 1 / shape)
      );
    }

    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);

    while (true) {
      let x: number;
      let v: number;

      do {
        x = this.sampleNormalDistribution(0, 1);
        v = 1 + c * x;
      } while (v <= 0);

      v = v * v * v;
      const u = Math.random();

      if (u < 1 - 0.0331 * x * x * x * x) {
        return (d * v) / rate;
      }

      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
        return (d * v) / rate;
      }
    }
  }

  private sampleNormalDistribution(mean: number, stdDev: number): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + stdDev * z0;
  }

  // Database operations
  private async initializeContextualArms(
    modelIds: string[],
    contextHash: string,
    contextFeatures: ContextFeatures,
  ): Promise<ModelArm[]> {
    const arms: ModelArm[] = [];

    for (const modelId of modelIds) {
      const arm: ModelArm = {
        modelId,
        contextHash,
        alpha: 1, // Optimistic prior
        beta: 1,
        rewardSum: 0,
        pullCount: 0,
        lastUpdated: new Date(),
        qualityScore: 0.5,
        costEfficiency: 0.5,
        latencyScore: 0.5,
        contextualReward: 0.5,
      };

      arms.push(arm);
      await this.updateArmInDatabase(arm);
    }

    return arms;
  }

  private async loadContextualArms(): Promise<void> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT model_id, context_hash, alpha, beta, reward_sum, pull_count,
               last_updated, quality_score, cost_efficiency, latency_score, contextual_reward
        FROM thompson_sampling_arms 
        WHERE last_updated > NOW() - INTERVAL '30 days'
      `);

      for (const row of result.rows) {
        const contextHash = row.context_hash;
        const arm: ModelArm = {
          modelId: row.model_id,
          contextHash: row.context_hash,
          alpha: parseFloat(row.alpha),
          beta: parseFloat(row.beta),
          rewardSum: parseFloat(row.reward_sum),
          pullCount: parseInt(row.pull_count),
          lastUpdated: row.last_updated,
          qualityScore: parseFloat(row.quality_score),
          costEfficiency: parseFloat(row.cost_efficiency),
          latencyScore: parseFloat(row.latency_score),
          contextualReward: parseFloat(row.contextual_reward),
        };

        if (!this.contextualArms.has(contextHash)) {
          this.contextualArms.set(contextHash, []);
        }
        this.contextualArms.get(contextHash)!.push(arm);
      }

      logger.info(
        `Loaded ${result.rows.length} Thompson sampling arms across ${this.contextualArms.size} contexts`,
      );
    } finally {
      client.release();
    }
  }

  private async updateArmInDatabase(arm: ModelArm): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `
        INSERT INTO thompson_sampling_arms (
          model_id, context_hash, alpha, beta, reward_sum, pull_count,
          last_updated, quality_score, cost_efficiency, latency_score, contextual_reward
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (model_id, context_hash) 
        DO UPDATE SET 
          alpha = $3, beta = $4, reward_sum = $5, pull_count = $6,
          last_updated = $7, quality_score = $8, cost_efficiency = $9,
          latency_score = $10, contextual_reward = $11
      `,
        [
          arm.modelId,
          arm.contextHash,
          arm.alpha,
          arm.beta,
          arm.rewardSum,
          arm.pullCount,
          arm.lastUpdated,
          arm.qualityScore,
          arm.costEfficiency,
          arm.latencyScore,
          arm.contextualReward,
        ],
      );
    } finally {
      client.release();
    }
  }

  private async cacheContextFeatures(
    contextHash: string,
    features: ContextFeatures,
  ): Promise<void> {
    this.contextFeatureCache.set(contextHash, features);

    // Cache in Redis with TTL
    await this.redis.setex(
      `context_features:${contextHash}`,
      7 * 24 * 60 * 60, // 7 days TTL
      JSON.stringify(features),
    );
  }
}
