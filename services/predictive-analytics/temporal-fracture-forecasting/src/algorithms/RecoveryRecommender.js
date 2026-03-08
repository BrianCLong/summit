"use strict";
/**
 * RecoveryRecommender - Generates recovery plans to prevent fractures
 *
 * Uses rule-based expert system to recommend interventions based on
 * fracture characteristics and system phase.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecoveryRecommender = void 0;
const FracturePoint_js_1 = require("../models/FracturePoint.js");
const SystemPhase_js_1 = require("../models/SystemPhase.js");
const RecoveryPlan_js_1 = require("../models/RecoveryPlan.js");
class RecoveryRecommender {
    /**
     * Generate recovery plan for a fracture point
     */
    generatePlan(fracturePoint, currentPhase) {
        // Calculate urgency
        const urgency = this.calculateUrgency(fracturePoint, currentPhase);
        // Generate recommended actions
        const recommendedActions = this.generateActions(fracturePoint, currentPhase);
        // Generate fallback actions
        const fallbackActions = this.generateFallbackActions(fracturePoint, currentPhase);
        // Estimate recovery time
        const estimatedRecoveryTime = this.estimateRecoveryTime(recommendedActions);
        // Calculate success probability
        const successProbability = this.calculateSuccessProbability(fracturePoint, currentPhase, recommendedActions);
        return new RecoveryPlan_js_1.RecoveryPlanModel({
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
    calculateUrgency(fracturePoint, currentPhase) {
        const urgencyScore = fracturePoint.calculateUrgency();
        // Adjust based on current phase
        let adjustedScore = urgencyScore;
        if (currentPhase.current === SystemPhase_js_1.PhaseState.CRITICAL) {
            adjustedScore = Math.min(1, adjustedScore * 1.5);
        }
        else if (currentPhase.current === SystemPhase_js_1.PhaseState.STABLE) {
            adjustedScore *= 0.8;
        }
        if (adjustedScore > 0.8)
            return RecoveryPlan_js_1.Urgency.CRITICAL;
        if (adjustedScore > 0.6)
            return RecoveryPlan_js_1.Urgency.HIGH;
        if (adjustedScore > 0.4)
            return RecoveryPlan_js_1.Urgency.MEDIUM;
        return RecoveryPlan_js_1.Urgency.LOW;
    }
    /**
     * Generate recommended actions
     */
    generateActions(fracturePoint, currentPhase) {
        const actions = [];
        // Get primary trigger
        const primaryTrigger = fracturePoint.getPrimaryTrigger();
        // Generate actions based on severity and triggers
        if (fracturePoint.severity === FracturePoint_js_1.FractureSeverity.CRITICAL) {
            actions.push(this.createScaleAction(fracturePoint), this.createCircuitBreakerAction(fracturePoint), this.createTrafficShiftAction(fracturePoint));
        }
        else if (fracturePoint.severity === FracturePoint_js_1.FractureSeverity.HIGH) {
            actions.push(this.createScaleAction(fracturePoint), this.createRateLimitAction(fracturePoint), this.createCacheWarmingAction(fracturePoint));
        }
        else if (fracturePoint.severity === FracturePoint_js_1.FractureSeverity.MEDIUM) {
            actions.push(this.createConfigTuningAction(fracturePoint), this.createCacheWarmingAction(fracturePoint));
        }
        else {
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
    generateFallbackActions(fracturePoint, currentPhase) {
        return [
            this.createRollbackAction(fracturePoint),
            this.createRestartAction(fracturePoint),
        ];
    }
    /**
     * Create scale resources action
     */
    createScaleAction(fracturePoint) {
        return {
            id: `action-scale-${fracturePoint.id}`,
            type: RecoveryPlan_js_1.ActionType.SCALE_RESOURCES,
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
    createRateLimitAction(fracturePoint) {
        return {
            id: `action-ratelimit-${fracturePoint.id}`,
            type: RecoveryPlan_js_1.ActionType.RATE_LIMIT,
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
    createCircuitBreakerAction(fracturePoint) {
        return {
            id: `action-circuit-${fracturePoint.id}`,
            type: RecoveryPlan_js_1.ActionType.CIRCUIT_BREAK,
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
    createCacheWarmingAction(fracturePoint) {
        return {
            id: `action-cache-${fracturePoint.id}`,
            type: RecoveryPlan_js_1.ActionType.CACHE_WARM,
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
    createTrafficShiftAction(fracturePoint) {
        return {
            id: `action-traffic-${fracturePoint.id}`,
            type: RecoveryPlan_js_1.ActionType.TRAFFIC_SHIFT,
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
    createConfigTuningAction(fracturePoint) {
        return {
            id: `action-config-${fracturePoint.id}`,
            type: RecoveryPlan_js_1.ActionType.CONFIG_TUNE,
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
    createRestartAction(fracturePoint) {
        return {
            id: `action-restart-${fracturePoint.id}`,
            type: RecoveryPlan_js_1.ActionType.RESTART_SERVICE,
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
    createRollbackAction(fracturePoint) {
        return {
            id: `action-rollback-${fracturePoint.id}`,
            type: RecoveryPlan_js_1.ActionType.DEPLOY_ROLLBACK,
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
    estimateRecoveryTime(actions) {
        if (actions.length === 0)
            return 0;
        // Assume actions run in parallel where possible
        // Use max time + 20% overhead
        const maxTime = Math.max(...actions.map((a) => a.timeToEffectMinutes));
        return Math.ceil(maxTime * 1.2);
    }
    /**
     * Calculate success probability
     */
    calculateSuccessProbability(fracturePoint, currentPhase, actions) {
        if (actions.length === 0)
            return 0;
        // Base probability from actions' estimated impact
        const totalImpact = actions.reduce((sum, a) => sum + a.estimatedImpact, 0);
        const avgImpact = totalImpact / actions.length;
        // Adjust based on lead time (more time = better chance)
        const leadTimeFactor = Math.min(1, fracturePoint.leadTimeHours / 24);
        // Adjust based on current phase
        const phaseFactor = currentPhase.current === SystemPhase_js_1.PhaseState.CRITICAL
            ? 0.7
            : currentPhase.current === SystemPhase_js_1.PhaseState.STABLE
                ? 1.2
                : 1.0;
        const baseProbability = avgImpact * leadTimeFactor * phaseFactor;
        return Math.max(0, Math.min(1, baseProbability));
    }
}
exports.RecoveryRecommender = RecoveryRecommender;
