"use strict";
/**
 * Summit Work Graph - Engineering Metrics Dashboard
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsDashboard = void 0;
class MetricsDashboard {
    graphStore;
    constructor(graphStore) {
        this.graphStore = graphStore;
    }
    async getVelocityMetrics(sprintId) {
        const filter = { type: 'ticket', status: 'done' };
        if (sprintId)
            filter.sprintId = sprintId;
        const completedTickets = await this.graphStore.getNodes(filter);
        const pointsCompleted = completedTickets.reduce((sum, t) => sum + (t.estimate || 0), 0);
        const byAgent = {};
        for (const ticket of completedTickets) {
            if (ticket.assignee)
                byAgent[ticket.assignee] = (byAgent[ticket.assignee] || 0) + (ticket.estimate || 1);
        }
        const leadTimes = completedTickets.filter(t => t.completedAt).map(t => t.completedAt.getTime() - t.createdAt.getTime());
        const averageLeadTime = leadTimes.length > 0 ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : 0;
        return { pointsCompleted, ticketsCompleted: completedTickets.length, averageLeadTime: averageLeadTime / (1000 * 60 * 60 * 24), trend: 'stable', byAgent };
    }
    async getCycleTimeMetrics() {
        const completedTickets = await this.graphStore.getNodes({ type: 'ticket', status: 'done' });
        const cycleTimes = completedTickets.filter(t => t.completedAt).map(t => (t.completedAt.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60 * 24)).sort((a, b) => a - b);
        if (cycleTimes.length === 0)
            return { average: 0, p50: 0, p90: 0, p99: 0, byStage: {} };
        return {
            average: cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length,
            p50: cycleTimes[Math.floor(cycleTimes.length * 0.5)],
            p90: cycleTimes[Math.floor(cycleTimes.length * 0.9)],
            p99: cycleTimes[Math.floor(cycleTimes.length * 0.99)],
            byStage: {},
        };
    }
    async getWIPMetrics() {
        const inProgress = await this.graphStore.getNodes({ type: 'ticket', status: 'in_progress' });
        const review = await this.graphStore.getNodes({ type: 'ticket', status: 'review' });
        const allWIP = [...inProgress, ...review];
        const byStatus = {};
        const byAssignee = {};
        const aging = { '<1d': 0, '1-3d': 0, '3-7d': 0, '>7d': 0 };
        const now = Date.now();
        for (const ticket of allWIP) {
            byStatus[ticket.status] = (byStatus[ticket.status] || 0) + 1;
            if (ticket.assignee)
                byAssignee[ticket.assignee] = (byAssignee[ticket.assignee] || 0) + 1;
            const ageDays = (now - ticket.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
            if (ageDays < 1)
                aging['<1d']++;
            else if (ageDays < 3)
                aging['1-3d']++;
            else if (ageDays < 7)
                aging['3-7d']++;
            else
                aging['>7d']++;
        }
        return { current: allWIP.length, limit: 10, byStatus, byAssignee, aging };
    }
    async getQualityMetrics() {
        const prs = await this.graphStore.getNodes({ type: 'pr' });
        const mergedPRs = prs.filter(p => p.status === 'merged');
        return {
            prMergeRate: prs.length > 0 ? mergedPRs.length / prs.length : 0,
            reviewTurnaround: 4.5,
            bugEscapeRate: 0.02,
            testCoverage: 78.5,
            securityFindings: { critical: 0, high: 2, medium: 8, low: 15 },
        };
    }
    async getAgentMetrics() {
        const agents = await this.graphStore.getNodes({ type: 'agent' });
        const active = agents.filter(a => a.status === 'available' || a.status === 'busy');
        const totalTasks = agents.reduce((sum, a) => sum + a.completedTasks, 0);
        const avgSuccess = agents.length > 0 ? agents.reduce((sum, a) => sum + a.successRate, 0) / agents.length : 100;
        const leaderboard = agents.map(a => ({ agentId: a.id, name: a.name, score: a.reputation, tasksCompleted: a.completedTasks }))
            .sort((a, b) => b.score - a.score).slice(0, 10);
        return { totalAgents: agents.length, activeAgents: active.length, tasksCompleted: totalTasks, successRate: avgSuccess, averageCompletionTime: 2.5, leaderboard };
    }
    async getCommitmentMetrics() {
        const commitments = await this.graphStore.getNodes({ type: 'commitment' });
        const active = commitments.filter(c => c.status === 'active');
        const atRisk = commitments.filter(c => c.status === 'at_risk');
        const delivered = commitments.filter(c => c.status === 'delivered');
        const broken = commitments.filter(c => c.status === 'broken');
        const upcoming = active.filter(c => c.dueDate.getTime() - Date.now() < 14 * 24 * 60 * 60 * 1000)
            .map(c => ({ id: c.id, customer: c.customer, dueDate: c.dueDate, confidence: c.confidence }))
            .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
        return { total: commitments.length, onTrack: active.length, atRisk: atRisk.length, delivered: delivered.length, broken: broken.length, upcomingDeadlines: upcoming };
    }
    async getHealthScore() {
        const [velocity, cycleTime, wip, quality, agents] = await Promise.all([
            this.getVelocityMetrics(), this.getCycleTimeMetrics(), this.getWIPMetrics(), this.getQualityMetrics(), this.getAgentMetrics(),
        ]);
        const velocityScore = Math.min(100, velocity.pointsCompleted * 2);
        const qualityScore = quality.prMergeRate * 100;
        const predictabilityScore = cycleTime.average > 0 ? Math.max(0, 100 - cycleTime.average * 5) : 100;
        const agentScore = agents.successRate;
        const overall = (velocityScore + qualityScore + predictabilityScore + agentScore) / 4;
        const alerts = [];
        if (wip.current > wip.limit)
            alerts.push({ severity: 'warning', message: `WIP limit exceeded: ${wip.current}/${wip.limit}`, timestamp: new Date() });
        if (wip.aging['>7d'] > 3)
            alerts.push({ severity: 'warning', message: `${wip.aging['>7d']} tickets aging >7 days`, timestamp: new Date() });
        if (quality.securityFindings.critical > 0)
            alerts.push({ severity: 'critical', message: `${quality.securityFindings.critical} critical security findings`, timestamp: new Date() });
        return { overall, velocity: velocityScore, quality: qualityScore, predictability: predictabilityScore, agentEfficiency: agentScore, alerts };
    }
}
exports.MetricsDashboard = MetricsDashboard;
