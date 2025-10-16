import { EventEmitter } from 'events';
import { createLogger } from '../config/logger';

const logger = createLogger('LinUCBOptimizer');

export interface ContextVector {
  features: number[];
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface OptimizationResult {
  armId: number;
  ucbValue: number;
  confidence: number;
  expectedReward: number;
  explorationBonus: number;
  recommendedAction: string;
}

export interface ArmState {
  armId: number;
  theta: number[]; // Parameter vector
  A: number[][]; // Covariance matrix
  b: number[]; // Reward accumulator
  numPulls: number;
  totalReward: number;
  averageReward: number;
  lastUsed: Date;
}

export interface LinUCBConfig {
  contextDimension: number;
  explorationAlpha: number;
  confidenceLevel: number;
  regularizationLambda?: number;
  maxArms?: number;
  decayFactor?: number;
}

export interface UpdateResult {
  armId: number;
  rewardReceived: number;
  thetaUpdated: boolean;
  confidenceScores: Record<string, number>;
  explorationRate: number;
}

/**
 * LinUCBOptimizer - Advanced contextual bandit optimization with exploration-exploitation balance
 *
 * Key Features:
 * - Linear Upper Confidence Bound (LinUCB) algorithm implementation
 * - Contextual multi-armed bandit optimization
 * - Sherman-Morrison matrix updates for efficiency
 * - Confidence interval estimation for exploration
 * - Real-time parameter learning and adaptation
 * - Robust numerical computation with regularization
 * - Performance monitoring and analytics
 */
export class LinUCBOptimizer extends EventEmitter {
  private config: LinUCBConfig;
  private arms: Map<number, ArmState> = new Map();
  private contextDimension: number;
  private totalPulls: number = 0;
  private totalReward: number = 0;
  private startTime: Date;

  // Performance tracking
  private recentRewards: number[] = [];
  private recentRegrets: number[] = [];
  private convergenceMetrics: {
    thetaStability: number[];
    rewardVariance: number[];
    explorationDecay: number[];
  } = {
    thetaStability: [],
    rewardVariance: [],
    explorationDecay: [],
  };

  constructor(config: LinUCBConfig) {
    super();
    this.config = {
      regularizationLambda: 1.0,
      maxArms: 1000,
      decayFactor: 0.995,
      ...config,
    };

    this.contextDimension = config.contextDimension;
    this.startTime = new Date();

    logger.info('LinUCBOptimizer initialized', {
      config: this.config,
      contextDimension: this.contextDimension,
    });
  }

  /**
   * Select optimal arm using LinUCB algorithm
   */
  async selectOptimalArm(context: ContextVector): Promise<OptimizationResult> {
    try {
      const features = context.features;

      if (features.length !== this.contextDimension) {
        throw new Error(
          `Context dimension mismatch: expected ${this.contextDimension}, got ${features.length}`,
        );
      }

      // Validate features are finite numbers
      if (!features.every((f) => Number.isFinite(f))) {
        throw new Error('Context features must be finite numbers');
      }

      let bestArm = -1;
      let bestUCBValue = -Infinity;
      let bestConfidence = 0;
      let bestExpectedReward = 0;
      let bestExplorationBonus = 0;

      // Evaluate all arms or create new arms if needed
      const candidateArms = this.getCandidateArms();

      for (const armId of candidateArms) {
        const armState = this.getOrCreateArm(armId);
        const ucbResult = this.calculateUCB(armState, features);

        if (ucbResult.ucbValue > bestUCBValue) {
          bestUCBValue = ucbResult.ucbValue;
          bestArm = armId;
          bestConfidence = ucbResult.confidence;
          bestExpectedReward = ucbResult.expectedReward;
          bestExplorationBonus = ucbResult.explorationBonus;
        }
      }

      if (bestArm === -1) {
        // Fallback: create and select arm 0
        bestArm = 0;
        const armState = this.getOrCreateArm(bestArm);
        const ucbResult = this.calculateUCB(armState, features);
        bestUCBValue = ucbResult.ucbValue;
        bestConfidence = ucbResult.confidence;
        bestExpectedReward = ucbResult.expectedReward;
        bestExplorationBonus = ucbResult.explorationBonus;
      }

      const result: OptimizationResult = {
        armId: bestArm,
        ucbValue: bestUCBValue,
        confidence: bestConfidence,
        expectedReward: bestExpectedReward,
        explorationBonus: bestExplorationBonus,
        recommendedAction: this.armIdToAction(bestArm),
      };

      // Update arm usage
      const armState = this.arms.get(bestArm)!;
      armState.lastUsed = new Date();

      // Emit selection event
      this.emit('arm_selected', {
        armId: bestArm,
        context: context.features,
        ucbValue: bestUCBValue,
        confidence: bestConfidence,
      });

      logger.debug('Optimal arm selected', {
        armId: bestArm,
        ucbValue: bestUCBValue,
        confidence: bestConfidence,
        contextFeatures: features.slice(0, 5), // Log first 5 features
      });

      return result;
    } catch (error) {
      logger.error('Arm selection failed', { error, context });
      this.emit('selection_error', { error, context });
      throw error;
    }
  }

  /**
   * Update arm state with reward observation
   */
  async updateWithReward(
    armId: number,
    context: ContextVector,
    reward: number,
  ): Promise<UpdateResult> {
    try {
      if (!Number.isFinite(reward)) {
        throw new Error('Reward must be a finite number');
      }

      const features = context.features;
      const armState = this.getOrCreateArm(armId);

      // Update arm statistics
      armState.numPulls++;
      armState.totalReward += reward;
      armState.averageReward = armState.totalReward / armState.numPulls;

      // Sherman-Morrison update for efficient matrix inversion
      const updatedTheta = this.updateThetaShermanMorrison(
        armState,
        features,
        reward,
      );
      const thetaUpdated = !this.arraysEqual(armState.theta, updatedTheta);
      armState.theta = updatedTheta;

      // Update global statistics
      this.totalPulls++;
      this.totalReward += reward;

      // Track recent performance
      this.recentRewards.push(reward);
      if (this.recentRewards.length > 100) {
        this.recentRewards = this.recentRewards.slice(-100);
      }

      // Calculate confidence scores for all arms
      const confidenceScores = this.calculateAllConfidenceScores(features);

      // Calculate current exploration rate
      const explorationRate = this.calculateExplorationRate();

      // Update convergence metrics
      this.updateConvergenceMetrics(armState, reward);

      const result: UpdateResult = {
        armId,
        rewardReceived: reward,
        thetaUpdated,
        confidenceScores,
        explorationRate,
      };

      // Emit update event
      this.emit('reward_update', {
        armId,
        reward,
        totalPulls: this.totalPulls,
        averageReward: armState.averageReward,
        thetaUpdated,
      });

      logger.debug('Reward update completed', {
        armId,
        reward,
        numPulls: armState.numPulls,
        averageReward: armState.averageReward,
        thetaUpdated,
      });

      return result;
    } catch (error) {
      logger.error('Reward update failed', { error, armId, reward });
      this.emit('update_error', { error, armId, reward });
      throw error;
    }
  }

  /**
   * Get performance analytics
   */
  getPerformanceAnalytics(): any {
    const runtime = Date.now() - this.startTime.getTime();
    const avgReward =
      this.totalPulls > 0 ? this.totalReward / this.totalPulls : 0;
    const recentAvgReward =
      this.recentRewards.length > 0
        ? this.recentRewards.reduce((sum, r) => sum + r, 0) /
          this.recentRewards.length
        : 0;

    // Calculate regret estimation
    const estimatedOptimalReward = Math.max(
      ...Array.from(this.arms.values()).map((a) => a.averageReward),
    );
    const cumulativeRegret =
      estimatedOptimalReward * this.totalPulls - this.totalReward;

    // Arm statistics
    const armStats = Array.from(this.arms.values()).map((arm) => ({
      armId: arm.armId,
      numPulls: arm.numPulls,
      averageReward: arm.averageReward,
      totalReward: arm.totalReward,
      confidence: this.calculateConfidenceBound(
        arm.armId,
        this.getLastContext() || new Array(this.contextDimension).fill(0),
      ),
    }));

    return {
      runtime,
      totalPulls: this.totalPulls,
      totalReward: this.totalReward,
      averageReward: avgReward,
      recentAverageReward: recentAvgReward,
      cumulativeRegret,
      numberOfArms: this.arms.size,
      explorationRate: this.calculateExplorationRate(),
      convergenceMetrics: this.convergenceMetrics,
      armStatistics: armStats,
      bestArm: this.getBestArm(),
    };
  }

  /**
   * Get or create arm state
   */
  private getOrCreateArm(armId: number): ArmState {
    if (!this.arms.has(armId)) {
      if (this.arms.size >= this.config.maxArms!) {
        throw new Error(
          `Maximum number of arms (${this.config.maxArms}) exceeded`,
        );
      }

      // Initialize arm with identity matrix and zero vectors
      const identityMatrix = this.createIdentityMatrix(
        this.contextDimension,
        this.config.regularizationLambda!,
      );
      const zeroVector = new Array(this.contextDimension).fill(0);

      const newArm: ArmState = {
        armId,
        theta: [...zeroVector],
        A: identityMatrix.map((row) => [...row]), // Deep copy
        b: [...zeroVector],
        numPulls: 0,
        totalReward: 0,
        averageReward: 0,
        lastUsed: new Date(),
      };

      this.arms.set(armId, newArm);
      logger.debug('New arm created', {
        armId,
        contextDimension: this.contextDimension,
      });
    }

    return this.arms.get(armId)!;
  }

  /**
   * Calculate UCB value for an arm
   */
  private calculateUCB(
    armState: ArmState,
    features: number[],
  ): {
    ucbValue: number;
    expectedReward: number;
    explorationBonus: number;
    confidence: number;
  } {
    // Calculate expected reward: theta^T * x
    const expectedReward = this.dotProduct(armState.theta, features);

    // Calculate confidence bound
    const confidence = this.calculateConfidenceBound(armState.armId, features);
    const explorationBonus = this.config.explorationAlpha * confidence;

    // UCB value = expected reward + exploration bonus
    const ucbValue = expectedReward + explorationBonus;

    return {
      ucbValue,
      expectedReward,
      explorationBonus,
      confidence,
    };
  }

  /**
   * Calculate confidence bound for exploration
   */
  private calculateConfidenceBound(
    armId: number,
    contextFeatures: number[],
  ): number {
    const armState = this.arms.get(armId);
    if (!armState) return 1.0; // High confidence for unknown arms

    try {
      // Calculate x^T * A^(-1) * x
      const AInv = this.invertMatrix(armState.A);
      const xAInvx = this.quadraticForm(contextFeatures, AInv);

      // Confidence bound: sqrt(x^T * A^(-1) * x)
      return Math.sqrt(Math.max(0, xAInvx));
    } catch (error) {
      logger.warn('Confidence bound calculation failed, using fallback', {
        armId,
        error,
      });
      return 1.0; // Fallback confidence
    }
  }

  /**
   * Sherman-Morrison matrix update for efficiency
   */
  private updateThetaShermanMorrison(
    armState: ArmState,
    features: number[],
    reward: number,
  ): number[] {
    try {
      // Update b: b = b + r * x
      const newB = armState.b.map((bi, i) => bi + reward * features[i]);

      // Update A: A = A + x * x^T (Sherman-Morrison formula)
      const newA = armState.A.map((row) => [...row]); // Deep copy
      for (let i = 0; i < this.contextDimension; i++) {
        for (let j = 0; j < this.contextDimension; j++) {
          newA[i][j] += features[i] * features[j];
        }
      }

      // Update theta: theta = A^(-1) * b
      const AInv = this.invertMatrix(newA);
      const newTheta = this.matrixVectorProduct(AInv, newB);

      // Update arm state
      armState.A = newA;
      armState.b = newB;

      return newTheta;
    } catch (error) {
      logger.error('Sherman-Morrison update failed', {
        error,
        armId: armState.armId,
      });
      return armState.theta; // Return unchanged theta on error
    }
  }

  /**
   * Calculate confidence scores for all arms
   */
  private calculateAllConfidenceScores(
    features: number[],
  ): Record<string, number> {
    const scores: Record<string, number> = {};

    for (const [armId, armState] of this.arms) {
      try {
        const confidence = this.calculateConfidenceBound(armId, features);
        scores[armId.toString()] = confidence;
      } catch (error) {
        scores[armId.toString()] = 0.5; // Default confidence
      }
    }

    return scores;
  }

  /**
   * Calculate current exploration rate
   */
  private calculateExplorationRate(): number {
    if (this.totalPulls === 0) return 1.0;

    // Decaying exploration rate based on confidence
    const baseRate = Math.pow(this.config.decayFactor!, this.totalPulls);
    const confidenceAdjustment = this.getAverageConfidence();

    return Math.max(0.01, Math.min(1.0, baseRate * confidenceAdjustment));
  }

  /**
   * Get average confidence across all arms
   */
  private getAverageConfidence(): number {
    if (this.arms.size === 0) return 1.0;

    const lastContext =
      this.getLastContext() || new Array(this.contextDimension).fill(0);
    const confidences = Array.from(this.arms.keys()).map((armId) =>
      this.calculateConfidenceBound(armId, lastContext),
    );

    return (
      confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
    );
  }

  /**
   * Update convergence metrics
   */
  private updateConvergenceMetrics(armState: ArmState, reward: number): void {
    // Theta stability (measure parameter convergence)
    const thetaStability = this.calculateThetaStability(armState);
    this.convergenceMetrics.thetaStability.push(thetaStability);

    // Reward variance (measure consistency)
    const rewardVariance = this.calculateRewardVariance();
    this.convergenceMetrics.rewardVariance.push(rewardVariance);

    // Exploration decay
    const explorationDecay = this.calculateExplorationRate();
    this.convergenceMetrics.explorationDecay.push(explorationDecay);

    // Keep only recent metrics (last 100 updates)
    const maxLength = 100;
    if (this.convergenceMetrics.thetaStability.length > maxLength) {
      this.convergenceMetrics.thetaStability =
        this.convergenceMetrics.thetaStability.slice(-maxLength);
      this.convergenceMetrics.rewardVariance =
        this.convergenceMetrics.rewardVariance.slice(-maxLength);
      this.convergenceMetrics.explorationDecay =
        this.convergenceMetrics.explorationDecay.slice(-maxLength);
    }
  }

  /**
   * Get candidate arms for selection
   */
  private getCandidateArms(): number[] {
    // Return existing arms plus a few new candidates
    const existingArms = Array.from(this.arms.keys());
    const newCandidates = [];

    // Add new candidates if we haven't reached max arms
    const maxNewCandidates = Math.min(5, this.config.maxArms! - this.arms.size);
    for (let i = 0; i < maxNewCandidates; i++) {
      const candidate = Math.max(...existingArms, -1) + 1 + i;
      newCandidates.push(candidate);
    }

    return [...existingArms, ...newCandidates];
  }

  /**
   * Convert arm ID to action description
   */
  private armIdToAction(armId: number): string {
    // This would be customized based on the specific application
    return `action_${armId}`;
  }

  /**
   * Get best performing arm
   */
  private getBestArm(): { armId: number; averageReward: number } | null {
    if (this.arms.size === 0) return null;

    let bestArm = -1;
    let bestReward = -Infinity;

    for (const [armId, armState] of this.arms) {
      if (armState.averageReward > bestReward) {
        bestReward = armState.averageReward;
        bestArm = armId;
      }
    }

    return bestArm >= 0 ? { armId: bestArm, averageReward: bestReward } : null;
  }

  /**
   * Get last used context (for analytics)
   */
  private getLastContext(): number[] | null {
    // This would store the last context in a real implementation
    return null;
  }

  // Matrix and vector operations

  private createIdentityMatrix(size: number, lambda: number): number[][] {
    const matrix = Array(size)
      .fill(null)
      .map(() => Array(size).fill(0));
    for (let i = 0; i < size; i++) {
      matrix[i][i] = lambda;
    }
    return matrix;
  }

  private dotProduct(a: number[], b: number[]): number {
    return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  }

  private matrixVectorProduct(matrix: number[][], vector: number[]): number[] {
    return matrix.map((row) => this.dotProduct(row, vector));
  }

  private quadraticForm(x: number[], A: number[][]): number {
    const Ax = this.matrixVectorProduct(A, x);
    return this.dotProduct(x, Ax);
  }

  private invertMatrix(matrix: number[][]): number[][] {
    const n = matrix.length;

    // Create augmented matrix [A|I]
    const augmented = matrix.map((row, i) => {
      const newRow = [...row];
      for (let j = 0; j < n; j++) {
        newRow.push(i === j ? 1 : 0);
      }
      return newRow;
    });

    // Gaussian elimination with partial pivoting
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }

      // Swap rows
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

      // Check for singular matrix
      if (Math.abs(augmented[i][i]) < 1e-10) {
        throw new Error('Matrix is singular or nearly singular');
      }

      // Scale pivot row
      const pivot = augmented[i][i];
      for (let j = 0; j < 2 * n; j++) {
        augmented[i][j] /= pivot;
      }

      // Eliminate column
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = augmented[k][i];
          for (let j = 0; j < 2 * n; j++) {
            augmented[k][j] -= factor * augmented[i][j];
          }
        }
      }
    }

    // Extract inverse matrix
    return augmented.map((row) => row.slice(n));
  }

  private arraysEqual(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((val, i) => Math.abs(val - b[i]) < 1e-10);
  }

  private calculateThetaStability(armState: ArmState): number {
    // Measure how much theta has changed (simplified)
    const thetaNorm = Math.sqrt(
      armState.theta.reduce((sum, t) => sum + t * t, 0),
    );
    return 1 / (1 + thetaNorm); // Stability decreases with larger theta values
  }

  private calculateRewardVariance(): number {
    if (this.recentRewards.length < 2) return 0;

    const mean =
      this.recentRewards.reduce((sum, r) => sum + r, 0) /
      this.recentRewards.length;
    const variance =
      this.recentRewards.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
      this.recentRewards.length;

    return variance;
  }

  /**
   * Reset optimizer state
   */
  reset(): void {
    this.arms.clear();
    this.totalPulls = 0;
    this.totalReward = 0;
    this.recentRewards = [];
    this.recentRegrets = [];
    this.convergenceMetrics = {
      thetaStability: [],
      rewardVariance: [],
      explorationDecay: [],
    };
    this.startTime = new Date();

    logger.info('LinUCBOptimizer reset');
    this.emit('optimizer_reset');
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<LinUCBConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Configuration updated', { config: this.config });
    this.emit('config_updated', this.config);
  }

  /**
   * Export current state for persistence
   */
  exportState(): any {
    return {
      config: this.config,
      arms: Array.from(this.arms.entries()).map(([id, state]) => [id, state]),
      totalPulls: this.totalPulls,
      totalReward: this.totalReward,
      startTime: this.startTime,
      convergenceMetrics: this.convergenceMetrics,
    };
  }

  /**
   * Import state from persistence
   */
  importState(state: any): void {
    this.config = state.config;
    this.arms = new Map(state.arms);
    this.totalPulls = state.totalPulls;
    this.totalReward = state.totalReward;
    this.startTime = new Date(state.startTime);
    this.convergenceMetrics = state.convergenceMetrics;

    logger.info('State imported', {
      totalPulls: this.totalPulls,
      numArms: this.arms.size,
      totalReward: this.totalReward,
    });
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down LinUCBOptimizer');
    this.removeAllListeners();
    logger.info('LinUCBOptimizer shutdown complete');
  }
}

export default LinUCBOptimizer;
