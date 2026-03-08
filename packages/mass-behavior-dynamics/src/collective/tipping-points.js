"use strict";
/**
 * Tipping Point Analysis
 *
 * Identifies and predicts social tipping points for various phenomena
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TippingPointAnalyzer = void 0;
/**
 * Tipping Point Analyzer
 */
class TippingPointAnalyzer {
    /**
     * Analyze social tipping dynamics
     *
     * Common social tipping points:
     * - Norm change (25% threshold per Centola et al.)
     * - Technology adoption (Rogers diffusion curve)
     * - Political mobilization (variable, network-dependent)
     * - Trust collapse (often sudden, hysteresis)
     */
    analyzeTippingDynamics(phenomenon, timeSeries, parameters) {
        // Determine current state
        const currentState = this.assessCurrentState(timeSeries);
        // Identify relevant tipping points
        const tippingPoints = this.identifyTippingPoints(phenomenon, parameters);
        // Calculate trajectory
        const trajectory = this.calculateTrajectory(timeSeries, tippingPoints);
        // Identify intervention levers
        const interventionLeverage = this.identifyInterventionLevers(phenomenon, currentState);
        return {
            phenomenon,
            currentState,
            tippingPoints,
            trajectory,
            interventionLeverage,
        };
    }
    /**
     * Social norm tipping analysis
     *
     * Based on research showing ~25% committed minority
     * can tip social conventions
     */
    analyzeNormTipping(currentCommitted, networkStructure) {
        // Centola threshold (~25%) adjusted for network
        const baseThreshold = 0.25;
        const adjustedThreshold = this.adjustThresholdForNetwork(baseThreshold, networkStructure);
        const distanceToTipping = adjustedThreshold - currentCommitted;
        const cascadeLikelihood = this.estimateCascadeLikelihood(currentCommitted, adjustedThreshold);
        return {
            threshold: adjustedThreshold,
            currentCommitted,
            distanceToTipping,
            cascadeLikelihood,
            estimatedTimeToTipping: this.estimateTimeDynamics(currentCommitted, adjustedThreshold),
            keyGroups: this.identifyKeyNormGroups(networkStructure),
        };
    }
    assessCurrentState(timeSeries) {
        const n = timeSeries.length;
        const current = timeSeries[n - 1];
        const velocity = n > 1 ? timeSeries[n - 1] - timeSeries[n - 2] : 0;
        const stability = this.calculateStability(timeSeries);
        let basin;
        if (stability > 0.7) {
            basin = current > 0.5 ? 'POST_TIPPING' : 'PRE_TIPPING';
        }
        else {
            basin = 'TRANSITION';
        }
        return { position: current, velocity, stability, basin };
    }
    calculateStability(timeSeries) {
        const variance = this.calculateVariance(timeSeries);
        return Math.exp(-variance * 10);
    }
    calculateVariance(series) {
        const mean = series.reduce((a, b) => a + b, 0) / series.length;
        return series.reduce((sum, x) => sum + (x - mean) ** 2, 0) / series.length;
    }
    identifyTippingPoints(phenomenon, params) {
        const points = [];
        if (phenomenon === 'NORM_CHANGE') {
            points.push({
                name: 'Social Convention Tipping',
                type: 'BIFURCATION',
                threshold: params.normThreshold || 0.25,
                reversibility: 0.3,
                consequences: ['Rapid norm adoption', 'Old norm becomes deviant'],
                earlyWarningWindow: 14,
            });
        }
        if (phenomenon === 'TRUST_COLLAPSE') {
            points.push({
                name: 'Institutional Trust Collapse',
                type: 'NOISE_INDUCED',
                threshold: params.trustThreshold || 0.3,
                reversibility: 0.2,
                consequences: [
                    'Legitimacy crisis',
                    'Alternative authority seeking',
                    'Social fragmentation',
                ],
                earlyWarningWindow: 7,
            });
        }
        if (phenomenon === 'MOBILIZATION') {
            points.push({
                name: 'Mass Mobilization Threshold',
                type: 'NETWORK_CASCADE',
                threshold: params.mobilizationThreshold || 0.1,
                reversibility: 0.5,
                consequences: ['Collective action', 'Demonstration effects', 'Counter-mobilization'],
                earlyWarningWindow: 3,
            });
        }
        return points;
    }
    calculateTrajectory(timeSeries, tippingPoints) {
        const current = timeSeries[timeSeries.length - 1];
        const velocity = this.calculateVelocity(timeSeries);
        const nearestTipping = tippingPoints[0]?.threshold || 0.5;
        const direction = velocity * Math.sign(nearestTipping - current);
        const trend = direction > 0.01 ? 'TOWARD' : direction < -0.01 ? 'AWAY' : 'PARALLEL';
        const timeToTipping = velocity !== 0 ? Math.abs(nearestTipping - current) / Math.abs(velocity) : undefined;
        return {
            current,
            trend,
            timeToTipping,
            uncertainty: this.calculateUncertainty(timeSeries),
        };
    }
    calculateVelocity(timeSeries) {
        const n = timeSeries.length;
        if (n < 2) {
            return 0;
        }
        // Use last 5 points for velocity estimate
        const window = timeSeries.slice(-5);
        let sumSlope = 0;
        for (let i = 1; i < window.length; i++) {
            sumSlope += window[i] - window[i - 1];
        }
        return sumSlope / (window.length - 1);
    }
    calculateUncertainty(timeSeries) {
        const variance = this.calculateVariance(timeSeries);
        return Math.sqrt(variance);
    }
    identifyInterventionLevers(phenomenon, state) {
        const levers = [];
        if (phenomenon === 'NORM_CHANGE') {
            levers.push({
                lever: 'Visible committed minorities',
                sensitivity: 0.8,
                direction: 1,
                cost: 'LOW',
                timeScale: 'WEEKS',
            });
            levers.push({
                lever: 'Elite endorsement',
                sensitivity: 0.6,
                direction: 1,
                cost: 'MEDIUM',
                timeScale: 'DAYS',
            });
        }
        if (phenomenon === 'TRUST_COLLAPSE') {
            levers.push({
                lever: 'Transparency measures',
                sensitivity: 0.5,
                direction: -1,
                cost: 'LOW',
                timeScale: 'DAYS',
            });
            levers.push({
                lever: 'Trusted intermediaries',
                sensitivity: 0.7,
                direction: -1,
                cost: 'MEDIUM',
                timeScale: 'WEEKS',
            });
        }
        return levers;
    }
    adjustThresholdForNetwork(base, structure) {
        // Higher clustering lowers threshold (local reinforcement)
        const clusteringEffect = structure.clustering * 0.1;
        // Higher modularity raises threshold (harder to spread across groups)
        const modularityEffect = structure.modularity * 0.1;
        return Math.max(0.1, Math.min(0.5, base - clusteringEffect + modularityEffect));
    }
    estimateCascadeLikelihood(current, threshold) {
        if (current >= threshold) {
            return 0.95;
        }
        return Math.pow(current / threshold, 2);
    }
    estimateTimeDynamics(current, threshold) {
        // Would need velocity data
        return undefined;
    }
    identifyKeyNormGroups(structure) {
        return structure.highCentralityGroups || [];
    }
}
exports.TippingPointAnalyzer = TippingPointAnalyzer;
