"use strict";
/**
 * Future Motif Model
 * Represents a predicted pattern structure that will emerge
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FutureMotifModel = void 0;
class FutureMotifModel {
    id;
    predictedStructure;
    probability;
    timeToExpression;
    predictedAt;
    conditions;
    relatedProtoPatternIds;
    dominanceScore;
    metadata;
    constructor(data) {
        this.id = data.id || this.generateId();
        this.predictedStructure = data.predictedStructure || {};
        this.probability = data.probability || 0;
        this.timeToExpression = data.timeToExpression || 0;
        this.predictedAt = data.predictedAt || new Date();
        this.conditions = data.conditions || [];
        this.relatedProtoPatternIds = data.relatedProtoPatternIds || [];
        this.dominanceScore = data.dominanceScore;
        this.metadata = data.metadata;
    }
    generateId() {
        return `motif_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
    /**
     * Calculate probability based on conditions
     */
    calculateProbability() {
        if (this.conditions.length === 0) {
            return this.probability;
        }
        // Bayesian probability update based on conditions
        const requiredConditions = this.conditions.filter((c) => c.required);
        const optionalConditions = this.conditions.filter((c) => !c.required);
        // All required conditions must be met
        const requiredProbability = requiredConditions.every((c) => c.currentStatus === 'met' || c.currentStatus === 'likely')
            ? 1
            : 0;
        if (requiredProbability === 0) {
            return 0;
        }
        // Optional conditions increase probability
        const optionalProbability = optionalConditions.length > 0
            ? optionalConditions.reduce((sum, c) => sum + (c.probability || 0.5), 0) / optionalConditions.length
            : 1;
        return requiredProbability * optionalProbability;
    }
    /**
     * Update time to expression based on current conditions
     */
    updateTimeToExpression() {
        // Accelerate if conditions are being met faster than expected
        const metConditions = this.conditions.filter((c) => c.currentStatus === 'met');
        const progressRate = metConditions.length / this.conditions.length;
        if (progressRate > 0.7) {
            // Accelerate by 30%
            this.timeToExpression = Math.floor(this.timeToExpression * 0.7);
        }
        else if (progressRate < 0.3) {
            // Decelerate by 30%
            this.timeToExpression = Math.floor(this.timeToExpression * 1.3);
        }
    }
    /**
     * Add a condition
     */
    addCondition(condition) {
        this.conditions.push(condition);
        this.probability = this.calculateProbability();
    }
    /**
     * Update condition status
     */
    updateCondition(conditionId, status, probability) {
        const condition = this.conditions.find((c) => c.id === conditionId);
        if (condition) {
            condition.currentStatus = status;
            if (probability !== undefined) {
                condition.probability = probability;
            }
            this.probability = this.calculateProbability();
            this.updateTimeToExpression();
        }
    }
    /**
     * Check if motif is likely to emerge
     */
    isLikely(threshold = 0.7) {
        return this.probability >= threshold;
    }
    /**
     * Get urgency score (probability / time)
     */
    getUrgency() {
        if (this.timeToExpression === 0) {
            return this.probability * 10; // Very urgent if immediate
        }
        return this.probability / Math.log(this.timeToExpression + 1);
    }
    /**
     * Export to JSON
     */
    toJSON() {
        return {
            id: this.id,
            predictedStructure: this.predictedStructure,
            probability: this.probability,
            timeToExpression: this.timeToExpression,
            predictedAt: this.predictedAt,
            conditions: this.conditions,
            relatedProtoPatternIds: this.relatedProtoPatternIds,
            dominanceScore: this.dominanceScore,
            metadata: this.metadata,
        };
    }
}
exports.FutureMotifModel = FutureMotifModel;
