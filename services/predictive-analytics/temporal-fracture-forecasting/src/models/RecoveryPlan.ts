/**
 * RecoveryPlan - Actionable recommendations to prevent system fractures
 */

export enum Urgency {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ActionType {
  SCALE_RESOURCES = 'SCALE_RESOURCES',
  RATE_LIMIT = 'RATE_LIMIT',
  CIRCUIT_BREAK = 'CIRCUIT_BREAK',
  CACHE_WARM = 'CACHE_WARM',
  TRAFFIC_SHIFT = 'TRAFFIC_SHIFT',
  CONFIG_TUNE = 'CONFIG_TUNE',
  RESTART_SERVICE = 'RESTART_SERVICE',
  DEPLOY_ROLLBACK = 'DEPLOY_ROLLBACK',
}

export interface Action {
  id: string;
  type: ActionType;
  description: string;
  parameters: Record<string, unknown>;
  estimatedImpact: number; // 0-1, expected stability improvement
  timeToEffectMinutes: number;
  riskLevel: 'low' | 'medium' | 'high';
  costUSD?: number;
  automatable: boolean;
  dependencies?: string[]; // IDs of actions that must complete first
}

export interface RecoveryPlan {
  id: string;
  fracturePointId: string;
  systemId: string;
  createdAt: Date;
  urgency: Urgency;
  timeWindowHours: number;
  recommendedActions: Action[];
  fallbackActions?: Action[];
  estimatedRecoveryTimeMinutes: number;
  successProbability: number; // 0-1
  wasExecuted?: boolean;
  executionResult?: ExecutionResult;
}

export interface ExecutionResult {
  executedAt: Date;
  actionsExecuted: string[]; // Action IDs
  success: boolean;
  actualRecoveryTimeMinutes: number;
  stabilityImprovement: number;
  notes: string;
}

export class RecoveryPlanModel implements RecoveryPlan {
  id: string;
  fracturePointId: string;
  systemId: string;
  createdAt: Date;
  urgency: Urgency;
  timeWindowHours: number;
  recommendedActions: Action[];
  fallbackActions?: Action[];
  estimatedRecoveryTimeMinutes: number;
  successProbability: number;
  wasExecuted?: boolean;
  executionResult?: ExecutionResult;

  constructor(data: RecoveryPlan) {
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
  getTopAction(): Action | null {
    if (this.recommendedActions.length === 0) return null;

    // Already sorted by priority, return first
    return this.recommendedActions[0];
  }

  /**
   * Get automatable actions
   */
  getAutomatableActions(): Action[] {
    return this.recommendedActions.filter((a) => a.automatable);
  }

  /**
   * Get manual actions (require human intervention)
   */
  getManualActions(): Action[] {
    return this.recommendedActions.filter((a) => !a.automatable);
  }

  /**
   * Calculate total estimated impact
   */
  getTotalEstimatedImpact(): number {
    if (this.recommendedActions.length === 0) return 0;

    // Compound effect (not just sum)
    return this.recommendedActions.reduce((total, action) => {
      return total + action.estimatedImpact * (1 - total);
    }, 0);
  }

  /**
   * Calculate total cost
   */
  getTotalCost(): number {
    return this.recommendedActions.reduce((total, action) => {
      return total + (action.costUSD || 0);
    }, 0);
  }

  /**
   * Check if plan is expired
   */
  isExpired(): boolean {
    const now = new Date();
    const expiryTime = new Date(
      this.createdAt.getTime() + this.timeWindowHours * 60 * 60 * 1000
    );
    return now > expiryTime;
  }

  /**
   * Get action execution order (respecting dependencies)
   */
  getExecutionOrder(): Action[] {
    const sorted: Action[] = [];
    const remaining = [...this.recommendedActions];
    const executed = new Set<string>();

    while (remaining.length > 0) {
      // Find actions with no unmet dependencies
      const ready = remaining.filter((action) => {
        if (!action.dependencies) return true;
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
      remaining.splice(
        0,
        remaining.length,
        ...remaining.filter((a) => !ready.includes(a))
      );
    }

    return sorted;
  }

  /**
   * Convert to JSON
   */
  toJSON(): Record<string, unknown> {
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
  static fromDatabase(row: any): RecoveryPlanModel {
    return new RecoveryPlanModel({
      id: row.id,
      fracturePointId: row.fracture_point_id,
      systemId: row.system_id,
      createdAt: new Date(row.created_at),
      urgency: row.urgency as Urgency,
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
