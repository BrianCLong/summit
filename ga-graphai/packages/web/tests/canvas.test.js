"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
vitest_1.vi.mock('policy', () => ({
    computeWorkflowEstimates: (workflow) => ({
        criticalPath: workflow.nodes.map((node) => node.id),
        totalLatencyMs: 0,
        totalCostUSD: 0,
    }),
    topologicalSort: (workflow) => ({
        order: workflow.nodes.map((node) => node.id),
    }),
    validateWorkflow: (workflow) => ({
        normalized: workflow,
        analysis: {
            estimated: {
                criticalPath: workflow.nodes.map((node) => node.id),
            },
        },
        warnings: [],
    }),
}));
function buildWorkflow() {
    return {
        workflowId: 'wf-web',
        tenantId: 'tenant-x',
        name: 'canvas',
        version: 1,
        policy: {
            purpose: 'engineering',
            retention: 'standard-365d',
            licenseClass: 'MIT-OK',
            pii: false,
        },
        constraints: { latencyP95Ms: 100000, budgetUSD: 15 },
        nodes: [
            {
                id: 'source',
                type: 'git.clone',
                params: {},
                estimates: { latencyP95Ms: 1000 },
            },
            {
                id: 'build',
                type: 'build.compile',
                params: {},
                estimates: { latencyP95Ms: 2000 },
            },
            {
                id: 'test',
                type: 'test.junit',
                params: {},
                estimates: { latencyP95Ms: 3000 },
            },
        ],
        edges: [
            { from: 'source', to: 'build', on: 'success' },
            { from: 'build', to: 'test', on: 'success' },
        ],
    };
}
(0, vitest_1.describe)('canvas utilities', () => {
    (0, vitest_1.it)('auto layouts critical path', () => {
        const state = (0, index_js_1.createCanvasState)(buildWorkflow());
        (0, vitest_1.expect)(Object.keys(state.positions).length).toBe(3);
        (0, vitest_1.expect)(state.positions.source.column).toBe(0);
        (0, vitest_1.expect)(state.positions.build.column).toBe(1);
        (0, vitest_1.expect)(state.positions.test.column).toBe(2);
        (0, vitest_1.expect)(state.positions.source.lane).toBe(0);
        (0, vitest_1.expect)(state.criticalPath.length).toBe(3);
    });
    (0, vitest_1.it)('autoLayout respects custom spacing', () => {
        const initial = (0, index_js_1.createCanvasState)(buildWorkflow());
        const updated = (0, index_js_1.autoLayout)(initial, {
            columnSpacing: 400,
            laneSpacing: 200,
        });
        (0, vitest_1.expect)(updated.positions.build.x).toBe(400);
        (0, vitest_1.expect)(updated.positions.build.y).toBe(0);
    });
    (0, vitest_1.it)('constraintAwareAutoLayout exposes helper', () => {
        const layout = (0, index_js_1.constraintAwareAutoLayout)(buildWorkflow(), {
            columnSpacing: 300,
        });
        (0, vitest_1.expect)(layout.test.x).toBe(600);
    });
    (0, vitest_1.it)('computeWorkflowDiff reports structural changes', () => {
        const current = buildWorkflow();
        const next = buildWorkflow();
        next.nodes.push({ id: 'lint', type: 'quality.lint', params: {} });
        next.edges.push({ from: 'test', to: 'lint', on: 'success' });
        const diff = (0, index_js_1.computeWorkflowDiff)(current, next);
        (0, vitest_1.expect)(diff.addedNodes).toEqual(['lint']);
        (0, vitest_1.expect)(diff.removedNodes.length).toBe(0);
        (0, vitest_1.expect)(diff.addedEdges.length).toBe(1);
    });
    (0, vitest_1.it)('observer state builds timeline from run', () => {
        const workflow = buildWorkflow();
        const run = {
            runId: 'run-1',
            workflowId: workflow.workflowId,
            version: workflow.version,
            status: 'succeeded',
            stats: {
                latencyMs: 6000,
                costUSD: 4.2,
                criticalPath: ['source', 'build', 'test'],
            },
            nodes: [
                {
                    nodeId: 'source',
                    status: 'succeeded',
                    startedAt: '2024-01-01T00:00:00Z',
                    finishedAt: '2024-01-01T00:02:00Z',
                },
                {
                    nodeId: 'build',
                    status: 'running',
                    startedAt: '2024-01-01T00:02:00Z',
                },
                {
                    nodeId: 'test',
                    status: 'queued',
                },
            ],
        };
        const observer = (0, index_js_1.createObserverState)(run);
        (0, vitest_1.expect)(observer.timeline.frames.length).toBeGreaterThanOrEqual(4);
        const [baseline, firstDelta] = observer.timeline.frames;
        (0, vitest_1.expect)(baseline.progressPercent).toBe(0);
        (0, vitest_1.expect)(firstDelta.delta).toEqual({ nodeId: 'source', status: 'running' });
        (0, vitest_1.expect)(firstDelta.statusCounts.running).toBe(1);
        const secondDelta = observer.timeline.frames[2];
        (0, vitest_1.expect)(secondDelta.delta).toEqual({
            nodeId: 'source',
            status: 'succeeded',
        });
        (0, vitest_1.expect)(secondDelta.progressPercent).toBe(33);
        const advanced = (0, index_js_1.advancePlayback)(observer, { step: 2 });
        (0, vitest_1.expect)(advanced.currentIndex).toBe(2);
        const looped = (0, index_js_1.advancePlayback)(observer, {
            direction: 'backward',
            loop: true,
        });
        (0, vitest_1.expect)(looped.currentIndex).toBeGreaterThanOrEqual(0);
    });
    (0, vitest_1.it)('applyRunUpdate overlays runtime statuses', () => {
        const state = (0, index_js_1.createCanvasState)(buildWorkflow());
        const run = {
            runId: 'run-2',
            workflowId: state.workflow.workflowId,
            version: state.workflow.version,
            status: 'running',
            stats: {
                latencyMs: 0,
                costUSD: 0,
                criticalPath: [],
            },
            nodes: [
                { nodeId: 'build', status: 'running' },
                { nodeId: 'test', status: 'queued' },
            ],
        };
        const withRuntime = (0, index_js_1.applyRunUpdate)(state, run);
        (0, vitest_1.expect)(withRuntime.runtime.build.status).toBe('running');
        (0, vitest_1.expect)(withRuntime.runtime.test.status).toBe('queued');
    });
    (0, vitest_1.it)('builds dependency graph snapshot with progress summary', () => {
        const workflow = buildWorkflow();
        const initial = (0, index_js_1.createCanvasState)(workflow);
        const run = {
            runId: 'run-graph',
            workflowId: workflow.workflowId,
            version: workflow.version,
            status: 'running',
            stats: {
                latencyMs: 4000,
                costUSD: 3.1,
                criticalPath: ['source', 'build', 'test'],
            },
            nodes: [
                {
                    nodeId: 'source',
                    status: 'succeeded',
                    startedAt: '2024-01-01T00:00:00Z',
                    finishedAt: '2024-01-01T00:01:00Z',
                },
                {
                    nodeId: 'build',
                    status: 'running',
                    startedAt: '2024-01-01T00:01:00Z',
                },
                {
                    nodeId: 'test',
                    status: 'queued',
                },
            ],
        };
        const observer = (0, index_js_1.createObserverState)(run);
        const stateWithRuntime = (0, index_js_1.applyRunUpdate)(initial, run);
        const latestFrame = observer.timeline.frames.at(-1);
        (0, vitest_1.expect)(latestFrame).toBeDefined();
        const snapshot = (0, index_js_1.buildDependencyGraphSnapshot)(stateWithRuntime, latestFrame);
        (0, vitest_1.expect)(snapshot.statusCounts.total).toBe(3);
        (0, vitest_1.expect)(snapshot.statusCounts.succeeded).toBe(1);
        (0, vitest_1.expect)(snapshot.statusCounts.running).toBe(1);
        (0, vitest_1.expect)(snapshot.progressPercent).toBe(33);
        const sourceNode = snapshot.nodes.find((node) => node.id === 'source');
        const testNode = snapshot.nodes.find((node) => node.id === 'test');
        (0, vitest_1.expect)(sourceNode?.isCritical).toBe(true);
        (0, vitest_1.expect)(sourceNode?.isBlocked).toBe(false);
        (0, vitest_1.expect)(testNode?.dependencies).toEqual(['build']);
        (0, vitest_1.expect)(testNode?.isBlocked).toBe(true);
        const satisfiedEdge = snapshot.edges.find((edge) => edge.from === 'source' && edge.to === 'build');
        (0, vitest_1.expect)(satisfiedEdge?.isSatisfied).toBe(true);
    });
});
