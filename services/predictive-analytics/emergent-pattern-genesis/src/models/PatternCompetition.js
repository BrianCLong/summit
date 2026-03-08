"use strict";
/**
 * Pattern Competition Model
 * Models competition dynamics between proto-patterns
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatternCompetitionModel = void 0;
class PatternCompetitionModel {
    id;
    competitorIds;
    competitionMatrix;
    predictedOutcome;
    equilibriumState;
    timeToEquilibrium;
    dominantPatternId;
    metadata;
    constructor(data) {
        this.id = data.id || this.generateId();
        this.competitorIds = data.competitorIds || [];
        this.competitionMatrix = data.competitionMatrix || [];
        this.predictedOutcome = data.predictedOutcome || 'UNCERTAIN';
        this.equilibriumState = data.equilibriumState || {};
        this.timeToEquilibrium = data.timeToEquilibrium;
        this.dominantPatternId = data.dominantPatternId;
        this.metadata = data.metadata;
    }
    generateId() {
        return `comp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
    /**
     * Initialize competition matrix
     */
    initializeCompetitionMatrix(overlaps) {
        const n = this.competitorIds.length;
        this.competitionMatrix = Array(n)
            .fill(0)
            .map(() => Array(n).fill(0));
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i === j) {
                    this.competitionMatrix[i][j] = 1.0; // Self-competition
                }
                else {
                    const id1 = this.competitorIds[i];
                    const id2 = this.competitorIds[j];
                    const overlap = overlaps.get(id1)?.get(id2) ||
                        overlaps.get(id2)?.get(id1) ||
                        0;
                    this.competitionMatrix[i][j] = overlap;
                }
            }
        }
    }
    /**
     * Simulate Lotka-Volterra competition dynamics
     */
    simulateLotkaVolterra(initialStrengths, growthRates, carryingCapacities, timeSteps, dt = 0.1) {
        const n = this.competitorIds.length;
        const trajectory = [initialStrengths];
        for (let t = 0; t < timeSteps; t++) {
            const current = trajectory[trajectory.length - 1];
            const next = new Array(n).fill(0);
            for (let i = 0; i < n; i++) {
                const Ni = current[i];
                const ri = growthRates[i];
                const Ki = carryingCapacities[i];
                // Calculate competition term
                let competitionSum = Ni;
                for (let j = 0; j < n; j++) {
                    if (i !== j) {
                        competitionSum += this.competitionMatrix[i][j] * current[j];
                    }
                }
                // Lotka-Volterra equation
                const dNi = ri * Ni * (1 - competitionSum / Ki);
                next[i] = Math.max(0, Ni + dNi * dt);
            }
            trajectory.push(next);
            // Check for convergence
            if (this.hasConverged(current, next)) {
                this.timeToEquilibrium = t;
                break;
            }
        }
        return trajectory;
    }
    /**
     * Check if system has converged
     */
    hasConverged(current, next, threshold = 0.001) {
        for (let i = 0; i < current.length; i++) {
            if (Math.abs(next[i] - current[i]) > threshold) {
                return false;
            }
        }
        return true;
    }
    /**
     * Determine competition outcome from equilibrium
     */
    determineOutcome(equilibrium, threshold = 0.1) {
        const survivors = equilibrium.filter((n) => n > threshold).length;
        const maxStrength = Math.max(...equilibrium);
        const dominantIndex = equilibrium.indexOf(maxStrength);
        if (survivors === 0) {
            this.predictedOutcome = 'EXCLUSION';
        }
        else if (survivors === 1) {
            this.predictedOutcome = 'DOMINANCE';
            this.dominantPatternId = this.competitorIds[dominantIndex];
        }
        else if (survivors === equilibrium.length) {
            // Check if oscillating
            const variance = this.calculateVariance(equilibrium);
            if (variance > 0.2) {
                this.predictedOutcome = 'OSCILLATION';
            }
            else {
                this.predictedOutcome = 'COEXISTENCE';
            }
        }
        else {
            this.predictedOutcome = 'UNCERTAIN';
        }
        this.equilibriumState = {
            strengths: equilibrium,
            survivors: survivors,
            dominantIndex: dominantIndex,
        };
    }
    /**
     * Calculate variance of equilibrium strengths
     */
    calculateVariance(values) {
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
            values.length;
        return variance;
    }
    /**
     * Get competition intensity between two patterns
     */
    getCompetitionIntensity(id1, id2) {
        const i = this.competitorIds.indexOf(id1);
        const j = this.competitorIds.indexOf(id2);
        if (i === -1 || j === -1) {
            return 0;
        }
        return (this.competitionMatrix[i][j] + this.competitionMatrix[j][i]) / 2;
    }
    /**
     * Export to JSON
     */
    toJSON() {
        return {
            id: this.id,
            competitorIds: this.competitorIds,
            competitionMatrix: this.competitionMatrix,
            predictedOutcome: this.predictedOutcome,
            equilibriumState: this.equilibriumState,
            timeToEquilibrium: this.timeToEquilibrium,
            dominantPatternId: this.dominantPatternId,
            metadata: this.metadata,
        };
    }
}
exports.PatternCompetitionModel = PatternCompetitionModel;
