"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortfolioSimulator = void 0;
class PortfolioSimulator {
    graphStore;
    config;
    constructor(graphStore, config = {}) {
        this.graphStore = graphStore;
        this.config = { iterations: 1000, horizonDays: 90, velocityMean: 10, velocityStdDev: 3, riskFactor: 0.15, ...config };
    }
    async simulateCommitment(commitmentId) {
        const commitment = await this.graphStore.getNode(commitmentId);
        if (!commitment)
            throw new Error('Commitment not found');
        const edges = await this.graphStore.getEdges({ targetId: commitmentId, type: 'drives' });
        const tickets = await Promise.all(edges.map(e => this.graphStore.getNode(e.sourceId)));
        const valid = tickets.filter((t) => t !== null);
        const remaining = valid.filter(t => t.status !== 'done');
        const points = remaining.reduce((s, t) => s + (t.estimate || 3), 0);
        const dates = [];
        for (let i = 0; i < this.config.iterations; i++) {
            const vel = this.sampleVelocity();
            const sprints = Math.ceil(points / vel);
            const days = sprints * 14;
            const risk = Math.random() < this.config.riskFactor ? Math.random() * 14 : 0;
            dates.push(Date.now() + (days + risk) * 24 * 60 * 60 * 1000);
        }
        dates.sort((a, b) => a - b);
        const onTime = dates.filter(d => d <= commitment.dueDate.getTime()).length;
        const prob = onTime / dates.length;
        const risks = [];
        const recs = [];
        if (points > 30)
            risks.push('High remaining work');
        if (remaining.some(t => t.status === 'blocked'))
            risks.push('Blocked tickets');
        if (prob < 0.5)
            risks.push('Low probability');
        if (prob < 0.8) {
            recs.push('Reduce scope');
            recs.push('Add capacity');
        }
        return {
            commitmentId, deliveryProbability: prob,
            expectedDeliveryDate: new Date(dates.reduce((a, b) => a + b, 0) / dates.length),
            p50DeliveryDate: new Date(dates[Math.floor(dates.length * 0.5)]),
            p90DeliveryDate: new Date(dates[Math.floor(dates.length * 0.9)]),
            riskFactors: risks, recommendations: recs,
        };
    }
    async simulatePortfolio() {
        const commitments = await this.graphStore.getNodes({ type: 'commitment', status: 'active' });
        const results = [];
        let onTrack = 0, atRisk = 0, miss = 0;
        for (const c of commitments) {
            const r = await this.simulateCommitment(c.id);
            results.push(r);
            if (r.deliveryProbability >= 0.8)
                onTrack++;
            else if (r.deliveryProbability >= 0.5)
                atRisk++;
            else
                miss++;
        }
        const overall = commitments.length > 0 ? results.reduce((s, r) => s + r.deliveryProbability, 0) / commitments.length * 100 : 100;
        return { totalCommitments: commitments.length, onTrackCount: onTrack, atRiskCount: atRisk, likelyMissCount: miss, results, overallConfidence: overall };
    }
    sampleVelocity() {
        const u1 = Math.random(), u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return Math.max(1, this.config.velocityMean + z * this.config.velocityStdDev);
    }
}
exports.PortfolioSimulator = PortfolioSimulator;
