"use strict";
/**
 * Logistic Risk Scoring Model
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogisticRiskScorer = void 0;
class LogisticRiskScorer {
    coefficients = [];
    intercept = 0;
    featureNames = [];
    fitted = false;
    /**
     * Fit logistic regression model
     */
    fit(features, labels, featureNames) {
        this.featureNames = featureNames || features[0].map((_, i) => `feature_${i}`);
        // Initialize coefficients
        this.coefficients = new Array(features[0].length).fill(0);
        this.intercept = 0;
        // Gradient descent
        const learningRate = 0.01;
        const iterations = 1000;
        for (let iter = 0; iter < iterations; iter++) {
            const predictions = this.predictProba(features);
            // Update intercept
            let interceptGrad = 0;
            for (let i = 0; i < labels.length; i++) {
                interceptGrad += predictions[i] - labels[i];
            }
            this.intercept -= learningRate * interceptGrad / labels.length;
            // Update coefficients
            for (let j = 0; j < this.coefficients.length; j++) {
                let grad = 0;
                for (let i = 0; i < labels.length; i++) {
                    grad += (predictions[i] - labels[i]) * features[i][j];
                }
                this.coefficients[j] -= learningRate * grad / labels.length;
            }
        }
        this.fitted = true;
    }
    /**
     * Calculate risk score for entity
     */
    score(entityId, features) {
        if (!this.fitted) {
            throw new Error('Model must be fitted before scoring');
        }
        const probability = this.predictProbaSingle(features);
        const score = this.probabilityToScore(probability);
        const riskLevel = this.scoreToRiskLevel(score);
        const factors = this.calculateRiskFactors(features);
        return {
            entityId,
            score,
            probability,
            riskLevel,
            factors,
            timestamp: new Date(),
        };
    }
    /**
     * Batch scoring
     */
    scoreBatch(entityIds, features) {
        return entityIds.map((id, i) => this.score(id, features[i]));
    }
    /**
     * Predict probabilities
     */
    predictProba(features) {
        return features.map(f => this.predictProbaSingle(f));
    }
    /**
     * Predict probability for single sample
     */
    predictProbaSingle(features) {
        let logit = this.intercept;
        for (let i = 0; i < features.length; i++) {
            logit += this.coefficients[i] * features[i];
        }
        return this.sigmoid(logit);
    }
    /**
     * Convert probability to score (0-1000)
     */
    probabilityToScore(probability) {
        // Convert to 0-1000 scale with 500 as neutral
        return Math.round(500 + 500 * (1 - 2 * probability));
    }
    /**
     * Convert score to risk level
     */
    scoreToRiskLevel(score) {
        if (score >= 750)
            return 'low';
        if (score >= 500)
            return 'medium';
        if (score >= 250)
            return 'high';
        return 'critical';
    }
    /**
     * Calculate risk factors contribution
     */
    calculateRiskFactors(features) {
        return this.featureNames.map((name, i) => ({
            name,
            weight: this.coefficients[i],
            value: features[i],
            contribution: this.coefficients[i] * features[i],
        }));
    }
    /**
     * Sigmoid function
     */
    sigmoid(x) {
        return 1 / (1 + Math.exp(-x));
    }
}
exports.LogisticRiskScorer = LogisticRiskScorer;
