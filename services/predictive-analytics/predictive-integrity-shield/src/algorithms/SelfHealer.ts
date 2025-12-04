/**
 * Self-Healer Algorithm
 * Autonomous remediation for model integrity issues
 */

import {
  HealingAction,
  HealingActionType,
  ActionStatus,
  IntegrityStatus,
  DriftSeverity,
  BiasSeverity,
} from '../models/IntegrityReport.js';

export interface SelfHealerConfig {
  enabled: boolean;
  autoRecalibrate: boolean;
  autoFallback: boolean;
  autoRetrain: boolean;
  escalationThreshold: number;
}

export interface HealingContext {
  modelId: string;
  reliabilityScore: number;
  status: IntegrityStatus;
  driftSeverity?: DriftSeverity;
  biasSeverity?: BiasSeverity;
  isAdversarial?: boolean;
}

export class SelfHealer {
  private config: SelfHealerConfig;
  private healingHistory: Map<string, HealingAction[]> = new Map();
  private cooldownPeriod: number = 300000; // 5 minutes

  constructor(config: SelfHealerConfig) {
    this.config = config;
  }

  /**
   * Determine and execute healing actions
   */
  async heal(context: HealingContext): Promise<HealingAction[]> {
    if (!this.config.enabled) {
      return [];
    }

    const actions: HealingAction[] = [];

    // Check cooldown
    if (this.isInCooldown(context.modelId)) {
      return actions;
    }

    // Determine required actions based on context
    const requiredActions = this.determineActions(context);

    // Execute actions
    for (const actionType of requiredActions) {
      const action = await this.executeAction(context, actionType);
      actions.push(action);
    }

    // Store in history
    const history = this.healingHistory.get(context.modelId) || [];
    history.push(...actions);
    this.healingHistory.set(context.modelId, history);

    return actions;
  }

  /**
   * Determine which healing actions are needed
   */
  private determineActions(context: HealingContext): HealingActionType[] {
    const actions: HealingActionType[] = [];

    // Critical status - block predictions
    if (context.status === IntegrityStatus.CRITICAL || context.status === IntegrityStatus.FAILED) {
      actions.push(HealingActionType.ALERT_TEAM);

      if (context.reliabilityScore < 0.3) {
        actions.push(HealingActionType.BLOCK_PREDICTIONS);
      }
    }

    // Adversarial attack detected
    if (context.isAdversarial) {
      actions.push(HealingActionType.ALERT_TEAM);

      if (this.config.autoFallback) {
        actions.push(HealingActionType.FALLBACK_TO_ENSEMBLE);
      }
    }

    // Severe drift
    if (context.driftSeverity === DriftSeverity.CRITICAL || context.driftSeverity === DriftSeverity.HIGH) {
      if (this.config.autoRecalibrate) {
        actions.push(HealingActionType.RECALIBRATE);
      }

      if (this.config.autoFallback) {
        actions.push(HealingActionType.FALLBACK_TO_ENSEMBLE);
      }

      if (this.config.autoRetrain && context.driftSeverity === DriftSeverity.CRITICAL) {
        actions.push(HealingActionType.TRIGGER_RETRAINING);
      }

      actions.push(HealingActionType.RESET_BASELINE);
    }

    // Severe bias
    if (context.biasSeverity === BiasSeverity.SEVERE || context.biasSeverity === BiasSeverity.HIGH) {
      if (this.config.autoRecalibrate) {
        actions.push(HealingActionType.ADJUST_THRESHOLDS);
      }

      actions.push(HealingActionType.ALERT_TEAM);

      if (context.biasSeverity === BiasSeverity.SEVERE) {
        actions.push(HealingActionType.TRIGGER_RETRAINING);
      }
    }

    // Moderate issues - monitor and recalibrate
    if (context.status === IntegrityStatus.DEGRADED || context.status === IntegrityStatus.WARNING) {
      if (
        this.config.autoRecalibrate &&
        (context.driftSeverity === DriftSeverity.MODERATE || context.biasSeverity === BiasSeverity.MODERATE)
      ) {
        actions.push(HealingActionType.RECALIBRATE);
      }
    }

    // Remove duplicates
    return [...new Set(actions)];
  }

  /**
   * Execute a healing action
   */
  private async executeAction(
    context: HealingContext,
    actionType: HealingActionType
  ): Promise<HealingAction> {
    const action: HealingAction = {
      id: this.generateActionId(),
      timestamp: new Date(),
      actionType,
      status: ActionStatus.IN_PROGRESS,
      trigger: this.getTriggerDescription(context),
      severity: context.status,
      details: this.getActionDetails(actionType, context),
      startTime: new Date(),
    };

    try {
      // Execute the specific action
      switch (actionType) {
        case HealingActionType.RECALIBRATE:
          await this.recalibrateModel(context, action);
          break;

        case HealingActionType.FALLBACK_TO_ENSEMBLE:
          await this.fallbackToEnsemble(context, action);
          break;

        case HealingActionType.TRIGGER_RETRAINING:
          await this.triggerRetraining(context, action);
          break;

        case HealingActionType.ADJUST_THRESHOLDS:
          await this.adjustThresholds(context, action);
          break;

        case HealingActionType.BLOCK_PREDICTIONS:
          await this.blockPredictions(context, action);
          break;

        case HealingActionType.ALERT_TEAM:
          await this.alertTeam(context, action);
          break;

        case HealingActionType.RESET_BASELINE:
          await this.resetBaseline(context, action);
          break;

        default:
          throw new Error(`Unknown action type: ${actionType}`);
      }

      action.status = ActionStatus.COMPLETED;
      action.success = true;
      action.endTime = new Date();
      action.duration = action.endTime.getTime() - action.startTime.getTime();
    } catch (error) {
      action.status = ActionStatus.FAILED;
      action.success = false;
      action.error = error instanceof Error ? error.message : String(error);
      action.endTime = new Date();
      action.duration = action.endTime.getTime() - action.startTime!.getTime();
    }

    return action;
  }

  /**
   * Recalibrate model
   */
  private async recalibrateModel(
    context: HealingContext,
    action: HealingAction
  ): Promise<void> {
    // Simulate model recalibration (Platt scaling, isotonic regression, etc.)
    action.beforeScore = context.reliabilityScore;

    // In production, this would call the model registry to recalibrate
    await this.simulateDelay(1000);

    action.afterScore = Math.min(context.reliabilityScore + 0.1, 1.0);
    action.impact = 'Model recalibrated using Platt scaling';
    action.improvements = [
      'Improved probability calibration',
      'Reduced prediction bias',
      'Better confidence estimates',
    ];
  }

  /**
   * Fallback to ensemble
   */
  private async fallbackToEnsemble(
    context: HealingContext,
    action: HealingAction
  ): Promise<void> {
    action.beforeScore = context.reliabilityScore;

    // In production, this would switch to an ensemble of model versions
    await this.simulateDelay(500);

    action.afterScore = Math.min(context.reliabilityScore + 0.15, 1.0);
    action.impact = 'Switched to ensemble of last 3 stable model versions';
    action.improvements = [
      'Increased robustness to drift',
      'Reduced variance in predictions',
      'Better handling of edge cases',
    ];
  }

  /**
   * Trigger model retraining
   */
  private async triggerRetraining(
    context: HealingContext,
    action: HealingAction
  ): Promise<void> {
    // In production, this would trigger the MLOps pipeline
    await this.simulateDelay(200);

    action.impact = 'Retraining job submitted to MLOps pipeline';
    action.improvements = [
      'Scheduled model retraining with recent data',
      'Updated feature distributions',
      'Refreshed model assumptions',
    ];
  }

  /**
   * Adjust decision thresholds
   */
  private async adjustThresholds(
    context: HealingContext,
    action: HealingAction
  ): Promise<void> {
    action.beforeScore = context.reliabilityScore;

    // In production, this would optimize thresholds per group
    await this.simulateDelay(300);

    action.afterScore = Math.min(context.reliabilityScore + 0.08, 1.0);
    action.impact = 'Adjusted decision thresholds to reduce bias';
    action.improvements = [
      'Improved fairness across protected groups',
      'Maintained overall accuracy',
      'Reduced disparate impact',
    ];
  }

  /**
   * Block predictions
   */
  private async blockPredictions(
    context: HealingContext,
    action: HealingAction
  ): Promise<void> {
    // In production, this would update a feature flag or circuit breaker
    await this.simulateDelay(100);

    action.impact = 'Predictions blocked for model due to critical reliability issues';
    action.improvements = [
      'Prevented unreliable predictions',
      'Protected downstream systems',
      'Maintained system integrity',
    ];
  }

  /**
   * Alert team
   */
  private async alertTeam(
    context: HealingContext,
    action: HealingAction
  ): Promise<void> {
    // In production, this would send alerts via PagerDuty, Slack, etc.
    await this.simulateDelay(100);

    action.impact = 'Alert sent to ML operations team';
    action.improvements = [
      'Team notified of integrity issues',
      'Incident ticket created',
      'Escalation initiated',
    ];
  }

  /**
   * Reset baseline
   */
  private async resetBaseline(
    context: HealingContext,
    action: HealingAction
  ): Promise<void> {
    // In production, this would update baseline statistics
    await this.simulateDelay(500);

    action.impact = 'Baseline data refreshed with recent distribution';
    action.improvements = [
      'Updated feature distributions',
      'Recalibrated drift thresholds',
      'Improved drift detection accuracy',
    ];
  }

  /**
   * Check if model is in cooldown period
   */
  private isInCooldown(modelId: string): boolean {
    const history = this.healingHistory.get(modelId);
    if (!history || history.length === 0) return false;

    const lastAction = history[history.length - 1];
    const timeSinceLastAction = Date.now() - lastAction.timestamp.getTime();

    return timeSinceLastAction < this.cooldownPeriod;
  }

  /**
   * Get trigger description
   */
  private getTriggerDescription(context: HealingContext): string {
    const triggers: string[] = [];

    if (context.status === IntegrityStatus.CRITICAL) {
      triggers.push('Critical integrity status');
    }

    if (context.driftSeverity === DriftSeverity.CRITICAL || context.driftSeverity === DriftSeverity.HIGH) {
      triggers.push(`${context.driftSeverity} data drift`);
    }

    if (context.biasSeverity === BiasSeverity.SEVERE || context.biasSeverity === BiasSeverity.HIGH) {
      triggers.push(`${context.biasSeverity} bias detected`);
    }

    if (context.isAdversarial) {
      triggers.push('Adversarial attack detected');
    }

    if (context.reliabilityScore < 0.5) {
      triggers.push(`Low reliability score: ${context.reliabilityScore.toFixed(2)}`);
    }

    return triggers.join('; ');
  }

  /**
   * Get action details
   */
  private getActionDetails(
    actionType: HealingActionType,
    context: HealingContext
  ): Record<string, any> {
    return {
      modelId: context.modelId,
      reliabilityScore: context.reliabilityScore,
      status: context.status,
      driftSeverity: context.driftSeverity,
      biasSeverity: context.biasSeverity,
      isAdversarial: context.isAdversarial,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate action ID
   */
  private generateActionId(): string {
    return `heal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Simulate async delay
   */
  private async simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get healing statistics
   */
  getStatistics(modelId: string): {
    totalActions: number;
    successRate: number;
    recentActions: HealingAction[];
  } {
    const history = this.healingHistory.get(modelId) || [];
    const successful = history.filter((a) => a.success).length;

    return {
      totalActions: history.length,
      successRate: history.length > 0 ? successful / history.length : 0,
      recentActions: history.slice(-10),
    };
  }
}
