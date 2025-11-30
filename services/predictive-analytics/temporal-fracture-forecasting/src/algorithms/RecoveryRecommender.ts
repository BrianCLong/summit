/**
 * RecoveryRecommender - Generates recovery plans to prevent fractures
 *
 * Uses rule-based expert system to recommend interventions based on
 * fracture characteristics and system phase.
 */

import { FracturePointModel, FractureSeverity } from '../models/FracturePoint.js';
import { SystemPhaseModel, PhaseState } from '../models/SystemPhase.js';
import {
  RecoveryPlanModel,
  Urgency,
  Action,
  ActionType,
} from '../models/RecoveryPlan.js';

export class RecoveryRecommender {
  /**
   * Generate recovery plan for a fracture point
   */
  generatePlan(
    fracturePoint: FracturePointModel,
    currentPhase: SystemPhaseModel
  ): RecoveryPlanModel {
    // Calculate urgency
    const urgency = this.calculateUrgency(fracturePoint, currentPhase);

    // Generate recommended actions
    const recommendedActions = this.generateActions(
      fracturePoint,
      currentPhase
    );

    // Generate fallback actions
    const fallbackActions = this.generateFallbackActions(
      fracturePoint,
      currentPhase
    );

    // Estimate recovery time
    const estimatedRecoveryTime = this.estimateRecoveryTime(
      recommendedActions
    );

    // Calculate success probability
    const successProbability = this.calculateSuccessProbability(
      fracturePoint,
      currentPhase,
      recommendedActions
    );

    return new RecoveryPlanModel({
      id: `plan-${fracturePoint.id}`,
      fracturePointId: fracturePoint.id,
      systemId: fracturePoint.systemId,
      createdAt: new Date(),
      urgency,
      timeWindowHours: fracturePoint.leadTimeHours,
      recommendedActions,
      fallbackActions,
      estimatedRecoveryTimeMinutes: estimatedRecoveryTime,
      successProbability,
    });
  }

  /**
   * Calculate urgency level
   */
  private calculateUrgency(
    fracturePoint: FracturePointModel,
    currentPhase: SystemPhaseModel
  ): Urgency {
    const urgencyScore = fracturePoint.calculateUrgency();

    // Adjust based on current phase
    let adjustedScore = urgencyScore;

    if (currentPhase.current === PhaseState.CRITICAL) {
      adjustedScore = Math.min(1, adjustedScore * 1.5);
    } else if (currentPhase.current === PhaseState.STABLE) {
      adjustedScore *= 0.8;
    }

    if (adjustedScore > 0.8) return Urgency.CRITICAL;
    if (adjustedScore > 0.6) return Urgency.HIGH;
    if (adjustedScore > 0.4) return Urgency.MEDIUM;
    return Urgency.LOW;
  }

  /**
   * Generate recommended actions
   */
  private generateActions(
    fracturePoint: FracturePointModel,
    currentPhase: SystemPhaseModel
  ): Action[] {
    const actions: Action[] = [];

    // Get primary trigger
    const primaryTrigger = fracturePoint.getPrimaryTrigger();

    // Generate actions based on severity and triggers
    if (fracturePoint.severity === FractureSeverity.CRITICAL) {
      actions.push(
        this.createScaleAction(fracturePoint),
        this.createCircuitBreakerAction(fracturePoint),
        this.createTrafficShiftAction(fracturePoint)
      );
    } else if (fracturePoint.severity === FractureSeverity.HIGH) {
      actions.push(
        this.createScaleAction(fracturePoint),
        this.createRateLimitAction(fracturePoint),
        this.createCacheWarmingAction(fracturePoint)
      );
    } else if (fracturePoint.severity === FractureSeverity.MEDIUM) {
      actions.push(
        this.createConfigTuningAction(fracturePoint),
        this.createCacheWarmingAction(fracturePoint)
      );
    } else {
      actions.push(this.createConfigTuningAction(fracturePoint));
    }

    // Add trigger-specific actions
    if (primaryTrigger?.name === 'stability_degradation') {
      actions.push(this.createRestartAction(fracturePoint));
    }

    // Rank actions by estimated impact
    return actions.sort((a, b) => b.estimatedImpact - a.estimatedImpact);
  }

  /**
   * Generate fallback actions
   */
  private generateFallbackActions(
    fracturePoint: FracturePointModel,
    currentPhase: SystemPhaseModel
  ): Action[] {
    return [
      this.createRollbackAction(fracturePoint),
      this.createRestartAction(fracturePoint),
    ];
  }

  /**
   * Create scale resources action
   */
  private createScaleAction(fracturePoint: FracturePointModel): Action {
    return {
      id: `action-scale-${fracturePoint.id}`,
      type: ActionType.SCALE_RESOURCES,
      description: 'Scale up system resources to handle increased load',
      parameters: {
        cpuIncrease: '50%',
        memoryIncrease: '50%',
        replicaIncrease: 2,
      },
      estimatedImpact: 0.8,
      timeToEffectMinutes: 5,
      riskLevel: 'low',
      costUSD: 500,
      automatable: true,
    };
  }

  /**
   * Create rate limiting action
   */
  private createRateLimitAction(fracturePoint: FracturePointModel): Action {
    return {
      id: `action-ratelimit-${fracturePoint.id}`,
      type: ActionType.RATE_LIMIT,
      description: 'Apply rate limiting to reduce system load',
      parameters: {
        requestsPerSecond: 1000,
        burstSize: 2000,
      },
      estimatedImpact: 0.6,
      timeToEffectMinutes: 1,
      riskLevel: 'low',
      automatable: true,
    };
  }

  /**
   * Create circuit breaker action
   */
  private createCircuitBreakerAction(
    fracturePoint: FracturePointModel
  ): Action {
    return {
      id: `action-circuit-${fracturePoint.id}`,
      type: ActionType.CIRCUIT_BREAK,
      description: 'Enable circuit breaker to isolate failing components',
      parameters: {
        errorThreshold: 0.5,
        timeout: 30,
        resetTimeout: 60,
      },
      estimatedImpact: 0.7,
      timeToEffectMinutes: 1,
      riskLevel: 'medium',
      automatable: true,
    };
  }

  /**
   * Create cache warming action
   */
  private createCacheWarmingAction(fracturePoint: FracturePointModel): Action {
    return {
      id: `action-cache-${fracturePoint.id}`,
      type: ActionType.CACHE_WARM,
      description: 'Warm cache to reduce database load',
      parameters: {
        cacheKeys: ['popular_queries', 'user_sessions'],
        ttl: 3600,
      },
      estimatedImpact: 0.5,
      timeToEffectMinutes: 10,
      riskLevel: 'low',
      automatable: true,
    };
  }

  /**
   * Create traffic shift action
   */
  private createTrafficShiftAction(fracturePoint: FracturePointModel): Action {
    return {
      id: `action-traffic-${fracturePoint.id}`,
      type: ActionType.TRAFFIC_SHIFT,
      description: 'Shift traffic to healthy instances',
      parameters: {
        targetRegion: 'us-east-1',
        percentage: 50,
      },
      estimatedImpact: 0.75,
      timeToEffectMinutes: 2,
      riskLevel: 'medium',
      automatable: true,
    };
  }

  /**
   * Create configuration tuning action
   */
  private createConfigTuningAction(fracturePoint: FracturePointModel): Action {
    return {
      id: `action-config-${fracturePoint.id}`,
      type: ActionType.CONFIG_TUNE,
      description: 'Tune system configuration for better performance',
      parameters: {
        connectionPoolSize: 100,
        requestTimeout: 30,
        maxConcurrentRequests: 500,
      },
      estimatedImpact: 0.4,
      timeToEffectMinutes: 5,
      riskLevel: 'low',
      automatable: true,
    };
  }

  /**
   * Create restart action
   */
  private createRestartAction(fracturePoint: FracturePointModel): Action {
    return {
      id: `action-restart-${fracturePoint.id}`,
      type: ActionType.RESTART_SERVICE,
      description: 'Rolling restart of service instances',
      parameters: {
        rollingRestart: true,
        drainTimeout: 30,
      },
      estimatedImpact: 0.6,
      timeToEffectMinutes: 10,
      riskLevel: 'medium',
      automatable: true,
    };
  }

  /**
   * Create rollback action
   */
  private createRollbackAction(fracturePoint: FracturePointModel): Action {
    return {
      id: `action-rollback-${fracturePoint.id}`,
      type: ActionType.DEPLOY_ROLLBACK,
      description: 'Rollback to previous stable deployment',
      parameters: {
        targetVersion: 'previous',
      },
      estimatedImpact: 0.9,
      timeToEffectMinutes: 15,
      riskLevel: 'high',
      automatable: false,
    };
  }

  /**
   * Estimate total recovery time
   */
  private estimateRecoveryTime(actions: Action[]): number {
    if (actions.length === 0) return 0;

    // Assume actions run in parallel where possible
    // Use max time + 20% overhead
    const maxTime = Math.max(...actions.map((a) => a.timeToEffectMinutes));
    return Math.ceil(maxTime * 1.2);
  }

  /**
   * Calculate success probability
   */
  private calculateSuccessProbability(
    fracturePoint: FracturePointModel,
    currentPhase: SystemPhaseModel,
    actions: Action[]
  ): number {
    if (actions.length === 0) return 0;

    // Base probability from actions' estimated impact
    const totalImpact = actions.reduce((sum, a) => sum + a.estimatedImpact, 0);
    const avgImpact = totalImpact / actions.length;

    // Adjust based on lead time (more time = better chance)
    const leadTimeFactor = Math.min(
      1,
      fracturePoint.leadTimeHours / 24
    );

    // Adjust based on current phase
    const phaseFactor =
      currentPhase.current === PhaseState.CRITICAL
        ? 0.7
        : currentPhase.current === PhaseState.STABLE
        ? 1.2
        : 1.0;

    const baseProbability = avgImpact * leadTimeFactor * phaseFactor;

    return Math.max(0, Math.min(1, baseProbability));
  }
}
