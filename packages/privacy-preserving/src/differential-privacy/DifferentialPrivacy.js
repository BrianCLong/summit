"use strict";
/**
 * DifferentialPrivacy - Implement differential privacy mechanisms
 * Supports Laplace, Gaussian, and Exponential mechanisms
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivacyBudgetManager = exports.DifferentialPrivacy = void 0;
/**
 * Differential Privacy Manager
 */
class DifferentialPrivacy {
    config;
    budget;
    constructor(config) {
        this.config = config;
        this.budget = {
            epsilon: config.epsilon,
            delta: config.delta || 0,
            spent: 0,
            remaining: config.epsilon,
            allocations: []
        };
    }
    /**
     * Add Laplace noise for differential privacy
     */
    addLaplaceNoise(value, sensitivity) {
        const scale = sensitivity / this.config.epsilon;
        const noise = this.sampleLaplace(scale);
        return value + noise;
    }
    /**
     * Add Gaussian noise for (ε,δ)-differential privacy
     */
    addGaussianNoise(value, sensitivity) {
        if (!this.config.delta) {
            throw new Error('Delta must be specified for Gaussian mechanism');
        }
        const sigma = this.computeGaussianSigma(sensitivity, this.config.epsilon, this.config.delta);
        const noise = this.sampleGaussian(0, sigma);
        return value + noise;
    }
    /**
     * Apply exponential mechanism for selecting from discrete options
     */
    exponentialMechanism(options, scoringFunction, sensitivity) {
        const epsilon = this.config.epsilon;
        // Compute scores
        const scores = options.map(opt => scoringFunction(opt));
        // Compute probabilities using exponential mechanism
        const probabilities = scores.map(score => Math.exp((epsilon * score) / (2 * sensitivity)));
        // Normalize probabilities
        const sum = probabilities.reduce((a, b) => a + b, 0);
        const normalizedProbs = probabilities.map(p => p / sum);
        // Sample from distribution
        const rand = Math.random();
        let cumulative = 0;
        for (let i = 0; i < options.length; i++) {
            cumulative += normalizedProbs[i];
            if (rand <= cumulative) {
                return options[i];
            }
        }
        return options[options.length - 1];
    }
    /**
     * Privatize a numerical query result
     */
    privatizeQuery(result, sensitivity) {
        // Check budget
        if (this.budget.remaining < this.config.epsilon) {
            throw new Error('Privacy budget exhausted');
        }
        let privatized;
        switch (this.config.mechanism) {
            case 'laplace':
                privatized = this.addLaplaceNoise(result, sensitivity);
                break;
            case 'gaussian':
                privatized = this.addGaussianNoise(result, sensitivity);
                break;
            default:
                throw new Error(`Unsupported mechanism: ${this.config.mechanism}`);
        }
        // Update budget
        this.updateBudget('query', this.config.epsilon, this.config.delta || 0);
        return privatized;
    }
    /**
     * Privatize a histogram
     */
    privatizeHistogram(histogram, sensitivity = 1) {
        const privatized = {};
        for (const [key, count] of Object.entries(histogram)) {
            privatized[key] = Math.max(0, this.privatizeQuery(count, sensitivity));
        }
        return privatized;
    }
    /**
     * Privatize summary statistics
     */
    privatizeStatistics(stats, dataRange) {
        const [min, max] = dataRange;
        const range = max - min;
        // Sensitivity of mean is range/n
        const meanSensitivity = range / stats.count;
        // Sensitivity of count is 1
        const countSensitivity = 1;
        return {
            mean: this.privatizeQuery(stats.mean, meanSensitivity),
            count: Math.round(this.privatizeQuery(stats.count, countSensitivity)),
            // Variance requires more careful handling
            variance: stats.variance * (1 + this.sampleGaussian(0, 0.1))
        };
    }
    /**
     * Compose privacy guarantees using advanced composition
     */
    composePrivacy(operations) {
        if (this.config.accountingMethod === 'basic') {
            // Basic composition: sum of epsilons
            const totalEpsilon = operations.reduce((sum, op) => sum + op.epsilon, 0);
            const totalDelta = operations.reduce((sum, op) => sum + op.delta, 0);
            return { epsilon: totalEpsilon, delta: totalDelta };
        }
        else if (this.config.accountingMethod === 'advanced') {
            // Advanced composition theorem
            const k = operations.length;
            const epsilon = operations[0].epsilon;
            const delta = operations[0].delta;
            const composedEpsilon = Math.sqrt(2 * k * Math.log(1 / delta)) * epsilon + k * epsilon * (Math.exp(epsilon) - 1);
            const composedDelta = k * delta;
            return { epsilon: composedEpsilon, delta: composedDelta };
        }
        else {
            // Renyi DP composition (more advanced)
            return this.renyiComposition(operations);
        }
    }
    /**
     * Get current privacy budget status
     */
    getBudgetStatus() {
        return { ...this.budget };
    }
    /**
     * Reset privacy budget
     */
    resetBudget() {
        this.budget.spent = 0;
        this.budget.remaining = this.config.epsilon;
        this.budget.allocations = [];
    }
    // Private helper methods
    sampleLaplace(scale) {
        // Sample from Laplace distribution
        const u = Math.random() - 0.5;
        return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
    }
    sampleGaussian(mean, sigma) {
        // Box-Muller transform
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return mean + z * sigma;
    }
    computeGaussianSigma(sensitivity, epsilon, delta) {
        // Compute sigma for Gaussian mechanism
        return sensitivity * Math.sqrt(2 * Math.log(1.25 / delta)) / epsilon;
    }
    updateBudget(operation, epsilonUsed, deltaUsed) {
        this.budget.spent += epsilonUsed;
        this.budget.remaining -= epsilonUsed;
        this.budget.allocations.push({
            operation,
            epsilonUsed,
            deltaUsed,
            timestamp: new Date()
        });
    }
    renyiComposition(operations) {
        // Simplified Renyi DP composition
        const k = operations.length;
        const epsilon = operations[0].epsilon;
        // Approximate Renyi composition
        const composedEpsilon = epsilon * Math.sqrt(k * Math.log(1 / operations[0].delta));
        const composedDelta = operations.reduce((sum, op) => sum + op.delta, 0);
        return { epsilon: composedEpsilon, delta: composedDelta };
    }
}
exports.DifferentialPrivacy = DifferentialPrivacy;
/**
 * Privacy Budget Manager for managing multiple DP operations
 */
class PrivacyBudgetManager {
    totalBudget;
    allocations = new Map();
    constructor(totalBudget) {
        this.totalBudget = totalBudget;
    }
    /**
     * Allocate budget to a specific operation
     */
    allocate(operationId, epsilon, delta = 0) {
        const dp = new DifferentialPrivacy({
            epsilon,
            delta,
            mechanism: 'laplace'
        });
        this.allocations.set(operationId, dp);
        return dp;
    }
    /**
     * Get total budget spent
     */
    getTotalSpent() {
        let total = 0;
        this.allocations.forEach(dp => {
            const budget = dp.getBudgetStatus();
            total += budget.spent;
        });
        return total;
    }
    /**
     * Get remaining budget
     */
    getRemaining() {
        return this.totalBudget - this.getTotalSpent();
    }
    /**
     * Check if operation is within budget
     */
    canAllocate(epsilon) {
        return this.getRemaining() >= epsilon;
    }
}
exports.PrivacyBudgetManager = PrivacyBudgetManager;
exports.default = DifferentialPrivacy;
