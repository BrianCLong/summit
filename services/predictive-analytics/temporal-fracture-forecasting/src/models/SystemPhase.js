"use strict";
/**
 * SystemPhase - Represents the current phase state of a system
 *
 * Systems transition through distinct phases based on stability characteristics.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemPhaseModel = exports.PhaseState = void 0;
var PhaseState;
(function (PhaseState) {
    PhaseState["STABLE"] = "STABLE";
    PhaseState["PRE_FRACTURE"] = "PRE_FRACTURE";
    PhaseState["UNSTABLE"] = "UNSTABLE";
    PhaseState["CRITICAL"] = "CRITICAL";
    PhaseState["RECOVERING"] = "RECOVERING";
})(PhaseState || (exports.PhaseState = PhaseState = {}));
class SystemPhaseModel {
    systemId;
    current;
    duration;
    stability;
    trends;
    lastTransition;
    constructor(data) {
        this.systemId = data.systemId;
        this.current = data.current;
        this.duration = data.duration;
        this.stability = data.stability;
        this.trends = data.trends;
        this.lastTransition = data.lastTransition;
    }
    /**
     * Determine if phase is healthy
     */
    isHealthy() {
        return (this.current === PhaseState.STABLE ||
            this.current === PhaseState.RECOVERING);
    }
    /**
     * Determine if phase requires attention
     */
    requiresAttention() {
        return (this.current === PhaseState.PRE_FRACTURE ||
            this.current === PhaseState.UNSTABLE ||
            this.current === PhaseState.CRITICAL);
    }
    /**
     * Get phase severity (0-1)
     */
    getSeverity() {
        const severityMap = {
            [PhaseState.STABLE]: 0.0,
            [PhaseState.RECOVERING]: 0.2,
            [PhaseState.PRE_FRACTURE]: 0.5,
            [PhaseState.UNSTABLE]: 0.75,
            [PhaseState.CRITICAL]: 1.0,
        };
        return severityMap[this.current];
    }
    /**
     * Get dominant trend
     */
    getDominantTrend() {
        if (this.trends.length === 0)
            return null;
        return this.trends.reduce((max, trend) => trend.magnitude > max.magnitude ? trend : max);
    }
    /**
     * Predict next phase transition
     */
    predictNextPhase() {
        // Simple state machine logic
        const transitions = {
            [PhaseState.STABLE]: [
                { phase: PhaseState.PRE_FRACTURE, probability: 0.1 },
                { phase: PhaseState.STABLE, probability: 0.9 },
            ],
            [PhaseState.PRE_FRACTURE]: [
                { phase: PhaseState.UNSTABLE, probability: 0.6 },
                { phase: PhaseState.STABLE, probability: 0.4 },
            ],
            [PhaseState.UNSTABLE]: [
                { phase: PhaseState.CRITICAL, probability: 0.7 },
                { phase: PhaseState.RECOVERING, probability: 0.3 },
            ],
            [PhaseState.CRITICAL]: [
                { phase: PhaseState.RECOVERING, probability: 0.5 },
                { phase: PhaseState.CRITICAL, probability: 0.5 },
            ],
            [PhaseState.RECOVERING]: [
                { phase: PhaseState.STABLE, probability: 0.8 },
                { phase: PhaseState.UNSTABLE, probability: 0.2 },
            ],
        };
        const possibleTransitions = transitions[this.current];
        // Adjust probabilities based on stability score
        if (this.stability.stabilityScore < 0.3) {
            // Low stability, increase probability of degradation
            return possibleTransitions.find((t) => [PhaseState.UNSTABLE, PhaseState.CRITICAL].includes(t.phase)) || possibleTransitions[0];
        }
        return possibleTransitions[0];
    }
    /**
     * Convert to JSON
     */
    toJSON() {
        return {
            systemId: this.systemId,
            current: this.current,
            duration: this.duration,
            stability: {
                ...this.stability,
                timestamp: this.stability.timestamp.toISOString(),
            },
            trends: this.trends,
            lastTransition: this.lastTransition
                ? {
                    ...this.lastTransition,
                    transitionTime: this.lastTransition.transitionTime.toISOString(),
                }
                : undefined,
            isHealthy: this.isHealthy(),
            requiresAttention: this.requiresAttention(),
            severity: this.getSeverity(),
        };
    }
    /**
     * Create from database row
     */
    static fromDatabase(row) {
        return new SystemPhaseModel({
            systemId: row.system_id,
            current: row.current_phase,
            duration: row.duration,
            stability: {
                timestamp: new Date(row.stability_timestamp),
                systemId: row.system_id,
                lyapunovExponent: row.lyapunov_exponent,
                stabilityScore: row.stability_score,
                hurstExponent: row.hurst_exponent,
                entropy: row.entropy,
                isStable: row.is_stable,
                timeToInstability: row.time_to_instability,
            },
            trends: row.trends || [],
            lastTransition: row.last_transition,
        });
    }
}
exports.SystemPhaseModel = SystemPhaseModel;
