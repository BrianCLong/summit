"use strict";
// @ts-nocheck
// server/src/conductor/premium-routing/multi-armed-bandit-optimizer.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiArmedBanditOptimizer = void 0;
const pg_1 = require("pg");
const ioredis_1 = __importDefault(require("ioredis"));
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const prometheus_js_1 = require("../observability/prometheus.js");
class MultiArmedBanditOptimizer {
    pool;
    redis;
    arms = new Map();
    strategies = new Map();
    rewardHistory = new Map();
    regretBounds = new Map();
    optimalArm = null;
    totalRegret = 0;
    // Algorithm parameters
    C = 2; // Confidence parameter for UCB
    EPSILON = 0.1; // Exploration rate for ε-greedy
    ALPHA = 0.05; // Learning rate
    DECAY_FACTOR = 0.99; // Exploration decay
    MIN_PULLS = 10; // Minimum pulls before exploitation
    constructor() {
        this.pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
        this.redis = new ioredis_1.default(process.env.REDIS_URL);
        this.initializeStrategies();
    }
    async initialize() {
        await this.redis.connect();
        await this.loadBanditArms();
        await this.calculateOptimalArm();
        logger_js_1.default.info('Multi-Armed Bandit Optimizer initialized');
    }
    /**
     * Select arm using specified bandit algorithm
     */
    async selectArm(availableArms, strategy = 'ucb', contextType = 'default') {
        const filteredArms = Array.from(this.arms.values()).filter((arm) => availableArms.includes(arm.armId) && arm.contextType === contextType);
        if (filteredArms.length === 0) {
            throw new Error(`No available arms for context type: ${contextType}`);
        }
        let selectedArm;
        let explorationFactor = 0;
        let algorithm = strategy;
        const totalPulls = filteredArms.reduce((sum, arm) => sum + arm.pulls, 0);
        switch (strategy) {
            case 'ucb':
                selectedArm = this.selectUCB(filteredArms, totalPulls);
                explorationFactor = this.calculateUCBExploration(selectedArm, totalPulls);
                break;
            case 'thompson_sampling':
                selectedArm = this.selectThompsonSampling(filteredArms);
                explorationFactor = this.calculateThompsonExploration(selectedArm);
                break;
            case 'epsilon_greedy':
                const result = this.selectEpsilonGreedy(filteredArms, totalPulls);
                selectedArm = result.arm;
                explorationFactor = result.isExploration ? 1.0 : 0.0;
                break;
            case 'linucb':
                selectedArm = this.selectLinUCB(filteredArms, contextType);
                explorationFactor = this.calculateLinUCBExploration(selectedArm);
                break;
            case 'exp3':
                selectedArm = this.selectExp3(filteredArms);
                explorationFactor = this.calculateExp3Exploration(selectedArm);
                break;
            case 'adaptive':
                const adaptiveResult = this.selectAdaptive(filteredArms, totalPulls, contextType);
                selectedArm = adaptiveResult.arm;
                explorationFactor = adaptiveResult.explorationFactor;
                algorithm = adaptiveResult.algorithm;
                break;
            default:
                throw new Error(`Unknown bandit strategy: ${strategy}`);
        }
        // Update selection metrics
        selectedArm.pulls++;
        selectedArm.lastPull = new Date();
        await this.updateArmInDatabase(selectedArm);
        // Calculate expected reward and regret bound
        const expectedReward = this.calculateExpectedReward(selectedArm);
        const regretBound = this.calculateRegretBound(selectedArm, totalPulls + 1);
        // Record selection metrics
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('bandit_arm_selected', true, {
            arm_id: selectedArm.armId,
            model_id: selectedArm.modelId,
            algorithm,
            context_type: contextType,
        });
        prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('bandit_exploration_factor', explorationFactor, { algorithm, context_type: contextType });
        logger_js_1.default.info('Bandit arm selected', {
            selectedArm: selectedArm.armId,
            modelId: selectedArm.modelId,
            algorithm,
            explorationFactor,
            expectedReward,
            pulls: selectedArm.pulls,
            contextType,
        });
        return {
            selectedArm: selectedArm.armId,
            confidence: selectedArm.confidence,
            explorationFactor,
            expectedReward,
            regretBound,
            algorithm,
        };
    }
    /**
     * Update arm with reward and learn from outcome
     */
    async updateArm(armId, reward, contextType = 'default') {
        const arm = this.arms.get(armId);
        if (!arm || arm.contextType !== contextType) {
            logger_js_1.default.warn('Arm not found for reward update', { armId, contextType });
            return;
        }
        try {
            // Update reward history
            arm.rewards.push(reward.totalReward);
            arm.cumulativeReward += reward.totalReward;
            // Calculate running statistics
            arm.averageReward = arm.cumulativeReward / arm.pulls;
            arm.variance = this.calculateVariance(arm.rewards);
            arm.confidence = reward.confidence;
            // Update quality metrics
            arm.qualityMetrics.accuracyScore = this.updateMetric(arm.qualityMetrics.accuracyScore, reward.baseReward, this.ALPHA);
            // Update cost metrics
            arm.costMetrics.totalCost = this.updateMetric(arm.costMetrics.totalCost, Math.abs(reward.costPenalty), this.ALPHA);
            arm.costMetrics.costPerQualityPoint =
                arm.costMetrics.totalCost /
                    Math.max(arm.qualityMetrics.accuracyScore, 0.01);
            // Update performance metrics
            arm.performanceMetrics.latency = this.updateMetric(arm.performanceMetrics.latency, Math.abs(reward.latencyPenalty) * 1000, // Convert to ms
            this.ALPHA);
            // Calculate regret
            if (this.optimalArm) {
                const optimalReward = this.arms.get(this.optimalArm)?.averageReward || 0;
                arm.regret += Math.max(0, optimalReward - reward.totalReward);
                this.totalRegret += Math.max(0, optimalReward - reward.totalReward);
            }
            // Update exploration bias based on recent performance
            arm.explorationBias = this.calculateExplorationBias(arm);
            // Store reward history for analysis
            if (!this.rewardHistory.has(armId)) {
                this.rewardHistory.set(armId, []);
            }
            this.rewardHistory.get(armId).push(reward.totalReward);
            // Keep only recent history
            const maxHistory = 1000;
            if (arm.rewards.length > maxHistory) {
                arm.rewards = arm.rewards.slice(-maxHistory);
            }
            // Persist updates
            await this.updateArmInDatabase(arm);
            await this.updateOptimalArm();
            // Record reward metrics
            prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('bandit_reward_received', reward.totalReward, { arm_id: armId, model_id: arm.modelId, context_type: contextType });
            prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('bandit_arm_regret', arm.regret, { arm_id: armId, model_id: arm.modelId });
            prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('bandit_total_regret', this.totalRegret, { context_type: contextType });
            logger_js_1.default.info('Bandit arm updated', {
                armId,
                reward: reward.totalReward,
                averageReward: arm.averageReward,
                pulls: arm.pulls,
                regret: arm.regret,
                confidence: arm.confidence,
            });
        }
        catch (error) {
            logger_js_1.default.error('Failed to update bandit arm', {
                error: error.message,
                armId,
                contextType,
            });
        }
    }
    /**
     * Upper Confidence Bound (UCB) selection
     */
    selectUCB(arms, totalPulls) {
        let bestArm = arms[0];
        let bestUCB = -Infinity;
        for (const arm of arms) {
            if (arm.pulls === 0) {
                return arm; // Always try untested arms first
            }
            const confidenceBound = Math.sqrt((this.C * Math.log(totalPulls)) / arm.pulls);
            const ucbValue = arm.averageReward + confidenceBound + arm.explorationBias * 0.1;
            if (ucbValue > bestUCB) {
                bestUCB = ucbValue;
                bestArm = arm;
            }
        }
        return bestArm;
    }
    /**
     * Thompson Sampling selection
     */
    selectThompsonSampling(arms) {
        let bestArm = arms[0];
        let bestSample = -Infinity;
        for (const arm of arms) {
            // Sample from posterior Beta distribution
            const alpha = arm.cumulativeReward + 1;
            const beta = arm.pulls - arm.cumulativeReward + 1;
            const sample = this.sampleBeta(alpha, beta);
            if (sample > bestSample) {
                bestSample = sample;
                bestArm = arm;
            }
        }
        return bestArm;
    }
    /**
     * Epsilon-Greedy selection
     */
    selectEpsilonGreedy(arms, totalPulls) {
        const epsilon = this.EPSILON * Math.pow(this.DECAY_FACTOR, totalPulls / 1000);
        if (Math.random() < epsilon) {
            // Exploration: random selection
            const randomIndex = Math.floor(Math.random() * arms.length);
            return { arm: arms[randomIndex], isExploration: true };
        }
        else {
            // Exploitation: greedy selection
            const bestArm = arms.reduce((best, current) => current.averageReward > best.averageReward ? current : best);
            return { arm: bestArm, isExploration: false };
        }
    }
    /**
     * Linear UCB for contextual bandits
     */
    selectLinUCB(arms, contextType) {
        // Simplified LinUCB - in production would use proper linear algebra
        let bestArm = arms[0];
        let bestValue = -Infinity;
        const contextWeight = this.getContextWeight(contextType);
        for (const arm of arms) {
            const contextualReward = arm.averageReward * contextWeight;
            const confidenceBound = Math.sqrt(this.C / Math.max(arm.pulls, 1));
            const linUCBValue = contextualReward + confidenceBound;
            if (linUCBValue > bestValue) {
                bestValue = linUCBValue;
                bestArm = arm;
            }
        }
        return bestArm;
    }
    /**
     * EXP3 algorithm for adversarial settings
     */
    selectExp3(arms) {
        const gamma = Math.min(1, Math.sqrt((5 * Math.log(arms.length)) / arms.length));
        // Calculate weights
        const weights = arms.map((arm) => {
            const estimatedReward = arm.pulls > 0 ? arm.averageReward : 0;
            return Math.exp((gamma * estimatedReward) / arms.length);
        });
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        const probabilities = weights.map((w) => w / totalWeight);
        // Select arm based on probability distribution
        const random = Math.random();
        let cumulative = 0;
        for (let i = 0; i < arms.length; i++) {
            cumulative += probabilities[i];
            if (random < cumulative) {
                return arms[i];
            }
        }
        return arms[arms.length - 1];
    }
    /**
     * Adaptive strategy selection based on current performance
     */
    selectAdaptive(arms, totalPulls, contextType) {
        // Determine best strategy based on current state
        let strategy = 'ucb';
        if (totalPulls < 50) {
            // Early exploration phase
            strategy = 'thompson_sampling';
        }
        else if (this.isHighVarianceContext(arms)) {
            // High uncertainty - use robust exploration
            strategy = 'ucb';
        }
        else if (this.isAdversarialContext(contextType)) {
            // Adversarial environment
            strategy = 'exp3';
        }
        else {
            // Stable environment - exploit
            strategy = 'epsilon_greedy';
        }
        let arm;
        let explorationFactor;
        switch (strategy) {
            case 'ucb':
                arm = this.selectUCB(arms, totalPulls);
                explorationFactor = this.calculateUCBExploration(arm, totalPulls);
                break;
            case 'thompson_sampling':
                arm = this.selectThompsonSampling(arms);
                explorationFactor = this.calculateThompsonExploration(arm);
                break;
            case 'epsilon_greedy':
                const result = this.selectEpsilonGreedy(arms, totalPulls);
                arm = result.arm;
                explorationFactor = result.isExploration ? 1.0 : 0.0;
                break;
            case 'exp3':
                arm = this.selectExp3(arms);
                explorationFactor = this.calculateExp3Exploration(arm);
                break;
            default:
                arm = this.selectUCB(arms, totalPulls);
                explorationFactor = this.calculateUCBExploration(arm, totalPulls);
        }
        return { arm, explorationFactor, algorithm: strategy };
    }
    // Utility methods for exploration factor calculation
    calculateUCBExploration(arm, totalPulls) {
        if (arm.pulls === 0)
            return 1.0;
        return Math.sqrt((this.C * Math.log(totalPulls)) / arm.pulls);
    }
    calculateThompsonExploration(arm) {
        // Exploration inversely related to confidence
        return 1 - arm.confidence;
    }
    calculateLinUCBExploration(arm) {
        return Math.sqrt(this.C / Math.max(arm.pulls, 1));
    }
    calculateExp3Exploration(arm) {
        const gamma = Math.min(1, Math.sqrt((5 * Math.log(10)) / 10)); // Simplified
        return gamma;
    }
    // Context analysis methods
    isHighVarianceContext(arms) {
        const avgVariance = arms.reduce((sum, arm) => sum + arm.variance, 0) / arms.length;
        return avgVariance > 0.1; // Threshold for high variance
    }
    isAdversarialContext(contextType) {
        // Check if context shows signs of adversarial behavior
        const recentRegret = this.getRecentRegret(contextType);
        return recentRegret > 0.05; // Threshold for adversarial behavior
    }
    getContextWeight(contextType) {
        const weights = {
            critical_analysis: 1.2,
            creative_writing: 0.9,
            code_generation: 1.1,
            translation: 1.0,
            summarization: 0.8,
            default: 1.0,
        };
        return weights[contextType] || 1.0;
    }
    getRecentRegret(contextType) {
        // Calculate recent regret for context type
        const contextArms = Array.from(this.arms.values()).filter((arm) => arm.contextType === contextType);
        if (contextArms.length === 0)
            return 0;
        const recentRegrets = contextArms.map((arm) => {
            const recentRewards = arm.rewards.slice(-10); // Last 10 rewards
            return recentRewards.length > 0
                ? Math.max(0, arm.averageReward -
                    recentRewards.reduce((a, b) => a + b) / recentRewards.length)
                : 0;
        });
        return (recentRegrets.reduce((sum, regret) => sum + regret, 0) /
            recentRegrets.length);
    }
    // Statistical utility methods
    calculateVariance(rewards) {
        if (rewards.length < 2)
            return 0;
        const mean = rewards.reduce((sum, r) => sum + r, 0) / rewards.length;
        const squaredDiffs = rewards.map((r) => Math.pow(r - mean, 2));
        return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / rewards.length;
    }
    calculateExpectedReward(arm) {
        // Combine historical average with quality and cost adjustments
        const qualityAdjustment = arm.qualityMetrics.accuracyScore * 0.2;
        const costAdjustment = -arm.costMetrics.costPerQualityPoint * 0.1;
        const performanceAdjustment = (1 - arm.performanceMetrics.latency / 5000) * 0.1;
        return (arm.averageReward +
            qualityAdjustment +
            costAdjustment +
            performanceAdjustment);
    }
    calculateRegretBound(arm, totalPulls) {
        // Theoretical regret bound for UCB
        return Math.sqrt((8 * Math.log(totalPulls)) / Math.max(arm.pulls, 1));
    }
    calculateExplorationBias(arm) {
        // Increase exploration bias for arms with high variance or low confidence
        const varianceBias = Math.min(arm.variance, 0.2) / 0.2;
        const confidenceBias = 1 - arm.confidence;
        const recencyBias = this.calculateRecencyBias(arm);
        return varianceBias * 0.4 + confidenceBias * 0.4 + recencyBias * 0.2;
    }
    calculateRecencyBias(arm) {
        const daysSinceLastPull = (Date.now() - arm.lastPull.getTime()) / (1000 * 60 * 60 * 24);
        return Math.min(daysSinceLastPull / 7, 1); // Increase bias if not pulled in last week
    }
    updateMetric(currentValue, newValue, learningRate) {
        return currentValue * (1 - learningRate) + newValue * learningRate;
    }
    sampleBeta(alpha, beta) {
        // Simplified beta sampling - use proper statistical library in production
        const gamma1 = this.sampleGamma(alpha);
        const gamma2 = this.sampleGamma(beta);
        return gamma1 / (gamma1 + gamma2);
    }
    sampleGamma(shape) {
        // Simplified gamma sampling - use proper statistical library in production
        return Math.random() * shape; // Placeholder
    }
    initializeStrategies() {
        this.strategies.set('ucb', {
            name: 'Upper Confidence Bound',
            explorationRate: 0.1,
            confidenceThreshold: 0.95,
            regretBound: 0.1,
            adaptiveLearning: true,
            contextualWeighting: false,
        });
        this.strategies.set('thompson_sampling', {
            name: 'Thompson Sampling',
            explorationRate: 0.2,
            confidenceThreshold: 0.9,
            regretBound: 0.15,
            adaptiveLearning: true,
            contextualWeighting: true,
        });
        this.strategies.set('epsilon_greedy', {
            name: 'Epsilon Greedy',
            explorationRate: 0.1,
            confidenceThreshold: 0.85,
            regretBound: 0.2,
            adaptiveLearning: false,
            contextualWeighting: false,
        });
        this.strategies.set('linucb', {
            name: 'Linear Upper Confidence Bound',
            explorationRate: 0.15,
            confidenceThreshold: 0.95,
            regretBound: 0.1,
            adaptiveLearning: true,
            contextualWeighting: true,
        });
    }
    // Database operations
    async loadBanditArms() {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
        SELECT arm_id, model_id, context_type, pulls, cumulative_reward, 
               average_reward, confidence, variance, regret, last_pull,
               exploration_bias, quality_metrics, cost_metrics, performance_metrics
        FROM bandit_arms 
        WHERE last_pull > NOW() - INTERVAL '30 days'
      `);
            for (const row of result.rows) {
                const arm = {
                    armId: row.arm_id,
                    modelId: row.model_id,
                    contextType: row.context_type,
                    rewards: [], // Will be loaded separately if needed
                    pulls: parseInt(row.pulls),
                    cumulativeReward: parseFloat(row.cumulative_reward),
                    averageReward: parseFloat(row.average_reward),
                    confidence: parseFloat(row.confidence),
                    variance: parseFloat(row.variance),
                    regret: parseFloat(row.regret),
                    lastPull: row.last_pull,
                    explorationBias: parseFloat(row.exploration_bias),
                    qualityMetrics: row.quality_metrics || this.getDefaultQualityMetrics(),
                    costMetrics: row.cost_metrics || this.getDefaultCostMetrics(),
                    performanceMetrics: row.performance_metrics || this.getDefaultPerformanceMetrics(),
                };
                this.arms.set(arm.armId, arm);
            }
            logger_js_1.default.info(`Loaded ${result.rows.length} bandit arms`);
        }
        finally {
            client.release();
        }
    }
    async updateArmInDatabase(arm) {
        const client = await this.pool.connect();
        try {
            await client.query(`
        INSERT INTO bandit_arms (
          arm_id, model_id, context_type, pulls, cumulative_reward, average_reward,
          confidence, variance, regret, last_pull, exploration_bias,
          quality_metrics, cost_metrics, performance_metrics
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (arm_id, context_type) 
        DO UPDATE SET 
          pulls = $4, cumulative_reward = $5, average_reward = $6,
          confidence = $7, variance = $8, regret = $9, last_pull = $10,
          exploration_bias = $11, quality_metrics = $12, cost_metrics = $13,
          performance_metrics = $14
      `, [
                arm.armId,
                arm.modelId,
                arm.contextType,
                arm.pulls,
                arm.cumulativeReward,
                arm.averageReward,
                arm.confidence,
                arm.variance,
                arm.regret,
                arm.lastPull,
                arm.explorationBias,
                JSON.stringify(arm.qualityMetrics),
                JSON.stringify(arm.costMetrics),
                JSON.stringify(arm.performanceMetrics),
            ]);
        }
        finally {
            client.release();
        }
    }
    async calculateOptimalArm() {
        const arms = Array.from(this.arms.values());
        if (arms.length === 0)
            return;
        let bestArm = arms[0];
        let bestReward = bestArm.averageReward;
        for (const arm of arms) {
            if (arm.pulls > this.MIN_PULLS && arm.averageReward > bestReward) {
                bestReward = arm.averageReward;
                bestArm = arm;
            }
        }
        this.optimalArm = bestArm.armId;
    }
    async updateOptimalArm() {
        await this.calculateOptimalArm();
    }
    getDefaultQualityMetrics() {
        return {
            accuracyScore: 0.5,
            coherenceScore: 0.5,
            relevanceScore: 0.5,
            completenessScore: 0.5,
            userSatisfaction: 0.5,
            expertValidation: 0.5,
        };
    }
    getDefaultCostMetrics() {
        return {
            tokenCost: 0,
            computeCost: 0,
            latencyCost: 0,
            opportunityCost: 0,
            totalCost: 0,
            costPerQualityPoint: 0,
        };
    }
    getDefaultPerformanceMetrics() {
        return {
            latency: 2000,
            throughput: 1,
            reliability: 0.95,
            availability: 0.99,
            errorRate: 0.01,
            resourceUtilization: 0.5,
        };
    }
}
exports.MultiArmedBanditOptimizer = MultiArmedBanditOptimizer;
