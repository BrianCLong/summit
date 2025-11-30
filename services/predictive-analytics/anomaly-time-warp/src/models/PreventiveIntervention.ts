/**
 * Preventive Intervention Model
 * Represents planned actions to prevent or mitigate predicted anomalies
 */

import { AnomalyPrediction } from './AnomalyPrediction.js';

export enum InterventionStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  PARTIALLY_COMPLETED = 'PARTIALLY_COMPLETED',
}

export enum ActionStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
  CANCELLED = 'CANCELLED',
}

export enum UrgencyLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface ActionWindow {
  start: Date;
  end: Date;
  durationMs: number;
  remainingTimeMs: number;
  urgencyLevel: UrgencyLevel;
}

export interface InterventionAction {
  actionType: string;
  priority: number;
  estimatedDurationMs: number;
  prerequisites: string[];
  successCriteria: string[];
  status: ActionStatus;
  automatable: boolean;
}

export interface ActionResult {
  actionType: string;
  status: ActionStatus;
  durationMs: number;
  message: string;
  success: boolean;
  startedAt?: Date;
  completedAt?: Date;
}

export interface PreventiveIntervention {
  id: string;
  anomalyPredictionId: string;
  actionWindow: ActionWindow;
  recommendedActions: InterventionAction[];
  estimatedPreventionProbability: number;
  status: InterventionStatus;
  executionResults: ActionResult[];
  createdAt: Date;
  executedAt?: Date;
  completedAt?: Date;
}

export interface PreventiveInterventionCreate {
  anomalyPredictionId: string;
  actionWindow: ActionWindow;
  recommendedActions: InterventionAction[];
  estimatedPreventionProbability: number;
}

export interface InterventionOutcome {
  success: boolean;
  anomalyPrevented: boolean;
  actualSeverity?: string;
  actualOnsetTime?: Date;
  notes?: string;
  executedActions: string[];
}

export class PreventiveInterventionModel {
  /**
   * Calculate remaining time in action window
   */
  static calculateRemainingTime(actionWindow: ActionWindow): number {
    const now = Date.now();
    const endMs = actionWindow.end.getTime();
    return Math.max(0, endMs - now);
  }

  /**
   * Determine urgency level based on remaining time
   */
  static determineUrgency(actionWindow: ActionWindow): UrgencyLevel {
    const remainingMs = this.calculateRemainingTime(actionWindow);
    const fiveMinutes = 5 * 60 * 1000;
    const fifteenMinutes = 15 * 60 * 1000;
    const oneHour = 60 * 60 * 1000;

    if (remainingMs < fiveMinutes) return UrgencyLevel.CRITICAL;
    if (remainingMs < fifteenMinutes) return UrgencyLevel.HIGH;
    if (remainingMs < oneHour) return UrgencyLevel.MEDIUM;
    return UrgencyLevel.LOW;
  }

  /**
   * Check if intervention is still actionable
   */
  static isActionable(intervention: PreventiveIntervention): boolean {
    return (
      intervention.status !== InterventionStatus.COMPLETED &&
      intervention.status !== InterventionStatus.CANCELLED &&
      intervention.status !== InterventionStatus.FAILED &&
      this.calculateRemainingTime(intervention.actionWindow) > 0
    );
  }

  /**
   * Calculate success rate from execution results
   */
  static calculateSuccessRate(results: ActionResult[]): number {
    if (results.length === 0) return 0;

    const successful = results.filter((r) => r.success).length;
    return successful / results.length;
  }

  /**
   * Get next action to execute
   */
  static getNextAction(
    intervention: PreventiveIntervention,
  ): InterventionAction | null {
    // Find highest priority pending action with satisfied prerequisites
    const pendingActions = intervention.recommendedActions
      .filter((action) => action.status === ActionStatus.PENDING)
      .sort((a, b) => a.priority - b.priority); // Lower priority number = higher priority

    for (const action of pendingActions) {
      const prerequisitesMet = this.checkPrerequisites(
        action,
        intervention.executionResults,
      );
      if (prerequisitesMet) {
        return action;
      }
    }

    return null;
  }

  /**
   * Check if action prerequisites are satisfied
   */
  static checkPrerequisites(
    action: InterventionAction,
    results: ActionResult[],
  ): boolean {
    if (action.prerequisites.length === 0) return true;

    const completedActions = new Set(
      results.filter((r) => r.success).map((r) => r.actionType),
    );

    return action.prerequisites.every((prereq) =>
      completedActions.has(prereq),
    );
  }

  /**
   * Estimate total intervention duration
   */
  static estimateTotalDuration(
    intervention: PreventiveIntervention,
  ): number {
    // Simple sum (assumes sequential execution)
    return intervention.recommendedActions.reduce(
      (sum, action) => sum + action.estimatedDurationMs,
      0,
    );
  }

  /**
   * Check if intervention can complete within action window
   */
  static canCompleteInTime(intervention: PreventiveIntervention): boolean {
    const totalDuration = this.estimateTotalDuration(intervention);
    const remainingTime = this.calculateRemainingTime(
      intervention.actionWindow,
    );
    return totalDuration <= remainingTime;
  }

  /**
   * Generate intervention plan based on anomaly prediction
   */
  static generatePlan(
    prediction: AnomalyPrediction,
    actions: InterventionAction[],
  ): PreventiveInterventionCreate {
    // Calculate action window (start now, end at earliest onset)
    const now = new Date();
    const actionWindow: ActionWindow = {
      start: now,
      end: prediction.onsetWindow.earliest,
      durationMs:
        prediction.onsetWindow.earliest.getTime() - now.getTime(),
      remainingTimeMs:
        prediction.onsetWindow.earliest.getTime() - now.getTime(),
      urgencyLevel: UrgencyLevel.LOW,
    };

    actionWindow.urgencyLevel = this.determineUrgency(actionWindow);

    // Sort actions by priority
    const sortedActions = [...actions].sort((a, b) => a.priority - b.priority);

    // Estimate prevention probability based on action window and confidence
    const timeBuffer = actionWindow.durationMs / (60 * 60 * 1000); // hours
    const timeBufferFactor = Math.min(timeBuffer / 2, 1.0); // Max 1.0 at 2+ hours
    const estimatedPreventionProbability =
      prediction.confidence * timeBufferFactor * 0.8; // Conservative estimate

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
  static updateStatus(intervention: PreventiveIntervention): InterventionStatus {
    const { recommendedActions, executionResults } = intervention;

    if (executionResults.length === 0) {
      return InterventionStatus.PENDING;
    }

    const hasInProgress = recommendedActions.some(
      (a) => a.status === ActionStatus.IN_PROGRESS,
    );
    if (hasInProgress) {
      return InterventionStatus.IN_PROGRESS;
    }

    const allCompleted = recommendedActions.every(
      (a) =>
        a.status === ActionStatus.COMPLETED ||
        a.status === ActionStatus.SKIPPED,
    );
    const allFailed = recommendedActions.every(
      (a) => a.status === ActionStatus.FAILED,
    );
    const someCompleted = recommendedActions.some(
      (a) => a.status === ActionStatus.COMPLETED,
    );
    const someFailed = recommendedActions.some(
      (a) => a.status === ActionStatus.FAILED,
    );

    if (allCompleted) return InterventionStatus.COMPLETED;
    if (allFailed) return InterventionStatus.FAILED;
    if (someCompleted && someFailed) {
      return InterventionStatus.PARTIALLY_COMPLETED;
    }

    return InterventionStatus.IN_PROGRESS;
  }

  /**
   * Validate intervention data
   */
  static validate(data: PreventiveInterventionCreate): string[] {
    const errors: string[] = [];

    if (!data.anomalyPredictionId) {
      errors.push('anomalyPredictionId is required');
    }
    if (!data.actionWindow) {
      errors.push('actionWindow is required');
    } else {
      if (data.actionWindow.start >= data.actionWindow.end) {
        errors.push('actionWindow.start must be before actionWindow.end');
      }
    }
    if (!data.recommendedActions || data.recommendedActions.length === 0) {
      errors.push('at least one recommended action is required');
    }
    if (
      data.estimatedPreventionProbability < 0 ||
      data.estimatedPreventionProbability > 1
    ) {
      errors.push('estimatedPreventionProbability must be between 0 and 1');
    }

    return errors;
  }
}
