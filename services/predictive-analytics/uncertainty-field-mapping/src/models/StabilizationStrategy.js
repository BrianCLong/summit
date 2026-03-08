"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StabilizationStrategy = void 0;
const uuid_1 = require("uuid");
class StabilizationStrategy {
    id;
    zoneId;
    type;
    priority;
    expectedReduction;
    effort;
    actions;
    estimatedCost;
    estimatedTimeWeeks;
    constructor(data) {
        this.id = data.id || (0, uuid_1.v4)();
        this.zoneId = data.zoneId;
        this.type = data.type;
        this.priority = data.priority;
        this.expectedReduction = data.expectedReduction;
        this.effort = data.effort;
        this.actions = data.actions;
        this.estimatedCost = data.estimatedCost;
        this.estimatedTimeWeeks = data.estimatedTimeWeeks;
    }
    /**
     * Calculate strategy score for prioritization
     */
    calculateScore() {
        const effortMultiplier = {
            low: 1.0,
            medium: 0.7,
            high: 0.4,
        };
        const timeMultiplier = this.estimatedTimeWeeks
            ? 1 / Math.log(this.estimatedTimeWeeks + 1)
            : 1;
        return (this.priority *
            this.expectedReduction *
            effortMultiplier[this.effort] *
            timeMultiplier);
    }
    /**
     * Get total estimated impact
     */
    getTotalImpact() {
        return this.actions.reduce((sum, action) => sum + action.estimatedImpact, 0);
    }
    /**
     * Get primary action (highest impact)
     */
    getPrimaryAction() {
        return this.actions.reduce((max, action) => action.estimatedImpact > (max?.estimatedImpact || 0) ? action : max, undefined);
    }
    /**
     * Check if strategy is high priority
     */
    isHighPriority() {
        return this.priority > 0.7;
    }
    /**
     * Check if strategy is quick win (high impact, low effort)
     */
    isQuickWin() {
        return this.expectedReduction > 0.5 && this.effort === 'low';
    }
    /**
     * Get effort as numeric value
     */
    getEffortValue() {
        const effortMap = {
            low: 1,
            medium: 2,
            high: 3,
        };
        return effortMap[this.effort];
    }
    /**
     * Compare with another strategy for prioritization
     */
    compareTo(other) {
        return other.calculateScore() - this.calculateScore();
    }
    /**
     * Create execution plan
     */
    createExecutionPlan() {
        // Sort actions by impact (descending)
        const sortedActions = [...this.actions].sort((a, b) => b.estimatedImpact - a.estimatedImpact);
        // Create phases
        return sortedActions.map((action, index) => ({
            phase: index + 1,
            action,
            dependencies: index > 0 ? [sortedActions[index - 1].target] : [],
        }));
    }
    /**
     * Estimate ROI (return on investment)
     */
    estimateROI() {
        if (!this.estimatedCost)
            return undefined;
        // ROI = (Expected Reduction * Value) / Cost
        // Assume 1 unit reduction = $10k value (configurable)
        const unitValue = 10000;
        const totalValue = this.expectedReduction * unitValue;
        return (totalValue - this.estimatedCost) / this.estimatedCost;
    }
    /**
     * Get strategy description
     */
    getDescription() {
        const typeDescriptions = {
            data_collection: 'Collect additional data to reduce uncertainty',
            model_refinement: 'Refine predictive models to improve accuracy',
            constraint_addition: 'Add constraints to narrow prediction space',
            scenario_pruning: 'Remove unlikely scenarios to focus predictions',
        };
        return typeDescriptions[this.type];
    }
    /**
     * Serialize to JSON
     */
    toJSON() {
        return {
            id: this.id,
            zoneId: this.zoneId,
            type: this.type,
            priority: this.priority,
            expectedReduction: this.expectedReduction,
            effort: this.effort,
            actions: this.actions,
            estimatedCost: this.estimatedCost,
            estimatedTimeWeeks: this.estimatedTimeWeeks,
        };
    }
    /**
     * Create from JSON
     */
    static fromJSON(json) {
        return new StabilizationStrategy(json);
    }
}
exports.StabilizationStrategy = StabilizationStrategy;
