"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sloBudget = exports.queueDepthHistory = exports.policyDenials = exports.sloSnapshots = exports.releaseTrains = exports.runRecords = exports.pipelineGraph = exports.pipelineRecords = void 0;
const date_fns_1 = require("date-fns");
const owners = ['alex', 'casey', 'devon', 'jules', 'morgan'];
function randomChoice(items) {
    return items[Math.floor(Math.random() * items.length)];
}
function buildPipelines(total) {
    const now = new Date();
    return Array.from({ length: total }, (_, index) => {
        const id = `pipe-${index + 1}`;
        const statusPool = ['healthy', 'degraded', 'failed'];
        const status = statusPool[Math.floor(Math.random() * statusPool.length)];
        const lastRun = (0, date_fns_1.addMinutes)(now, -Math.floor(Math.random() * 720));
        const queueDepth = Math.floor(Math.random() * 12);
        return {
            id,
            name: `Pipeline ${index + 1}`,
            owners: [randomChoice(owners), randomChoice(owners)].filter((v, idx, arr) => arr.indexOf(v) === idx),
            status,
            lastRun: (0, date_fns_1.formatISO)(lastRun),
            leadTimeMinutes: 30 + Math.floor(Math.random() * 120),
            dora: {
                deploymentFrequency: 4 + Math.floor(Math.random() * 8),
                changeFailureRate: Math.round(Math.random() * 20),
                mttrMinutes: 20 + Math.floor(Math.random() * 120),
                leadTimeMinutes: 30 + Math.floor(Math.random() * 180),
            },
            costPerRun: 25 + Math.random() * 140,
            queueDepth,
        };
    });
}
function buildPipelineGraph(nodeCount) {
    const nodes = Array.from({ length: nodeCount }, (_, idx) => {
        const row = Math.floor(idx / 10);
        const col = idx % 10;
        return {
            id: `node-${idx + 1}`,
            label: `Step ${idx + 1}`,
            critical: idx % 11 === 0,
            durationMs: 5000 + Math.floor(Math.random() * 12000),
            x: col * 160,
            y: row * 140,
            owners: [randomChoice(owners)],
            slaMinutes: 15 + Math.floor(Math.random() * 45),
            flakyScore: Math.round(Math.random() * 100) / 100,
        };
    });
    const edges = [];
    for (let idx = 0; idx < nodeCount - 1; idx += 1) {
        edges.push({
            id: `edge-${idx + 1}`,
            source: `node-${idx + 1}`,
            target: `node-${idx + 2}`,
            critical: idx % 11 === 0,
        });
        if (idx + 10 < nodeCount) {
            edges.push({
                id: `edge-${idx + 1}-alt`,
                source: `node-${idx + 1}`,
                target: `node-${idx + 11}`,
                critical: false,
            });
        }
    }
    return { nodes, edges };
}
function buildRuns() {
    const now = new Date();
    return Array.from({ length: 12 }, (_, idx) => ({
        id: `run-${idx + 1}`,
        commit: `c${(1000 + idx).toString(16)}`,
        branch: idx % 2 === 0 ? 'main' : 'release/2025.09',
        initiator: idx % 3 === 0 ? 'build-bot' : randomChoice(owners),
        environment: idx % 4 === 0 ? 'production' : idx % 4 === 1 ? 'staging' : 'dev',
        durationSeconds: 360 + Math.floor(Math.random() * 900),
        retries: idx % 5 === 0 ? 1 : 0,
        startedAt: (0, date_fns_1.formatISO)((0, date_fns_1.addMinutes)(now, -idx * 120)),
        status: idx % 6 === 0 ? 'failed' : idx % 3 === 0 ? 'running' : 'passed',
    }));
}
function buildReleases() {
    const now = new Date();
    return [
        {
            id: 'release-1',
            name: 'Release Train Alpha',
            windowStart: (0, date_fns_1.formatISO)((0, date_fns_1.addMinutes)(now, -180)),
            windowEnd: (0, date_fns_1.formatISO)((0, date_fns_1.addMinutes)(now, 60)),
            status: 'running',
            gateStatus: 'pending',
            approvalsRequired: 4,
            approvalsComplete: 2,
        },
        {
            id: 'release-2',
            name: 'Release Train Beta',
            windowStart: (0, date_fns_1.formatISO)((0, date_fns_1.addMinutes)(now, 240)),
            windowEnd: (0, date_fns_1.formatISO)((0, date_fns_1.addMinutes)(now, 480)),
            status: 'scheduled',
            gateStatus: 'pending',
            approvalsRequired: 3,
            approvalsComplete: 0,
        },
        {
            id: 'release-0',
            name: 'Release Train Omega',
            windowStart: (0, date_fns_1.formatISO)((0, date_fns_1.addMinutes)(now, -720)),
            windowEnd: (0, date_fns_1.formatISO)((0, date_fns_1.addMinutes)(now, -300)),
            status: 'completed',
            gateStatus: 'pass',
            approvalsRequired: 3,
            approvalsComplete: 3,
        },
    ];
}
function buildSloSnapshots() {
    return [
        {
            service: 'pipeline-api',
            latencyP95Ms: 820,
            errorRate: 0.002,
            saturation: 0.61,
        },
        {
            service: 'artifact-proxy',
            latencyP95Ms: 1340,
            errorRate: 0.006,
            saturation: 0.72,
        },
        {
            service: 'policy-engine',
            latencyP95Ms: 640,
            errorRate: 0.001,
            saturation: 0.55,
        },
    ];
}
exports.pipelineRecords = buildPipelines(2000);
exports.pipelineGraph = buildPipelineGraph(200);
exports.runRecords = buildRuns();
exports.releaseTrains = buildReleases();
exports.sloSnapshots = buildSloSnapshots();
exports.policyDenials = [
    {
        id: 'denial-1',
        tenant: 'acme-co',
        reason: 'Promotion blocked: missing change ticket',
        occurredAt: (0, date_fns_1.formatISO)((0, date_fns_1.addMinutes)(new Date(), -45)),
    },
    {
        id: 'denial-2',
        tenant: 'aurora-labs',
        reason: 'Artifact export denied: PII redaction required',
        occurredAt: (0, date_fns_1.formatISO)((0, date_fns_1.addMinutes)(new Date(), -12)),
    },
];
exports.queueDepthHistory = Array.from({ length: 12 }, (_, idx) => ({
    hour: idx,
    depth: 5 + Math.floor(Math.random() * 20),
}));
exports.sloBudget = {
    latencyBudgetMs: 1500,
    errorBudget: 0.01,
};
