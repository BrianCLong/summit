"use strict";
/**
 * Preventive Intervention Model
 * Represents planned actions to prevent or mitigate predicted anomalies
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreventiveInterventionModel = exports.UrgencyLevel = exports.ActionStatus = exports.InterventionStatus = void 0;
var InterventionStatus;
(function (InterventionStatus) {
    InterventionStatus["PENDING"] = "PENDING";
    InterventionStatus["IN_PROGRESS"] = "IN_PROGRESS";
    InterventionStatus["COMPLETED"] = "COMPLETED";
    InterventionStatus["FAILED"] = "FAILED";
    InterventionStatus["CANCELLED"] = "CANCELLED";
    InterventionStatus["PARTIALLY_COMPLETED"] = "PARTIALLY_COMPLETED";
})(InterventionStatus || (exports.InterventionStatus = InterventionStatus = {}));
var ActionStatus;
(function (ActionStatus) {
    ActionStatus["PENDING"] = "PENDING";
    ActionStatus["IN_PROGRESS"] = "IN_PROGRESS";
    ActionStatus["COMPLETED"] = "COMPLETED";
    ActionStatus["FAILED"] = "FAILED";
    ActionStatus["SKIPPED"] = "SKIPPED";
    ActionStatus["CANCELLED"] = "CANCELLED";
})(ActionStatus || (exports.ActionStatus = ActionStatus = {}));
var UrgencyLevel;
(function (UrgencyLevel) {
    UrgencyLevel["LOW"] = "LOW";
    UrgencyLevel["MEDIUM"] = "MEDIUM";
    UrgencyLevel["HIGH"] = "HIGH";
    UrgencyLevel["CRITICAL"] = "CRITICAL";
})(UrgencyLevel || (exports.UrgencyLevel = UrgencyLevel = {}));
class PreventiveInterventionModel {
    /**
     * Calculate remaining time in action window
     */
    static calculateRemainingTime(actionWindow) {
        const now = Date.now();
        const endMs = actionWindow.end.getTime();
        return Math.max(0, endMs - now);
    }
    /**
     * Determine urgency level based on remaining time
     */
    static determineUrgency(actionWindow) {
        const remainingMs = this.calculateRemainingTime(actionWindow);
        const fiveMinutes = 5 * 60 * 1000;
        const fifteenMinutes = 15 * 60 * 1000;
        const oneHour = 60 * 60 * 1000;
        if (remainingMs < fiveMinutes)
            return UrgencyLevel.CRITICAL;
        if (remainingMs < fifteenMinutes)
            return UrgencyLevel.HIGH;
        if (remainingMs < oneHour)
            return UrgencyLevel.MEDIUM;
        return UrgencyLevel.LOW;
    }
    /**
     * Check if intervention is still actionable
     */
    static isActionable(intervention) {
        return (intervention.status !== InterventionStatus.COMPLETED &&
            intervention.status !== InterventionStatus.CANCELLED &&
            intervention.status !== InterventionStatus.FAILED &&
            this.calculateRemainingTime(intervention.actionWindow) > 0);
    }
    /**
     * Calculate success rate from execution results
     */
    static calculateSuccessRate(results) {
        if (results.length === 0)
            return 0;
        const successful = results.filter((r) => r.success).length;
        return successful / results.length;
    }
    /**
     * Get next action to execute
     */
    static getNextAction(intervention) {
        // Find highest priority pending action with satisfied prerequisites
        const pendingActions = intervention.recommendedActions
            .filter((action) => action.status === ActionStatus.PENDING)
            .sort((a, b) => a.priority - b.priority); // Lower priority number = higher priority
        for (const action of pendingActions) {
            const prerequisitesMet = this.checkPrerequisites(action, intervention.executionResults);
            if (prerequisitesMet) {
                return action;
            }
        }
        return null;
    }
    /**
     * Check if action prerequisites are satisfied
     */
    static checkPrerequisites(action, results) {
        if (action.prerequisites.length === 0)
            return true;
        const completedActions = new Set(results.filter((r) => r.success).map((r) => r.actionType));
        return action.prerequisites.every((prereq) => completedActions.has(prereq));
    }
    /**
     * Estimate total intervention duration
     */
    static estimateTotalDuration(intervention) {
        // Simple sum (assumes sequential execution)
        return intervention.recommendedActions.reduce((sum, action) => sum + action.estimatedDurationMs, 0);
    }
    /**
     * Check if intervention can complete within action window
     */
    static canCompleteInTime(intervention) {
        const totalDuration = this.estimateTotalDuration(intervention);
        const remainingTime = this.calculateRemainingTime(intervention.actionWindow);
        return totalDuration <= remainingTime;
    }
    /**
     * Generate intervention plan based on anomaly prediction
     */
    static generatePlan(prediction, actions) {
        // Calculate action window (start now, end at earliest onset)
        const now = new Date();
        const actionWindow = {
            start: now,
            end: prediction.onsetWindow.earliest,
            durationMs: prediction.onsetWindow.earliest.getTime() - now.getTime(),
            remainingTimeMs: prediction.onsetWindow.earliest.getTime() - now.getTime(),
            urgencyLevel: UrgencyLevel.LOW,
        };
        actionWindow.urgencyLevel = this.determineUrgency(actionWindow);
        // Sort actions by priority
        const sortedActions = [...actions].sort((a, b) => a.priority - b.priority);
        // Estimate prevention probability based on action window and confidence
        const timeBuffer = actionWindow.durationMs / (60 * 60 * 1000); // hours
        const timeBufferFactor = Math.min(timeBuffer / 2, 1.0); // Max 1.0 at 2+ hours
        const estimatedPreventionProbability = prediction.confidence * timeBufferFactor * 0.8; // Conservative estimate
        return {
            anomalyPredictionId: prediction.id,
            actionWindow,
            recommendedActions: sortedActions,
            estimatedPreventionProbability,
        };
    }
    /**
     * Update intervention status based on action results
     */
    static updateStatus(intervention) {
        const { recommendedActions, executionResults } = intervention;
        if (executionResults.length === 0) {
            return InterventionStatus.PENDING;
        }
        const hasInProgress = recommendedActions.some((a) => a.status === ActionStatus.IN_PROGRESS);
        if (hasInProgress) {
            return InterventionStatus.IN_PROGRESS;
        }
        const allCompleted = recommendedActions.every((a) => a.status === ActionStatus.COMPLETED ||
            a.status === ActionStatus.SKIPPED);
        const allFailed = recommendedActions.every((a) => a.status === ActionStatus.FAILED);
        const someCompleted = recommendedActions.some((a) => a.status === ActionStatus.COMPLETED);
        const someFailed = recommendedActions.some((a) => a.status === ActionStatus.FAILED);
        if (allCompleted)
            return InterventionStatus.COMPLETED;
        if (allFailed)
            return InterventionStatus.FAILED;
        if (someCompleted && someFailed) {
            return InterventionStatus.PARTIALLY_COMPLETED;
        }
        return InterventionStatus.IN_PROGRESS;
    }
    /**
     * Validate intervention data
     */
    static validate(data) {
        const errors = [];
        if (!data.anomalyPredictionId) {
            errors.push('anomalyPredictionId is required');
        }
        if (!data.actionWindow) {
            errors.push('actionWindow is required');
        }
        else {
            if (data.actionWindow.start >= data.actionWindow.end) {
                errors.push('actionWindow.start must be before actionWindow.end');
            }
        }
        if (!data.recommendedActions || data.recommendedActions.length === 0) {
            errors.push('at least one recommended action is required');
        }
        if (data.estimatedPreventionProbability < 0 ||
            data.estimatedPreventionProbability > 1) {
            errors.push('estimatedPreventionProbability must be between 0 and 1');
        }
        return errors;
    }
}
exports.PreventiveInterventionModel = PreventiveInterventionModel;
