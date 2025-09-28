import { EventEmitter } from 'events';
import { logger } from '../config/logger';

export interface LinUCBConfig {
  alpha: number; // Confidence parameter
  dimensionality: number;
  armCount: number;
  contextVectorSize: number;
  regularizationParam: number;
  explorationDecay: number;
  batchSize: number;
  maxIterations: number;
}

export interface ContextualBanditArm {
  armId: number;
  name: string;
  description: string;
  parameters: ArmParameters;
  statistics: ArmStatistics;
}

export interface ArmParameters {
  backend: string;
  shots: number;
  optimizationLevel: number;
  errorMitigation: string[];
  circuitDepth: number;
  customConfig: Record<string, any>;
}

export interface ArmStatistics {
  totalReward: number;
  totalCount: number;
  averageReward: number;
  confidence: number;
  lastSelected: Date | null;
  selectionFrequency: number;
}

export interface ContextualAction {
  armId: number;
  context: ContextVector;
  expectedReward: number;
  confidenceBound: number;
  ucbValue: number;
  explorationBonus: number;
}

export interface ContextVector {
  features: number[];
  timestamp: Date;
  metadata: ContextMetadata;
}

export interface ContextMetadata {
  tenantId: string;
  workloadType: string;
  timeOfDay: number;
  dayOfWeek: number;
  budgetRemaining: number;
  historicalPerformance: number;
  quantumBackendLoad: number;
  urgencyLevel: number;
}

export interface RewardFeedback {
  armId: number;
  context: ContextVector;
  reward: number;
  executionTime: number;
  fidelity: number;
  cost: number;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface LinUCBState {
  A: number[][][]; // Covariance matrices [arm][dim][dim]
  b: number[][]; // Reward accumulation vectors [arm][dim]
  theta: number[][]; // Parameter estimates [arm][dim]
  AInv: number[][][]; // Cached inverse matrices [arm][dim][dim]
  totalReward: number;
  totalCount: number;
  iterationCount: number;
  lastUpdate: Date;
}

export interface PerformancePrediction {
  armId: number;
  context: ContextVector;
  expectedReward: number;
  confidenceInterval: [number, number];
  uncertainty: number;
  explorationValue: number;
  recommendation: ActionRecommendation;
}

export interface ActionRecommendation {
  action: RecommendationAction;
  reason: string;
  confidence: number;
  alternatives: AlternativeAction[];
}

export enum RecommendationAction {
  EXPLOIT = 'exploit',
  EXPLORE = 'explore',
  BALANCED = 'balanced',
  CAUTIOUS = 'cautious'
}

export interface AlternativeAction {
  armId: number;
  expectedReward: number;
  reason: string;
  riskLevel: string;
}

export interface ExplorationStrategy {
  strategy: ExplorationStrategyType;
  parameters: Record<string, number>;
  adaptiveDecay: boolean;
  contextAware: boolean;
}

export enum ExplorationStrategyType {
  UCB = 'ucb',
  THOMPSON_SAMPLING = 'thompson_sampling',
  EPSILON_GREEDY = 'epsilon_greedy',
  BOLTZMANN = 'boltzmann'
}

export interface OptimizationResult {
  selectedArm: ContextualAction;
  explorationExploitationRatio: number;
  convergenceMetrics: ConvergenceMetrics;
  performancePredictions: PerformancePrediction[];
  decisionRationale: DecisionRationale;
}

export interface ConvergenceMetrics {
  regret: number;
  cumulativeRegret: number;
  armDiversity: number;
  parameterStability: number;
  explorationEfficiency: number;
}

export interface DecisionRationale {
  primaryFactor: string;
  confidence: number;
  explorationValue: number;
  riskAssessment: string;
  alternativeConsiderations: string[];
}

export class LinUCBOptimizer extends EventEmitter {
  private config: LinUCBConfig;
  private arms: ContextualBanditArm[];
  private state: LinUCBState;
  private explorationStrategy: ExplorationStrategy;
  private rewardHistory: RewardFeedback[] = [];
  private performanceCache: Map<string, PerformancePrediction> = new Map();
  private lastOptimization: Date | null = null;

  constructor(config: LinUCBConfig, arms: ContextualBanditArm[]) {
    super();
    this.config = config;
    this.arms = arms;
    this.explorationStrategy = {
      strategy: ExplorationStrategyType.UCB,
      parameters: { alpha: config.alpha },
      adaptiveDecay: true,
      contextAware: true
    };

    this.initializeLinUCBState();

    logger.info('LinUCBOptimizer initialized', {
      armCount: arms.length,
      dimensionality: config.dimensionality,
      alpha: config.alpha
    });
  }

  private initializeLinUCBState(): void {
    const { armCount, dimensionality, regularizationParam } = this.config;

    this.state = {
      A: Array(armCount).fill(null).map(() => this.createRegularizedIdentityMatrix(dimensionality, regularizationParam)),
      b: Array(armCount).fill(null).map(() => new Array(dimensionality).fill(0)),
      theta: Array(armCount).fill(null).map(() => new Array(dimensionality).fill(0)),
      AInv: Array(armCount).fill(null).map(() => this.createIdentityMatrix(dimensionality)),
      totalReward: 0,
      totalCount: 0,
      iterationCount: 0,
      lastUpdate: new Date()
    };

    // Initialize arm statistics
    for (const arm of this.arms) {
      arm.statistics = {
        totalReward: 0,
        totalCount: 0,
        averageReward: 0,
        confidence: 0,
        lastSelected: null,
        selectionFrequency: 0
      };
    }
  }

  private createIdentityMatrix(size: number): number[][] {
    const matrix = Array(size).fill(null).map(() => new Array(size).fill(0));
    for (let i = 0; i < size; i++) {
      matrix[i][i] = 1.0;
    }
    return matrix;
  }

  private createRegularizedIdentityMatrix(size: number, regularization: number): number[][] {
    const matrix = this.createIdentityMatrix(size);
    for (let i = 0; i < size; i++) {
      matrix[i][i] = regularization;
    }
    return matrix;
  }

  public async selectOptimalArm(context: ContextVector): Promise<OptimizationResult> {
    const startTime = Date.now();

    try {
      // Update exploration parameters
      this.updateExplorationParameters();

      // Calculate UCB values for all arms
      const actions = await this.calculateUCBValues(context);

      // Select the arm with highest UCB value
      const selectedAction = actions.reduce((best, current) =>
        current.ucbValue > best.ucbValue ? current : best
      );

      // Calculate performance predictions for all arms
      const performancePredictions = await this.generatePerformancePredictions(context, actions);

      // Analyze convergence metrics
      const convergenceMetrics = this.calculateConvergenceMetrics();

      // Generate decision rationale
      const decisionRationale = this.generateDecisionRationale(selectedAction, actions);

      const result: OptimizationResult = {
        selectedArm: selectedAction,
        explorationExploitationRatio: this.calculateExplorationRatio(),
        convergenceMetrics,
        performancePredictions,
        decisionRationale
      };

      this.lastOptimization = new Date();

      this.emit('armSelected', {
        armId: selectedAction.armId,
        ucbValue: selectedAction.ucbValue,
        expectedReward: selectedAction.expectedReward,
        duration: Date.now() - startTime
      });

      logger.info('Optimal arm selected', {
        armId: selectedAction.armId,
        ucbValue: selectedAction.ucbValue.toFixed(4),
        explorationRatio: result.explorationExploitationRatio.toFixed(3)
      });

      return result;

    } catch (error) {
      logger.error('Arm selection failed', { error: error.message });
      throw error;
    }
  }

  private async calculateUCBValues(context: ContextVector): Promise<ContextualAction[]> {
    const actions: ContextualAction[] = [];
    const contextFeatures = context.features;

    for (let armId = 0; armId < this.arms.length; armId++) {
      const arm = this.arms[armId];

      // Calculate expected reward: θ^T * x
      const expectedReward = this.dotProduct(this.state.theta[armId], contextFeatures);

      // Calculate confidence bound: α * sqrt(x^T * A^(-1) * x)
      const confidenceBound = this.calculateConfidenceBound(armId, contextFeatures);

      // Calculate exploration bonus
      const explorationBonus = this.calculateExplorationBonus(armId, context);

      // UCB value = expected reward + confidence bound + exploration bonus
      const ucbValue = expectedReward + confidenceBound + explorationBonus;

      actions.push({
        armId,
        context,
        expectedReward,
        confidenceBound,
        ucbValue,
        explorationBonus
      });
    }

    return actions;
  }

  private calculateConfidenceBound(armId: number, contextFeatures: number[]): number {
    // Calculate x^T * A^(-1) * x
    const AInv = this.state.AInv[armId];
    const temp = this.matrixVectorMultiply(AInv, contextFeatures);
    const quadraticForm = this.dotProduct(contextFeatures, temp);

    // Apply confidence parameter with adaptive decay
    const adaptiveAlpha = this.getAdaptiveAlpha();
    return adaptiveAlpha * Math.sqrt(Math.max(0, quadraticForm));
  }

  private getAdaptiveAlpha(): number {
    if (!this.explorationStrategy.adaptiveDecay) {
      return this.config.alpha;
    }

    // Decay exploration over time
    const decayFactor = Math.exp(-this.config.explorationDecay * this.state.iterationCount);
    return this.config.alpha * Math.max(0.1, decayFactor);
  }

  private calculateExplorationBonus(armId: number, context: ContextVector): number {
    const arm = this.arms[armId];
    const timeSinceLastSelection = arm.statistics.lastSelected ?
      Date.now() - arm.statistics.lastSelected.getTime() : Infinity;

    // Time-based exploration bonus
    const timeBonus = Math.min(0.1, timeSinceLastSelection / (24 * 3600 * 1000)); // Max 0.1 for 24h

    // Frequency-based exploration bonus
    const avgSelectionFreq = this.state.totalCount / this.arms.length;
    const frequencyBonus = Math.max(0, (avgSelectionFreq - arm.statistics.selectionFrequency) * 0.01);

    // Context novelty bonus
    const noveltyBonus = this.calculateContextNoveltyBonus(armId, context);

    return timeBonus + frequencyBonus + noveltyBonus;
  }

  private calculateContextNoveltyBonus(armId: number, context: ContextVector): number {
    // Calculate how novel this context is for this arm
    const recentContexts = this.rewardHistory
      .filter(r => r.armId === armId)
      .slice(-10)
      .map(r => r.context.features);

    if (recentContexts.length === 0) return 0.05; // Bonus for unexplored arm

    // Calculate average distance to recent contexts
    const avgDistance = recentContexts.reduce((sum, pastContext) => {
      const distance = this.euclideanDistance(context.features, pastContext);
      return sum + distance;
    }, 0) / recentContexts.length;

    // Normalize and cap the novelty bonus
    return Math.min(0.05, avgDistance / context.features.length);
  }

  private euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
  }

  public async updateWithReward(feedback: RewardFeedback): Promise<void> {
    const startTime = Date.now();

    try {
      // Validate feedback
      this.validateRewardFeedback(feedback);

      // Add to reward history
      this.rewardHistory.push(feedback);

      // Update LinUCB state
      await this.updateLinUCBState(feedback);

      // Update arm statistics
      this.updateArmStatistics(feedback);

      // Trigger periodic maintenance if needed
      if (this.state.iterationCount % 100 === 0) {
        await this.performMaintenance();
      }

      this.emit('rewardProcessed', {
        armId: feedback.armId,
        reward: feedback.reward,
        totalCount: this.state.totalCount,
        duration: Date.now() - startTime
      });

      logger.debug('Reward feedback processed', {
        armId: feedback.armId,
        reward: feedback.reward.toFixed(4),
        totalCount: this.state.totalCount
      });

    } catch (error) {
      logger.error('Reward update failed', {
        armId: feedback.armId,
        error: error.message
      });
      throw error;
    }
  }

  private validateRewardFeedback(feedback: RewardFeedback): void {
    if (feedback.armId < 0 || feedback.armId >= this.arms.length) {
      throw new Error(`Invalid arm ID: ${feedback.armId}`);
    }

    if (feedback.reward < 0 || feedback.reward > 1) {
      throw new Error(`Reward must be in [0, 1], got ${feedback.reward}`);
    }

    if (feedback.context.features.length !== this.config.dimensionality) {
      throw new Error(`Context dimension mismatch: expected ${this.config.dimensionality}, got ${feedback.context.features.length}`);
    }
  }

  private async updateLinUCBState(feedback: RewardFeedback): Promise<void> {
    const { armId, context, reward } = feedback;
    const contextFeatures = context.features;

    // Update A_a = A_a + x_t * x_t^T
    for (let i = 0; i < contextFeatures.length; i++) {
      for (let j = 0; j < contextFeatures.length; j++) {
        this.state.A[armId][i][j] += contextFeatures[i] * contextFeatures[j];
      }
    }

    // Update b_a = b_a + r_t * x_t
    for (let i = 0; i < contextFeatures.length; i++) {
      this.state.b[armId][i] += reward * contextFeatures[i];
    }

    // Update A^(-1) using Sherman-Morrison formula for efficiency
    await this.updateInverseMatrix(armId, contextFeatures);

    // Update parameter estimate θ_a = A_a^(-1) * b_a
    this.state.theta[armId] = this.matrixVectorMultiply(
      this.state.AInv[armId],
      this.state.b[armId]
    );

    // Update global statistics
    this.state.totalReward += reward;
    this.state.totalCount++;
    this.state.iterationCount++;
    this.state.lastUpdate = new Date();
  }

  private async updateInverseMatrix(armId: number, contextFeatures: number[]): Promise<void> {
    // Sherman-Morrison formula: (A + uv^T)^(-1) = A^(-1) - (A^(-1)uv^TA^(-1))/(1 + v^TA^(-1}u)
    const AInv = this.state.AInv[armId];
    const u = contextFeatures;
    const v = contextFeatures;

    // Calculate A^(-1) * u
    const AInvU = this.matrixVectorMultiply(AInv, u);

    // Calculate v^T * A^(-1) * u
    const vTAInvU = this.dotProduct(v, AInvU);

    // Calculate denominator: 1 + v^T * A^(-1) * u
    const denominator = 1 + vTAInvU;

    if (Math.abs(denominator) < 1e-10) {
      // Fallback to full matrix inversion if denominator is too small
      this.state.AInv[armId] = this.invertMatrix(this.state.A[armId]);
      return;
    }

    // Update A^(-1) using Sherman-Morrison formula
    for (let i = 0; i < AInv.length; i++) {
      for (let j = 0; j < AInv[i].length; j++) {
        this.state.AInv[armId][i][j] -= (AInvU[i] * AInvU[j]) / denominator;
      }
    }
  }

  private updateArmStatistics(feedback: RewardFeedback): void {
    const arm = this.arms[feedback.armId];

    arm.statistics.totalReward += feedback.reward;
    arm.statistics.totalCount++;
    arm.statistics.averageReward = arm.statistics.totalReward / arm.statistics.totalCount;
    arm.statistics.lastSelected = feedback.timestamp;
    arm.statistics.selectionFrequency = arm.statistics.totalCount / this.state.totalCount;

    // Update confidence based on recent performance
    const recentRewards = this.rewardHistory
      .filter(r => r.armId === feedback.armId)
      .slice(-10)
      .map(r => r.reward);

    if (recentRewards.length > 1) {
      const variance = this.calculateVariance(recentRewards);
      arm.statistics.confidence = Math.max(0, 1 - Math.sqrt(variance));
    }
  }

  private updateExplorationParameters(): void {
    if (this.explorationStrategy.adaptiveDecay) {
      // Adjust exploration based on convergence
      const convergenceScore = this.calculateConvergenceScore();

      if (convergenceScore > 0.8) {
        // Reduce exploration when converged
        this.explorationStrategy.parameters.alpha = Math.max(
          0.1,
          this.config.alpha * 0.5
        );
      } else if (convergenceScore < 0.3) {
        // Increase exploration when not converged
        this.explorationStrategy.parameters.alpha = Math.min(
          this.config.alpha * 2,
          1.0
        );
      }
    }
  }

  private calculateConvergenceScore(): number {
    if (this.state.totalCount < 50) return 0;

    // Calculate arm selection diversity
    const armCounts = this.arms.map(arm => arm.statistics.totalCount);
    const maxCount = Math.max(...armCounts);
    const minCount = Math.min(...armCounts);
    const diversityScore = maxCount > 0 ? minCount / maxCount : 0;

    // Calculate parameter stability
    const stabilityScore = this.calculateParameterStability();

    // Calculate reward variance
    const recentRewards = this.rewardHistory.slice(-50).map(r => r.reward);
    const varianceScore = recentRewards.length > 1 ?
      Math.max(0, 1 - this.calculateVariance(recentRewards)) : 0;

    return (diversityScore * 0.3 + stabilityScore * 0.4 + varianceScore * 0.3);
  }

  private calculateParameterStability(): number {
    if (this.rewardHistory.length < 20) return 0;

    // Compare recent parameter estimates with older ones
    let totalStability = 0;

    for (let armId = 0; armId < this.arms.length; armId++) {
      const currentTheta = this.state.theta[armId];

      // Calculate historical theta (simplified)
      const armRewards = this.rewardHistory
        .filter(r => r.armId === armId)
        .slice(0, -10); // Older rewards

      if (armRewards.length === 0) continue;

      // Simple stability measure based on parameter magnitude changes
      const thetaMagnitude = Math.sqrt(this.dotProduct(currentTheta, currentTheta));
      const stabilityScore = Math.min(1, 1 / (1 + thetaMagnitude * 0.1));
      totalStability += stabilityScore;
    }

    return totalStability / this.arms.length;
  }

  private async generatePerformancePredictions(
    context: ContextVector,
    actions: ContextualAction[]
  ): Promise<PerformancePrediction[]> {
    const predictions: PerformancePrediction[] = [];

    for (const action of actions) {
      const arm = this.arms[action.armId];

      // Calculate confidence interval
      const confidenceInterval = this.calculateConfidenceInterval(
        action.armId,
        context.features,
        0.95 // 95% confidence
      );

      // Calculate uncertainty
      const uncertainty = (confidenceInterval[1] - confidenceInterval[0]) / 2;

      // Generate recommendation
      const recommendation = this.generateActionRecommendation(action, uncertainty);

      predictions.push({
        armId: action.armId,
        context,
        expectedReward: action.expectedReward,
        confidenceInterval,
        uncertainty,
        explorationValue: action.explorationBonus,
        recommendation
      });
    }

    return predictions.sort((a, b) => b.expectedReward - a.expectedReward);
  }

  private calculateConfidenceInterval(
    armId: number,
    contextFeatures: number[],
    confidence: number
  ): [number, number] {
    const expectedReward = this.dotProduct(this.state.theta[armId], contextFeatures);
    const confidenceBound = this.calculateConfidenceBound(armId, contextFeatures);

    // Use normal distribution approximation
    const zScore = confidence === 0.95 ? 1.96 : 2.58; // 95% or 99%
    const margin = zScore * confidenceBound;

    return [
      Math.max(0, expectedReward - margin),
      Math.min(1, expectedReward + margin)
    ];
  }

  private generateActionRecommendation(
    action: ContextualAction,
    uncertainty: number
  ): ActionRecommendation {
    let recommendationAction: RecommendationAction;
    let reason: string;
    let confidence: number;

    if (action.explorationBonus > 0.03) {
      recommendationAction = RecommendationAction.EXPLORE;
      reason = 'High exploration value due to novelty or infrequent selection';
      confidence = 0.7;
    } else if (action.expectedReward > 0.8 && uncertainty < 0.1) {
      recommendationAction = RecommendationAction.EXPLOIT;
      reason = 'High expected reward with low uncertainty';
      confidence = 0.9;
    } else if (uncertainty > 0.2) {
      recommendationAction = RecommendationAction.CAUTIOUS;
      reason = 'High uncertainty requires careful evaluation';
      confidence = 0.6;
    } else {
      recommendationAction = RecommendationAction.BALANCED;
      reason = 'Balanced exploration-exploitation approach';
      confidence = 0.75;
    }

    const alternatives = this.generateAlternatives(action);

    return {
      action: recommendationAction,
      reason,
      confidence,
      alternatives
    };
  }

  private generateAlternatives(selectedAction: ContextualAction): AlternativeAction[] {
    return this.arms
      .filter((_, index) => index !== selectedAction.armId)
      .slice(0, 3) // Top 3 alternatives
      .map((arm, index) => ({
        armId: index,
        expectedReward: arm.statistics.averageReward,
        reason: `Alternative with ${arm.statistics.confidence.toFixed(2)} confidence`,
        riskLevel: arm.statistics.confidence > 0.7 ? 'Low' : 'Medium'
      }));
  }

  private calculateConvergenceMetrics(): ConvergenceMetrics {
    const regret = this.calculateInstantaneousRegret();
    const cumulativeRegret = this.calculateCumulativeRegret();
    const armDiversity = this.calculateArmDiversity();
    const parameterStability = this.calculateParameterStability();
    const explorationEfficiency = this.calculateExplorationEfficiency();

    return {
      regret,
      cumulativeRegret,
      armDiversity,
      parameterStability,
      explorationEfficiency
    };
  }

  private calculateInstantaneousRegret(): number {
    if (this.rewardHistory.length === 0) return 0;

    // Simple regret calculation: difference from best arm
    const bestArmReward = Math.max(...this.arms.map(arm => arm.statistics.averageReward));
    const lastReward = this.rewardHistory[this.rewardHistory.length - 1].reward;

    return Math.max(0, bestArmReward - lastReward);
  }

  private calculateCumulativeRegret(): number {
    // Sum of all instantaneous regrets (simplified)
    return this.rewardHistory.reduce((sum, feedback, index) => {
      const bestPossibleReward = 1.0; // Assuming max reward is 1
      return sum + Math.max(0, bestPossibleReward - feedback.reward);
    }, 0);
  }

  private calculateArmDiversity(): number {
    const armCounts = this.arms.map(arm => arm.statistics.totalCount);
    const totalSelections = armCounts.reduce((sum, count) => sum + count, 0);

    if (totalSelections === 0) return 1;

    // Calculate normalized entropy
    const probabilities = armCounts.map(count => count / totalSelections);
    const entropy = -probabilities.reduce((sum, p) => {
      return sum + (p > 0 ? p * Math.log2(p) : 0);
    }, 0);

    const maxEntropy = Math.log2(this.arms.length);
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  private calculateExplorationEfficiency(): number {
    if (this.rewardHistory.length < 10) return 0;

    // Calculate how much reward was gained through exploration
    const recentRewards = this.rewardHistory.slice(-20);
    const explorationRewards = recentRewards.filter(r => {
      const arm = this.arms[r.armId];
      return arm.statistics.selectionFrequency < 1 / this.arms.length;
    });

    const explorationValue = explorationRewards.reduce((sum, r) => sum + r.reward, 0);
    const totalValue = recentRewards.reduce((sum, r) => sum + r.reward, 0);

    return totalValue > 0 ? explorationValue / totalValue : 0;
  }

  private calculateExplorationRatio(): number {
    if (this.state.totalCount === 0) return 1;

    // Calculate how many selections were exploratory vs exploitative
    const recentSelections = this.rewardHistory.slice(-50);
    const exploratorySelections = recentSelections.filter(r => {
      const arm = this.arms[r.armId];
      return arm.statistics.averageReward < this.getGlobalAverageReward();
    });

    return recentSelections.length > 0 ?
      exploratorySelections.length / recentSelections.length : 0.5;
  }

  private getGlobalAverageReward(): number {
    return this.state.totalCount > 0 ? this.state.totalReward / this.state.totalCount : 0;
  }

  private generateDecisionRationale(
    selectedAction: ContextualAction,
    allActions: ContextualAction[]
  ): DecisionRationale {
    // Determine primary decision factor
    let primaryFactor: string;
    let confidence: number;

    if (selectedAction.explorationBonus > 0.02) {
      primaryFactor = 'Exploration bonus';
      confidence = 0.7;
    } else if (selectedAction.expectedReward > 0.8) {
      primaryFactor = 'High expected reward';
      confidence = 0.9;
    } else if (selectedAction.confidenceBound > 0.1) {
      primaryFactor = 'High uncertainty';
      confidence = 0.6;
    } else {
      primaryFactor = 'UCB optimization';
      confidence = 0.8;
    }

    // Risk assessment
    const riskAssessment = selectedAction.confidenceBound > 0.15 ? 'High' :
                          selectedAction.confidenceBound > 0.05 ? 'Medium' : 'Low';

    // Alternative considerations
    const sortedActions = allActions.sort((a, b) => b.ucbValue - a.ucbValue);
    const alternativeConsiderations = sortedActions.slice(1, 3).map(action =>
      `Arm ${action.armId}: UCB=${action.ucbValue.toFixed(3)}`
    );

    return {
      primaryFactor,
      confidence,
      explorationValue: selectedAction.explorationBonus,
      riskAssessment,
      alternativeConsiderations
    };
  }

  private async performMaintenance(): Promise<void> {
    try {
      // Prune old reward history
      if (this.rewardHistory.length > 10000) {
        this.rewardHistory = this.rewardHistory.slice(-5000);
      }

      // Clear performance cache
      this.performanceCache.clear();

      // Recompute inverse matrices if needed (numerical stability)
      for (let armId = 0; armId < this.arms.length; armId++) {
        const condition = this.estimateMatrixCondition(this.state.A[armId]);
        if (condition > 1e12) { // Poor conditioning
          this.state.AInv[armId] = this.invertMatrix(this.state.A[armId]);
        }
      }

      this.emit('maintenancePerformed', {
        rewardHistorySize: this.rewardHistory.length,
        totalIterations: this.state.iterationCount
      });

      logger.debug('LinUCB maintenance performed', {
        rewardHistorySize: this.rewardHistory.length,
        iterationCount: this.state.iterationCount
      });

    } catch (error) {
      logger.error('Maintenance failed', { error: error.message });
    }
  }

  private estimateMatrixCondition(matrix: number[][]): number {
    // Simplified condition number estimation
    const trace = matrix.reduce((sum, row, i) => sum + row[i], 0);
    const frobeniusNorm = Math.sqrt(
      matrix.reduce((sum, row) =>
        sum + row.reduce((rowSum, val) => rowSum + val * val, 0), 0
      )
    );

    return frobeniusNorm / Math.max(trace, 1e-10);
  }

  // Utility methods
  private dotProduct(a: number[], b: number[]): number {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  }

  private matrixVectorMultiply(matrix: number[][], vector: number[]): number[] {
    return matrix.map(row => this.dotProduct(row, vector));
  }

  private invertMatrix(matrix: number[][]): number[][] {
    const n = matrix.length;
    const augmented = matrix.map((row, i) => {
      const identity = new Array(n).fill(0);
      identity[i] = 1;
      return [...row, ...identity];
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
        throw new Error('Matrix is singular');
      }

      // Make diagonal element 1
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
    return augmented.map(row => row.slice(n));
  }

  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / (values.length - 1);
  }

  // Public API methods
  public getState(): LinUCBState {
    return {
      ...this.state,
      A: this.state.A.map(matrix => matrix.map(row => [...row])),
      b: this.state.b.map(vector => [...vector]),
      theta: this.state.theta.map(vector => [...vector]),
      AInv: this.state.AInv.map(matrix => matrix.map(row => [...row]))
    };
  }

  public getArms(): ContextualBanditArm[] {
    return this.arms.map(arm => ({ ...arm }));
  }

  public getRewardHistory(limit?: number): RewardFeedback[] {
    return limit ? this.rewardHistory.slice(-limit) : [...this.rewardHistory];
  }

  public getExplorationStrategy(): ExplorationStrategy {
    return { ...this.explorationStrategy };
  }

  public async exportState(): Promise<string> {
    const exportData = {
      config: this.config,
      arms: this.arms,
      state: this.state,
      rewardHistory: this.rewardHistory.slice(-1000), // Recent history only
      explorationStrategy: this.explorationStrategy,
      timestamp: new Date().toISOString()
    };

    return JSON.stringify(exportData, null, 2);
  }

  public async shutdown(): Promise<void> {
    this.performanceCache.clear();
    this.removeAllListeners();

    logger.info('LinUCBOptimizer shutdown complete', {
      totalIterations: this.state.iterationCount,
      totalReward: this.state.totalReward.toFixed(4),
      armCount: this.arms.length
    });
  }
}