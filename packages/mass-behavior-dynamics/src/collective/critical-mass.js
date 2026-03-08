"use strict";
/**
 * Critical Mass Analysis
 *
 * Analyzes when collective action reaches tipping points
 * using percolation theory and cascade dynamics.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CriticalMassAnalyzer = void 0;
/**
 * Critical Mass Analyzer
 */
class CriticalMassAnalyzer {
    /**
     * Estimate critical mass threshold for cascade
     *
     * Uses mean-field approximation:
     * Critical fraction ≈ 1/<k> where <k> is average degree
     *
     * For complex contagion with threshold τ:
     * Critical fraction ≈ τ / (τ + (1-τ)<k>)
     */
    estimateCriticalThreshold(averageDegree, adoptionThreshold, contagionType) {
        if (contagionType === 'SIMPLE') {
            // Simple contagion (like disease)
            return 1 / averageDegree;
        }
        else {
            // Complex contagion (requires social reinforcement)
            return adoptionThreshold / (adoptionThreshold + (1 - adoptionThreshold) * averageDegree);
        }
    }
    /**
     * Analyze current state relative to critical mass
     */
    analyzeCriticalMass(currentAdoption, networkMetrics, thresholdDistribution) {
        // Estimate critical threshold
        const meanThreshold = thresholdDistribution.mean || this.estimateMeanThreshold(thresholdDistribution);
        const criticalThreshold = this.estimateCriticalThreshold(networkMetrics.averageDegree, meanThreshold, thresholdDistribution.type);
        // Calculate distance
        const distance = Math.max(0, criticalThreshold - currentAdoption);
        // Estimate cascade probability
        const cascadeProb = this.estimateCascadeProbability(currentAdoption, criticalThreshold, networkMetrics.clusteringCoefficient);
        // Identify key influencers
        const keyInfluencers = this.identifyKeyInfluencers(networkMetrics);
        // Identify vulnerable segments
        const vulnerableSegments = this.identifyVulnerableSegments(thresholdDistribution);
        return {
            currentAdoption,
            criticalThreshold,
            distanceToCritical: distance,
            cascadeProbability: cascadeProb,
            keyInfluencers,
            vulnerableSegments,
            timeToTipping: this.estimateTimeToTipping(currentAdoption, criticalThreshold, networkMetrics),
        };
    }
    /**
     * Identify minimum "seed" set for cascade
     *
     * Greedy algorithm for influence maximization
     */
    findMinimumSeedSet(network, thresholds, targetCoverage) {
        const seeds = [];
        const activated = new Set();
        while (this.calculateCoverage(activated, network) < targetCoverage) {
            // Find node that would activate the most additional nodes
            let bestNode = '';
            let bestGain = 0;
            for (const node of network.keys()) {
                if (activated.has(node)) {
                    continue;
                }
                // Simulate adding this node
                const gain = this.simulateActivation(node, activated, network, thresholds);
                if (gain > bestGain) {
                    bestGain = gain;
                    bestNode = node;
                }
            }
            if (bestNode === '') {
                break;
            }
            seeds.push(bestNode);
            this.propagateActivation(bestNode, activated, network, thresholds);
        }
        return seeds;
    }
    estimateMeanThreshold(dist) {
        return dist.mean || 0.25;
    }
    estimateCascadeProbability(adoption, threshold, clustering) {
        if (adoption >= threshold) {
            return 0.95;
        }
        // Probability increases as we approach threshold
        // Clustering helps local cascades
        const baseProbability = Math.pow(adoption / threshold, 2);
        const clusteringBonus = clustering * 0.2;
        return Math.min(0.95, baseProbability + clusteringBonus);
    }
    identifyKeyInfluencers(metrics) {
        // Return top nodes by centrality
        return metrics.topCentralityNodes?.slice(0, 5) || [];
    }
    identifyVulnerableSegments(dist) {
        return dist.lowThresholdSegments || [];
    }
    estimateTimeToTipping(current, threshold, metrics) {
        if (current >= threshold) {
            return 0;
        }
        const growthRate = metrics.adoptionVelocity || 0.01;
        if (growthRate <= 0) {
            return undefined;
        }
        return (threshold - current) / growthRate;
    }
    calculateCoverage(activated, network) {
        return activated.size / network.size;
    }
    simulateActivation(node, currentActive, network, thresholds) {
        const testActive = new Set(currentActive);
        testActive.add(node);
        let newActivations = 1;
        let changed = true;
        while (changed) {
            changed = false;
            for (const [n, neighbors] of network.entries()) {
                if (testActive.has(n)) {
                    continue;
                }
                const activeNeighbors = neighbors.filter((nb) => testActive.has(nb)).length;
                const threshold = thresholds.get(n) || 0.5;
                if (activeNeighbors / neighbors.length >= threshold) {
                    testActive.add(n);
                    newActivations++;
                    changed = true;
                }
            }
        }
        return newActivations;
    }
    propagateActivation(node, activated, network, thresholds) {
        activated.add(node);
        let changed = true;
        while (changed) {
            changed = false;
            for (const [n, neighbors] of network.entries()) {
                if (activated.has(n)) {
                    continue;
                }
                const activeNeighbors = neighbors.filter((nb) => activated.has(nb)).length;
                const threshold = thresholds.get(n) || 0.5;
                if (activeNeighbors / neighbors.length >= threshold) {
                    activated.add(n);
                    changed = true;
                }
            }
        }
    }
}
exports.CriticalMassAnalyzer = CriticalMassAnalyzer;
