"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
vitest_1.vi.mock('policy', () => ({
    computeWorkflowEstimates: () => ({
        criticalPath: [],
        totalLatencyMs: 0,
        totalCostUSD: 0,
    }),
    topologicalSort: () => ({ order: [] }),
    validateWorkflow: (workflow) => ({
        normalized: workflow,
        analysis: { estimated: { criticalPath: [] } },
        warnings: [],
    }),
}));
const index_js_1 = require("../src/index.js");
(0, vitest_1.describe)('McHealthMonitor dashboard', () => {
    (0, vitest_1.it)('tracks agent metrics and warning alerts in real time', () => {
        const base = Date.now();
        const monitor = new index_js_1.McHealthMonitor({
            staleHeartbeatMs: 5_000,
            metricsWindowMs: 60_000,
            emaAlpha: 0.4,
        });
        monitor.registerAgent({
            agentId: 'atlas',
            displayName: 'Atlas Router',
            region: 'us-east-1',
        });
        const heartbeat = {
            agentId: 'atlas',
            timestamp: base,
            status: 'healthy',
            currentLoad: 0.72,
            activeTasks: 3,
            queueDepth: 2,
        };
        monitor.ingestHeartbeat(heartbeat);
        const tasks = [
            {
                agentId: 'atlas',
                taskId: 't-1',
                success: true,
                durationMs: 1_200,
                tokensConsumed: 400,
                costUsd: 0.03,
                timestamp: base,
            },
            {
                agentId: 'atlas',
                taskId: 't-2',
                success: false,
                durationMs: 2_400,
                tokensConsumed: 250,
                costUsd: 0.02,
                timestamp: base + 200,
            },
            {
                agentId: 'atlas',
                taskId: 't-3',
                success: true,
                durationMs: 900,
                tokensConsumed: 500,
                costUsd: 0.04,
                timestamp: base + 400,
            },
        ];
        tasks.forEach((event) => monitor.ingestTaskResult(event));
        const alert = {
            agentId: 'atlas',
            timestamp: base + 300,
            level: 'warning',
            message: 'Queue depth above expected threshold',
        };
        monitor.ingestAlert(alert);
        const dashboard = monitor.getDashboard(base + 500);
        const [agent] = dashboard.agents;
        (0, vitest_1.expect)(agent.registration.displayName).toBe('Atlas Router');
        (0, vitest_1.expect)(agent.status).toBe('warning');
        (0, vitest_1.expect)(agent.metrics.totalTasks).toBe(3);
        (0, vitest_1.expect)(agent.metrics.completed).toBe(2);
        (0, vitest_1.expect)(agent.metrics.failed).toBe(1);
        (0, vitest_1.expect)(agent.metrics.successRate).toBeCloseTo(2 / 3, 3);
        (0, vitest_1.expect)(agent.metrics.avgLatencyMs).toBeCloseTo((1_200 + 2_400 + 900) / 3, 5);
        (0, vitest_1.expect)(agent.metrics.p95LatencyMs).toBeGreaterThanOrEqual(agent.metrics.avgLatencyMs);
        (0, vitest_1.expect)(agent.metrics.throughputPerMin).toBeCloseTo(3, 5);
        (0, vitest_1.expect)(agent.metrics.tokensPerMin).toBeCloseTo(1_150, 5);
        (0, vitest_1.expect)(agent.metrics.costPerMin).toBeCloseTo(0.09, 5);
        (0, vitest_1.expect)(agent.alerts).toHaveLength(1);
        (0, vitest_1.expect)(dashboard.summary.counts.warning).toBe(1);
        (0, vitest_1.expect)(dashboard.incidents[0]?.message).toMatch(/Queue depth/);
    });
    (0, vitest_1.it)('marks agents offline when heartbeats are stale', () => {
        const base = Date.now();
        const monitor = new index_js_1.McHealthMonitor({
            staleHeartbeatMs: 1_000,
            metricsWindowMs: 60_000,
        });
        monitor.registerAgent({
            agentId: 'bishop',
            displayName: 'Bishop Executor',
        });
        monitor.ingestHeartbeat({
            agentId: 'bishop',
            timestamp: base,
            status: 'healthy',
            currentLoad: 0.2,
        });
        const healthySnapshot = monitor.getDashboard(base + 200).agents[0];
        (0, vitest_1.expect)(healthySnapshot.status).toBe('healthy');
        const offlineSnapshot = monitor.getDashboard(base + 5_000).agents[0];
        (0, vitest_1.expect)(offlineSnapshot.status).toBe('offline');
        (0, vitest_1.expect)(offlineSnapshot.metrics.totalTasks).toBe(0);
    });
    (0, vitest_1.it)('aggregates summary metrics and incidents across agents', () => {
        const base = Date.now();
        const monitor = new index_js_1.McHealthMonitor({
            staleHeartbeatMs: 10_000,
            metricsWindowMs: 120_000,
        });
        monitor.registerAgent({
            agentId: 'alpha',
            displayName: 'Alpha Router',
            region: 'us-west-2',
        });
        monitor.registerAgent({
            agentId: 'beta',
            displayName: 'Beta Synthesizer',
            region: 'eu-central-1',
        });
        monitor.ingestHeartbeat({
            agentId: 'alpha',
            timestamp: base,
            status: 'healthy',
            currentLoad: 0.4,
        });
        monitor.ingestHeartbeat({
            agentId: 'beta',
            timestamp: base,
            status: 'warning',
            currentLoad: 1.35,
        });
        const alphaTasks = [
            {
                agentId: 'alpha',
                taskId: 'a-1',
                success: true,
                durationMs: 800,
                tokensConsumed: 300,
                costUsd: 0.02,
                timestamp: base,
            },
            {
                agentId: 'alpha',
                taskId: 'a-2',
                success: true,
                durationMs: 700,
                tokensConsumed: 280,
                costUsd: 0.02,
                timestamp: base + 1_000,
            },
        ];
        alphaTasks.forEach((event) => monitor.ingestTaskResult(event));
        const betaTasks = [
            {
                agentId: 'beta',
                taskId: 'b-1',
                success: false,
                durationMs: 5_000,
                tokensConsumed: 600,
                costUsd: 0.05,
                timestamp: base + 50,
            },
            {
                agentId: 'beta',
                taskId: 'b-2',
                success: false,
                durationMs: 6_000,
                tokensConsumed: 700,
                costUsd: 0.06,
                timestamp: base + 100,
            },
        ];
        betaTasks.forEach((event) => monitor.ingestTaskResult(event));
        monitor.ingestAlert({
            agentId: 'beta',
            timestamp: base + 200,
            level: 'critical',
            message: 'Model endpoint unreachable',
        });
        const dashboard = monitor.getDashboard(base + 2_000);
        const summary = dashboard.summary;
        (0, vitest_1.expect)(summary.totalAgents).toBe(2);
        (0, vitest_1.expect)(summary.counts.critical).toBe(1);
        (0, vitest_1.expect)(summary.counts.healthy +
            summary.counts.warning +
            summary.counts.critical +
            summary.counts.offline).toBe(2);
        (0, vitest_1.expect)(summary.avgSuccessRate).toBeCloseTo(0.5, 5);
        (0, vitest_1.expect)(summary.throughputPerMin).toBeCloseTo(2, 5);
        (0, vitest_1.expect)(summary.tokensPerMin).toBeCloseTo((300 + 280 + 600 + 700) / 2, 5);
        (0, vitest_1.expect)(summary.costPerMin).toBeCloseTo((0.02 + 0.02 + 0.05 + 0.06) / 2, 5);
        (0, vitest_1.expect)(summary.topByReliability[0]?.agentId).toBe('alpha');
        (0, vitest_1.expect)(summary.topByThroughput[0]?.metric).toBeGreaterThan(0);
        (0, vitest_1.expect)(summary.topByLatency[0]?.agentId).toBe('alpha');
        (0, vitest_1.expect)(dashboard.incidents[0]?.agentId).toBe('beta');
    });
});
