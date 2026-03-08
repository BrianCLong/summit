"use strict";
/**
 * Summit Work Graph - Portfolio Simulator
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortfolioSimulator = void 0;
const DEFAULT_CONFIG = {
    iterations: 1000,
    horizonDays: 90,
    velocityMean: 10,
    velocityStdDev: 3,
    riskFactor: 0.15,
};
class PortfolioSimulator {
    config;
    graphStore;
    constructor(graphStore, config = {}) {
        this.graphStore = graphStore;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    async simulateCommitment(commitmentId) {
        const commitment = await this.graphStore.getNode(commitmentId);
        if (!commitment)
            throw new Error('Commitment not found');
        // Get linked tickets
        const edges = await this.graphStore.getEdges({ targetId: commitmentId, type: 'drives' });
        const ticketIds = edges.map(e => e.sourceId);
        const tickets = await Promise.all(ticketIds.map(id => this.graphStore.getNode(id)));
        const validTickets = tickets.filter((t) => t !== null);
        // Calculate remaining work
        const remainingTickets = validTickets.filter(t => t.status !== 'done');
        const remainingPoints = remainingTickets.reduce((sum, t) => sum + (t.estimate || 3), 0);
        // Monte Carlo simulation
        const deliveryDates = [];
        for (let i = 0; i < this.config.iterations; i++) {
            const velocity = this.sampleVelocity();
            const sprintsNeeded = Math.ceil(remainingPoints / velocity);
            const daysNeeded = sprintsNeeded * 14; // 2-week sprints
            // Add risk factor
            const riskDays = Math.random() < this.config.riskFactor ? Math.random() * 14 : 0;
            const deliveryDate = Date.now() + (daysNeeded + riskDays) * 24 * 60 * 60 * 1000;
            deliveryDates.push(deliveryDate);
        }
        // Calculate statistics
        deliveryDates.sort((a, b) => a - b);
        const p50Index = Math.floor(deliveryDates.length * 0.5);
        const p90Index = Math.floor(deliveryDates.length * 0.9);
        const onTimeCount = deliveryDates.filter(d => d <= commitment.dueDate.getTime()).length;
        const deliveryProbability = onTimeCount / deliveryDates.length;
        // Identify risk factors
        const riskFactors = [];
        if (remainingPoints > 30)
            riskFactors.push('High remaining work volume');
        if (remainingTickets.some(t => t.status === 'blocked'))
            riskFactors.push('Blocked tickets in path');
        if (deliveryProbability < 0.5)
            riskFactors.push('Low delivery probability');
        // Generate recommendations
        const recommendations = [];
        if (deliveryProbability < 0.8) {
            recommendations.push('Consider reducing scope');
            recommendations.push('Add capacity or extend deadline');
        }
        if (remainingTickets.some(t => t.agentEligible && !t.assignee)) {
            recommendations.push('Assign agent-eligible tickets to agents');
        }
        return {
            commitmentId,
            deliveryProbability,
            expectedDeliveryDate: new Date(deliveryDates.reduce((a, b) => a + b, 0) / deliveryDates.length),
            p50DeliveryDate: new Date(deliveryDates[p50Index]),
            p90DeliveryDate: new Date(deliveryDates[p90Index]),
            riskFactors,
            recommendations,
        };
    }
    async simulatePortfolio() {
        const commitments = await this.graphStore.getNodes({ type: 'commitment', status: 'active' });
        const results = [];
        let onTrackCount = 0;
        let atRiskCount = 0;
        let likelyMissCount = 0;
        for (const commitment of commitments) {
            const result = await this.simulateCommitment(commitment.id);
            results.push(result);
            if (result.deliveryProbability >= 0.8) {
                onTrackCount++;
            }
            else if (result.deliveryProbability >= 0.5) {
                atRiskCount++;
            }
            else {
                likelyMissCount++;
            }
        }
        const overallConfidence = commitments.length > 0
            ? results.reduce((sum, r) => sum + r.deliveryProbability, 0) / commitments.length * 100
            : 100;
        return {
            totalCommitments: commitments.length,
            onTrackCount,
            atRiskCount,
            likelyMissCount,
            results,
            overallConfidence,
        };
    }
    async whatIfAnalysis(scenario) {
        // Clone current config
        const originalConfig = { ...this.config };
        // Apply scenario adjustments
        if (scenario.addCapacity) {
            this.config.velocityMean += scenario.addCapacity;
        }
        // Run simulation with modified parameters
        const result = await this.simulatePortfolio();
        // Restore original config
        this.config = originalConfig;
        return result;
    }
    sampleVelocity() {
        // Box-Muller transform for normal distribution
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return Math.max(1, this.config.velocityMean + z * this.config.velocityStdDev);
    }
}
exports.PortfolioSimulator = PortfolioSimulator;
