"use strict";
/**
 * RecoveryPlan - Actionable recommendations to prevent system fractures
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecoveryPlanModel = exports.ActionType = exports.Urgency = void 0;
var Urgency;
(function (Urgency) {
    Urgency["LOW"] = "LOW";
    Urgency["MEDIUM"] = "MEDIUM";
    Urgency["HIGH"] = "HIGH";
    Urgency["CRITICAL"] = "CRITICAL";
})(Urgency || (exports.Urgency = Urgency = {}));
var ActionType;
(function (ActionType) {
    ActionType["SCALE_RESOURCES"] = "SCALE_RESOURCES";
    ActionType["RATE_LIMIT"] = "RATE_LIMIT";
    ActionType["CIRCUIT_BREAK"] = "CIRCUIT_BREAK";
    ActionType["CACHE_WARM"] = "CACHE_WARM";
    ActionType["TRAFFIC_SHIFT"] = "TRAFFIC_SHIFT";
    ActionType["CONFIG_TUNE"] = "CONFIG_TUNE";
    ActionType["RESTART_SERVICE"] = "RESTART_SERVICE";
    ActionType["DEPLOY_ROLLBACK"] = "DEPLOY_ROLLBACK";
})(ActionType || (exports.ActionType = ActionType = {}));
class RecoveryPlanModel {
    id;
    fracturePointId;
    systemId;
    createdAt;
    urgency;
    timeWindowHours;
    recommendedActions;
    fallbackActions;
    estimatedRecoveryTimeMinutes;
    successProbability;
    wasExecuted;
    executionResult;
    constructor(data) {
        this.id = data.id;
        this.fracturePointId = data.fracturePointId;
        this.systemId = data.systemId;
        this.createdAt = data.createdAt;
        this.urgency = data.urgency;
        this.timeWindowHours = data.timeWindowHours;
        this.recommendedActions = data.recommendedActions;
        this.fallbackActions = data.fallbackActions;
        this.estimatedRecoveryTimeMinutes = data.estimatedRecoveryTimeMinutes;
        this.successProbability = data.successProbability;
        this.wasExecuted = data.wasExecuted;
        this.executionResult = data.executionResult;
    }
    /**
     * Get top priority action
     */
    getTopAction() {
        if (this.recommendedActions.length === 0)
            return null;
        // Already sorted by priority, return first
        return this.recommendedActions[0];
    }
    /**
     * Get automatable actions
     */
    getAutomatableActions() {
        return this.recommendedActions.filter((a) => a.automatable);
    }
    /**
     * Get manual actions (require human intervention)
     */
    getManualActions() {
        return this.recommendedActions.filter((a) => !a.automatable);
    }
    /**
     * Calculate total estimated impact
     */
    getTotalEstimatedImpact() {
        if (this.recommendedActions.length === 0)
            return 0;
        // Compound effect (not just sum)
        return this.recommendedActions.reduce((total, action) => {
            return total + action.estimatedImpact * (1 - total);
        }, 0);
    }
    /**
     * Calculate total cost
     */
    getTotalCost() {
        return this.recommendedActions.reduce((total, action) => {
            return total + (action.costUSD || 0);
        }, 0);
    }
    /**
     * Check if plan is expired
     */
    isExpired() {
        const now = new Date();
        const expiryTime = new Date(this.createdAt.getTime() + this.timeWindowHours * 60 * 60 * 1000);
        return now > expiryTime;
    }
    /**
     * Get action execution order (respecting dependencies)
     */
    getExecutionOrder() {
        const sorted = [];
        const remaining = [...this.recommendedActions];
        const executed = new Set();
        while (remaining.length > 0) {
            // Find actions with no unmet dependencies
            const ready = remaining.filter((action) => {
                if (!action.dependencies)
                    return true;
                return action.dependencies.every((dep) => executed.has(dep));
            });
            if (ready.length === 0) {
                // Circular dependency or invalid - just add remaining
                sorted.push(...remaining);
                break;
            }
            // Add ready actions
            sorted.push(...ready);
            ready.forEach((action) => executed.add(action.id));
            // Remove from remaining
            remaining.splice(0, remaining.length, ...remaining.filter((a) => !ready.includes(a)));
        }
        return sorted;
    }
    /**
     * Convert to JSON
     */
    toJSON() {
        return {
            id: this.id,
            fracturePointId: this.fracturePointId,
            systemId: this.systemId,
            createdAt: this.createdAt.toISOString(),
            urgency: this.urgency,
            timeWindowHours: this.timeWindowHours,
            recommendedActions: this.recommendedActions,
            fallbackActions: this.fallbackActions,
            estimatedRecoveryTimeMinutes: this.estimatedRecoveryTimeMinutes,
            successProbability: this.successProbability,
            wasExecuted: this.wasExecuted,
            executionResult: this.executionResult
                ? {
                    ...this.executionResult,
                    executedAt: this.executionResult.executedAt.toISOString(),
                }
                : undefined,
            totalEstimatedImpact: this.getTotalEstimatedImpact(),
            totalCost: this.getTotalCost(),
            isExpired: this.isExpired(),
            automatableActionsCount: this.getAutomatableActions().length,
        };
    }
    /**
     * Create from database row
     */
    static fromDatabase(row) {
        return new RecoveryPlanModel({
            id: row.id,
            fracturePointId: row.fracture_point_id,
            systemId: row.system_id,
            createdAt: new Date(row.created_at),
            urgency: row.urgency,
            timeWindowHours: row.time_window_hours,
            recommendedActions: row.recommended_actions || [],
            fallbackActions: row.fallback_actions,
            estimatedRecoveryTimeMinutes: row.estimated_recovery_time,
            successProbability: row.success_probability,
            wasExecuted: row.was_executed,
            executionResult: row.execution_result
                ? {
                    ...row.execution_result,
                    executedAt: new Date(row.execution_result.executedAt),
                }
                : undefined,
        });
    }
}
exports.RecoveryPlanModel = RecoveryPlanModel;
