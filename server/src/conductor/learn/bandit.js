"use strict";
// @ts-nocheck
// Router v2: Online Learning with Thompson Sampling and LinUCB
// Reduces cost/latency while improving answer quality through contextual bandits
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adaptiveRouter = exports.defaultBanditConfig = exports.AdaptiveRouter = exports.LinUCBBandit = exports.ThompsonSamplingBandit = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const events_1 = require("events");
const prometheus_js_1 = require("../observability/prometheus.js");
/**
 * Thompson Sampling Bandit for expert selection
 */
class ThompsonSamplingBandit {
    arms = new Map();
    redis;
    constructor(arms, redis) {
        this.redis = redis;
        // Initialize arms with Beta(1,1) prior
        arms.forEach((arm) => {
            this.arms.set(arm, {
                alpha: 1.0,
                beta: 1.0,
                totalPulls: 0,
                totalReward: 0,
                lastUpdated: Date.now(),
                confidenceInterval: { lower: 0, upper: 1 },
            });
        });
        this.redis = redis;
    }
    /**
     * Select arm using Thompson Sampling
     */
    selectArm(context) {
        const samples = new Map();
        // Sample from each arm's posterior
        for (const [arm, stats] of this.arms) {
            const sample = this.sampleBeta(stats.alpha, stats.beta);
            samples.set(arm, sample);
        }
        // Return arm with highest sample
        let bestArm = null;
        let bestSample = -1;
        for (const [arm, sample] of samples) {
            if (sample > bestSample) {
                bestSample = sample;
                bestArm = arm;
            }
        }
        return bestArm;
    }
    /**
     * Update arm with reward
     */
    updateArm(arm, reward) {
        const stats = this.arms.get(arm);
        if (!stats)
            return;
        // Update Beta distribution parameters
        stats.alpha += reward;
        stats.beta += 1 - reward;
        stats.totalPulls += 1;
        stats.totalReward += reward;
        stats.lastUpdated = Date.now();
        // Update confidence interval
        this.updateConfidenceInterval(stats);
    }
    sampleBeta(alpha, beta) {
        // Simple approximation using Gamma distribution
        const gammaA = this.sampleGamma(alpha, 1);
        const gammaB = this.sampleGamma(beta, 1);
        return gammaA / (gammaA + gammaB);
    }
    sampleGamma(shape, scale) {
        // Marsaglia and Tsang's method for Gamma sampling
        if (shape < 1) {
            return (this.sampleGamma(shape + 1, scale) * Math.pow(Math.random(), 1 / shape));
        }
        const d = shape - 1 / 3;
        const c = 1 / Math.sqrt(9 * d);
        while (true) {
            let x, v;
            do {
                x = this.randomNormal();
                v = 1 + c * x;
            } while (v <= 0);
            v = v * v * v;
            const u = Math.random();
            if (u < 1 - 0.0331 * (x * x) * (x * x)) {
                return d * v * scale;
            }
            if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
                return d * v * scale;
            }
        }
    }
    randomNormal() {
        // Box-Muller transform
        let u = 0, v = 0;
        while (u === 0)
            u = Math.random();
        while (v === 0)
            v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }
    updateConfidenceInterval(stats) {
        // 95% confidence interval for Beta distribution
        const n = stats.totalPulls;
        if (n < 2) {
            stats.confidenceInterval = { lower: 0, upper: 1 };
            return;
        }
        const mean = stats.alpha / (stats.alpha + stats.beta);
        const variance = (stats.alpha * stats.beta) /
            ((stats.alpha + stats.beta) ** 2 * (stats.alpha + stats.beta + 1));
        const stddev = Math.sqrt(variance);
        stats.confidenceInterval = {
            lower: Math.max(0, mean - 1.96 * stddev),
            upper: Math.min(1, mean + 1.96 * stddev),
        };
    }
    getArmStatistics() {
        return new Map(this.arms);
    }
}
exports.ThompsonSamplingBandit = ThompsonSamplingBandit;
/**
 * LinUCB Contextual Bandit
 */
class LinUCBBandit {
    models = new Map();
    featureDimension;
    alpha;
    constructor(arms, featureDimension = 20, alpha = 1.0) {
        this.featureDimension = featureDimension;
        this.alpha = alpha;
        // Initialize models for each arm
        arms.forEach((arm) => {
            this.models.set(arm, {
                A: this.identityMatrix(featureDimension),
                b: new Array(featureDimension).fill(0),
                alpha: alpha,
                dimension: featureDimension,
                lastUpdated: Date.now(),
            });
        });
    }
    /**
     * Select arm using LinUCB algorithm
     */
    selectArm(context) {
        const features = this.extractFeatures(context);
        let bestArm = null;
        let bestUCB = -Infinity;
        const armConfidences = new Map();
        for (const [arm, model] of this.models) {
            const ucbValue = this.calculateUCB(model, features);
            armConfidences.set(arm, ucbValue);
            if (ucbValue > bestUCB) {
                bestUCB = ucbValue;
                bestArm = arm;
            }
        }
        return {
            arm: bestArm,
            confidence: bestUCB,
        };
    }
    /**
     * Update model with reward
     */
    updateArm(arm, features, reward) {
        const model = this.models.get(arm);
        if (!model)
            return;
        // Update A = A + x * x^T
        for (let i = 0; i < this.featureDimension; i++) {
            for (let j = 0; j < this.featureDimension; j++) {
                model.A[i][j] += features[i] * features[j];
            }
            // Update b = b + reward * x
            model.b[i] += reward * features[i];
        }
        model.lastUpdated = Date.now();
    }
    extractFeatures(context) {
        const features = new Array(this.featureDimension).fill(0);
        let idx = 0;
        // Domain features (one-hot encoded)
        const domains = ['graph', 'rag', 'files', 'osint', 'export', 'general'];
        const domainIdx = domains.indexOf(context.domain) !== -1
            ? domains.indexOf(context.domain)
            : domains.length - 1;
        if (idx + domains.length <= this.featureDimension) {
            features[idx + domainIdx] = 1.0;
        }
        idx += domains.length;
        // Sensitivity level
        const sensitivityMap = {
            public: 0.25,
            internal: 0.5,
            confidential: 0.75,
            secret: 1.0,
        };
        if (idx < this.featureDimension) {
            features[idx] = sensitivityMap[context.sensitivity] || 0.5;
        }
        idx++;
        // Token estimate (normalized)
        if (idx < this.featureDimension) {
            features[idx] = Math.min(context.tokenEst / 10000, 1.0); // Normalize to [0,1]
        }
        idx++;
        // Tenant hash (normalized)
        if (idx < this.featureDimension) {
            features[idx] = this.hashString(context.tenant) / Number.MAX_SAFE_INTEGER;
        }
        idx++;
        // Time features
        if (context.timeOfDay && idx + 4 <= this.featureDimension) {
            const timeMap = {
                morning: [1, 0, 0, 0],
                afternoon: [0, 1, 0, 0],
                evening: [0, 0, 1, 0],
                night: [0, 0, 0, 1],
            };
            const timeFeatures = timeMap[context.timeOfDay] || [
                0.25, 0.25, 0.25, 0.25,
            ];
            timeFeatures.forEach((val) => (features[idx++] = val));
        }
        // Complexity and urgency
        if (context.queryComplexity && idx < this.featureDimension) {
            const complexityMap = { simple: 0.2, medium: 0.6, complex: 1.0 };
            features[idx] = complexityMap[context.queryComplexity] || 0.6;
            idx++;
        }
        if (context.urgency && idx < this.featureDimension) {
            const urgencyMap = { low: 0.2, medium: 0.6, high: 1.0 };
            features[idx] = urgencyMap[context.urgency] || 0.6;
            idx++;
        }
        return features;
    }
    calculateUCB(model, features) {
        // Calculate theta = A^(-1) * b
        const theta = this.solveLinearSystem(model.A, model.b);
        // Calculate x^T * theta (expected reward)
        const expectedReward = features.reduce((sum, feat, i) => sum + feat * theta[i], 0);
        // Calculate confidence width: alpha * sqrt(x^T * A^(-1) * x)
        const AInv = this.invertMatrix(model.A);
        let confidenceWidth = 0;
        for (let i = 0; i < this.featureDimension; i++) {
            for (let j = 0; j < this.featureDimension; j++) {
                confidenceWidth += features[i] * AInv[i][j] * features[j];
            }
        }
        confidenceWidth = model.alpha * Math.sqrt(Math.max(0, confidenceWidth));
        return expectedReward + confidenceWidth;
    }
    identityMatrix(size) {
        const matrix = Array(size)
            .fill(null)
            .map(() => Array(size).fill(0));
        for (let i = 0; i < size; i++) {
            matrix[i][i] = 1;
        }
        return matrix;
    }
    solveLinearSystem(A, b) {
        // Simplified: Use Gaussian elimination or return approximation
        // For production, use proper numerical methods
        const n = b.length;
        const result = new Array(n).fill(0);
        // Simple diagonal approximation for now
        for (let i = 0; i < n; i++) {
            result[i] = A[i][i] !== 0 ? b[i] / A[i][i] : 0;
        }
        return result;
    }
    invertMatrix(A) {
        // Simplified matrix inversion - in production, use proper numerical library
        const n = A.length;
        const result = this.identityMatrix(n);
        // For diagonal-dominant matrices, use diagonal approximation
        for (let i = 0; i < n; i++) {
            result[i][i] = A[i][i] !== 0 ? 1 / A[i][i] : 1;
        }
        return result;
    }
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
}
exports.LinUCBBandit = LinUCBBandit;
/**
 * Adaptive Router with Online Learning
 */
class AdaptiveRouter extends events_1.EventEmitter {
    thompsonBandit;
    linucbBandit;
    config;
    redis;
    pendingRewards = new Map();
    rewardTimeout = 300000; // 5 minutes
    shadowModeDecisions = new Map();
    failureStreak = new Map();
    constructor(config, redis) {
        super();
        this.config = config;
        this.redis = redis;
        const arms = [
            'LLM_LIGHT',
            'LLM_HEAVY',
            'GRAPH_TOOL',
            'RAG_TOOL',
            'FILES_TOOL',
            'OSINT_TOOL',
            'EXPORT_TOOL',
        ];
        this.thompsonBandit = new ThompsonSamplingBandit(arms, redis);
        this.linucbBandit = new LinUCBBandit(arms, 20, config.ucbAlpha);
        // Initialize failure streaks
        arms.forEach((arm) => this.failureStreak.set(arm, 0));
        this.startRewardCleanup();
        this.loadPersistedState();
    }
    /**
     * Route request to best expert with learning
     */
    async route(context, query) {
        const contextHash = this.hashContext(context);
        const decisionId = `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // Check safety mode
        if (this.config.safetyMode.enabled && this.shouldUseSafetyMode(context)) {
            return this.createSafetyDecision(context, contextHash, decisionId);
        }
        // Check if in shadow mode
        if (this.config.enableShadowMode &&
            Math.random() > this.config.canaryPercent / 100) {
            return this.createProductionDecision(context, contextHash, decisionId);
        }
        let selectedArm;
        let confidence;
        let explorationReason;
        // Select algorithm
        switch (this.config.algorithm) {
            case 'thompson':
                selectedArm = this.thompsonBandit.selectArm(context);
                confidence = this.getThompsonConfidence(selectedArm);
                explorationReason = 'thompson_sampling';
                break;
            case 'linucb':
                const linucbResult = this.linucbBandit.selectArm(context);
                selectedArm = linucbResult.arm;
                confidence = linucbResult.confidence;
                explorationReason = 'ucb_exploration';
                break;
            case 'hybrid':
                // Use Thompson Sampling early, LinUCB later
                const totalPulls = this.getTotalPulls();
                if (totalPulls < this.config.minPullsBeforeExploit * 7) {
                    // 7 arms
                    selectedArm = this.thompsonBandit.selectArm(context);
                    confidence = this.getThompsonConfidence(selectedArm);
                    explorationReason = 'thompson_sampling';
                }
                else {
                    const linucbResult = this.linucbBandit.selectArm(context);
                    selectedArm = linucbResult.arm;
                    confidence = linucbResult.confidence;
                    explorationReason = 'ucb_exploration';
                }
                break;
            default:
                throw new Error(`Unknown algorithm: ${this.config.algorithm}`);
        }
        // Create decision
        const decision = {
            selectedArm,
            confidence,
            explorationReason,
            context,
            contextHash,
            expectedReward: this.getExpectedReward(selectedArm, context),
            armProbabilities: this.getArmProbabilities(context),
            decisionId,
            timestamp: Date.now(),
        };
        // Store decision for reward tracking
        this.pendingRewards.set(decisionId, decision);
        // Persist decision
        await this.redis.setex(`router_decision:${decisionId}`, this.config.rewardWindow * 3600, JSON.stringify(decision));
        // Emit decision event
        this.emit('route:decision', decision);
        // Record metrics
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent(`router_selected_${selectedArm}`, true);
        return decision;
    }
    /**
     * Process reward signal
     */
    async processReward(rewardSignal) {
        const decision = this.pendingRewards.get(rewardSignal.contextHash) ||
            (await this.getStoredDecision(rewardSignal.contextHash));
        if (!decision) {
            console.warn(`No decision found for reward signal: ${rewardSignal.contextHash}`);
            return;
        }
        // Validate reward signal
        if (rewardSignal.rewardValue < 0 || rewardSignal.rewardValue > 1) {
            console.warn(`Invalid reward value: ${rewardSignal.rewardValue}`);
            return;
        }
        // Update failure streak
        if (rewardSignal.rewardValue < 0.5) {
            this.failureStreak.set(rewardSignal.armId, (this.failureStreak.get(rewardSignal.armId) || 0) + 1);
        }
        else {
            this.failureStreak.set(rewardSignal.armId, 0);
        }
        // Update bandits
        this.thompsonBandit.updateArm(rewardSignal.armId, rewardSignal.rewardValue);
        if (this.config.algorithm === 'linucb' ||
            this.config.algorithm === 'hybrid') {
            const features = this.linucbBandit['extractFeatures'](decision.context);
            this.linucbBandit.updateArm(rewardSignal.armId, features, rewardSignal.rewardValue);
        }
        // Clean up pending reward
        this.pendingRewards.delete(rewardSignal.contextHash);
        // Persist updated state
        await this.persistState();
        // Emit reward event
        this.emit('reward:processed', { decision, reward: rewardSignal });
        // Record metrics
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent(`router_reward_${rewardSignal.rewardType}`, rewardSignal.rewardValue > 0.5);
    }
    /**
     * Get router performance metrics
     */
    getPerformanceMetrics() {
        const armStats = this.thompsonBandit.getArmStatistics();
        const statsRecord = {};
        let totalPulls = 0;
        let totalReward = 0;
        for (const [arm, stats] of armStats) {
            statsRecord[arm] = stats;
            totalPulls += stats.totalPulls;
            totalReward += stats.totalReward;
        }
        return {
            armStatistics: statsRecord,
            totalDecisions: totalPulls,
            averageReward: totalPulls > 0 ? totalReward / totalPulls : 0,
            explorationRate: this.calculateExplorationRate(),
            recentPerformance: {
                last24h: 0, // TODO: Implement time-windowed metrics
                last7d: 0,
            },
        };
    }
    /**
     * Reset bandit state (for testing or retraining)
     */
    async resetBandits() {
        const arms = [
            'LLM_LIGHT',
            'LLM_HEAVY',
            'GRAPH_TOOL',
            'RAG_TOOL',
            'FILES_TOOL',
            'OSINT_TOOL',
            'EXPORT_TOOL',
        ];
        this.thompsonBandit = new ThompsonSamplingBandit(arms, this.redis);
        this.linucbBandit = new LinUCBBandit(arms, 20, this.config.ucbAlpha);
        this.pendingRewards.clear();
        this.failureStreak.clear();
        arms.forEach((arm) => this.failureStreak.set(arm, 0));
        await this.redis.del('router:bandit_state');
        this.emit('bandits:reset');
    }
    hashContext(context) {
        const contextStr = JSON.stringify({
            domain: context.domain,
            sensitivity: context.sensitivity,
            tenant: context.tenant,
            tokenEst: Math.floor(context.tokenEst / 100) * 100, // Quantize
            timeOfDay: context.timeOfDay,
            complexity: context.queryComplexity,
        });
        return require('crypto')
            .createHash('sha256')
            .update(contextStr)
            .digest('hex')
            .substr(0, 16);
    }
    shouldUseSafetyMode(context) {
        // Check if any arm has too many consecutive failures
        for (const [arm, failures] of this.failureStreak) {
            if (failures >= this.config.safetyMode.maxConsecutiveFailures) {
                return true;
            }
        }
        // Check for critical contexts
        if (context.sensitivity === 'secret' || context.urgency === 'high') {
            return true;
        }
        return false;
    }
    createSafetyDecision(context, contextHash, decisionId) {
        return {
            selectedArm: this.config.safetyMode.fallbackArm,
            confidence: 0.5,
            explorationReason: 'random_exploration',
            context,
            contextHash,
            expectedReward: 0.5,
            armProbabilities: {},
            decisionId,
            timestamp: Date.now(),
        };
    }
    createProductionDecision(context, contextHash, decisionId) {
        // Use deterministic production routing logic
        let productionArm = 'LLM_LIGHT';
        if (context.domain === 'graph')
            productionArm = 'GRAPH_TOOL';
        else if (context.domain === 'rag')
            productionArm = 'RAG_TOOL';
        else if (context.domain === 'files')
            productionArm = 'FILES_TOOL';
        else if (context.domain === 'osint')
            productionArm = 'OSINT_TOOL';
        else if (context.domain === 'export')
            productionArm = 'EXPORT_TOOL';
        else if (context.tokenEst > 5000 || context.queryComplexity === 'complex') {
            productionArm = 'LLM_HEAVY';
        }
        return {
            selectedArm: productionArm,
            confidence: 0.8,
            context,
            contextHash,
            expectedReward: 0.7,
            armProbabilities: {},
            decisionId,
            timestamp: Date.now(),
        };
    }
    getThompsonConfidence(arm) {
        const stats = this.thompsonBandit.getArmStatistics().get(arm);
        if (!stats)
            return 0.5;
        // Return width of confidence interval as inverse confidence measure
        const width = stats.confidenceInterval.upper - stats.confidenceInterval.lower;
        return Math.max(0.1, 1 - width);
    }
    getExpectedReward(arm, context) {
        const stats = this.thompsonBandit.getArmStatistics().get(arm);
        if (!stats || stats.totalPulls === 0)
            return 0.5;
        return stats.alpha / (stats.alpha + stats.beta);
    }
    getArmProbabilities(context) {
        // Calculate selection probabilities for all arms
        const probs = {};
        const armStats = this.thompsonBandit.getArmStatistics();
        for (const [arm, stats] of armStats) {
            probs[arm] = stats.alpha / (stats.alpha + stats.beta);
        }
        return probs;
    }
    getTotalPulls() {
        let total = 0;
        for (const stats of this.thompsonBandit.getArmStatistics().values()) {
            total += stats.totalPulls;
        }
        return total;
    }
    calculateExplorationRate() {
        // Calculate recent exploration vs exploitation ratio
        return 0.2; // TODO: Implement based on recent decisions
    }
    async getStoredDecision(contextHash) {
        try {
            const stored = await this.redis.get(`router_decision:${contextHash}`);
            return stored ? JSON.parse(stored) : null;
        }
        catch {
            return null;
        }
    }
    async persistState() {
        const state = {
            thompson: Object.fromEntries(this.thompsonBandit.getArmStatistics()),
            failureStreaks: Object.fromEntries(this.failureStreak),
            lastUpdated: Date.now(),
        };
        await this.redis.setex('router:bandit_state', 86400 * 7, JSON.stringify(state));
    }
    async loadPersistedState() {
        try {
            const stored = await this.redis.get('router:bandit_state');
            if (!stored)
                return;
            const state = JSON.parse(stored);
            // Restore Thompson sampling state
            for (const [arm, stats] of Object.entries(state.thompson)) {
                this.thompsonBandit['arms'].set(arm, stats);
            }
            // Restore failure streaks
            for (const [arm, count] of Object.entries(state.failureStreaks)) {
                this.failureStreak.set(arm, count);
            }
            console.log('Restored bandit state from Redis');
        }
        catch (error) {
            console.warn('Failed to load persisted bandit state:', error.message);
        }
    }
    startRewardCleanup() {
        setInterval(() => {
            const now = Date.now();
            const expiredKeys = [];
            for (const [key, decision] of this.pendingRewards) {
                if (now - decision.timestamp > this.rewardTimeout) {
                    expiredKeys.push(key);
                }
            }
            expiredKeys.forEach((key) => {
                this.pendingRewards.delete(key);
                // Could emit timeout event here
            });
        }, 60000); // Clean up every minute
    }
}
exports.AdaptiveRouter = AdaptiveRouter;
// Default configuration
exports.defaultBanditConfig = {
    algorithm: 'hybrid',
    enableShadowMode: true,
    canaryPercent: 10,
    explorationRate: 0.1,
    ucbAlpha: 2.0,
    contextWindow: 24,
    minPullsBeforeExploit: 10,
    rewardWindow: 1,
    safetyMode: {
        enabled: true,
        fallbackArm: 'LLM_LIGHT',
        maxConsecutiveFailures: 5,
    },
};
// Singleton instance
exports.adaptiveRouter = new AdaptiveRouter(exports.defaultBanditConfig, new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379'));
