"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const index_ts_1 = require("../src/index.ts");
function runTest(name, fn) {
    try {
        fn();
        console.log(`✓ ${name}`);
    }
    catch (error) {
        console.error(`✖ ${name}`);
        console.error(error);
        process.exitCode = 1;
    }
}
const workflow = {
    workflowId: 'wf-ledger',
    tenantId: 'tenant-9',
    name: 'ledger',
    version: 3,
    policy: {
        purpose: 'engineering',
        retention: 'standard-365d',
        licenseClass: 'MIT-OK',
        pii: false,
    },
    constraints: { latencyP95Ms: 1000, budgetUSD: 5 },
    nodes: [
        {
            id: 'n1',
            type: 'git.clone',
            params: {},
            evidenceOutputs: [
                { type: 'provenance', path: 'prov/n1.json', required: true },
            ],
        },
        {
            id: 'n2',
            type: 'test.junit',
            params: {},
            evidenceOutputs: [
                { type: 'junit', path: 'reports/junit.xml', required: true },
            ],
        },
    ],
    edges: [{ from: 'n1', to: 'n2', on: 'success' }],
};
const run = {
    runId: 'run-123',
    workflowId: 'wf-ledger',
    version: 3,
    status: 'succeeded',
    tenantId: 'tenant-9',
    stats: {
        latencyMs: 1200,
        costUSD: 1.25,
        criticalPath: ['n1', 'n2'],
        cacheHits: 1,
    },
    nodes: [
        {
            nodeId: 'n1',
            status: 'succeeded',
            startedAt: '2024-01-01T00:00:00Z',
            finishedAt: '2024-01-01T00:05:00Z',
            metrics: { latencyMs: 300 },
        },
    ],
};
runTest('record produces signed ledger entry', () => {
    const entry = (0, index_ts_1.record)(run, workflow, {
        ledgerBaseUri: 's3://ledger/runs/',
        signer: 'mc-platform',
        signingKey: 'secret-key',
    });
    strict_1.default.equal(entry.runId, run.runId);
    strict_1.default.equal(entry.workflowId, workflow.workflowId);
    strict_1.default.equal(entry.ledgerUri, 's3://ledger/runs/run-123');
    strict_1.default.equal(entry.evidence.length, 2);
    strict_1.default.equal(entry.evidence[0]?.nodeId, 'n1');
    strict_1.default.equal(entry.inputsHash.length, 64);
    strict_1.default.equal(entry.signature.length, 64);
});
runTest('record can include node metrics when requested', () => {
    const withMetrics = (0, index_ts_1.record)(run, workflow, {
        ledgerBaseUri: 's3://ledger/runs',
        signer: 'mc-platform',
        signingKey: 'secret-key',
    }, { includeNodeMetrics: true, evaluationTags: ['smoke'] });
    strict_1.default.deepEqual(withMetrics.tags, ['smoke']);
    strict_1.default.ok(withMetrics.outputsHash);
    const again = (0, index_ts_1.record)(run, workflow, {
        ledgerBaseUri: 's3://ledger/runs',
        signer: 'mc-platform',
        signingKey: 'secret-key',
    }, { includeNodeMetrics: true });
    strict_1.default.equal(withMetrics.outputsHash, again.outputsHash);
});
if (!process.exitCode) {
    console.log('All prov-ledger assertions passed.');
}
