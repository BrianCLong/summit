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
runTest('emptyWorkflow applies platform defaults', () => {
    const wf = (0, index_ts_1.emptyWorkflow)('tenant-1', 'demo', 'owner');
    strict_1.default.equal(wf.policy.retention, index_ts_1.DEFAULT_RETENTION);
    strict_1.default.equal(wf.constraints.maxParallelism, 32);
    strict_1.default.equal(wf.defaults?.retries, index_ts_1.DEFAULT_VALIDATION_DEFAULTS.retries);
    strict_1.default.equal(wf.nodes.length, 0);
    strict_1.default.ok(wf.createdAt);
});
runTest('normalizeWorkflow injects evidence when missing', () => {
    const workflow = {
        workflowId: 'wf_1',
        tenantId: 'tenant-1',
        name: 'sample',
        version: 1,
        policy: {
            purpose: 'engineering',
            retention: index_ts_1.DEFAULT_RETENTION,
            licenseClass: 'MIT-OK',
            pii: false,
        },
        constraints: {
            latencyP95Ms: 1000,
            budgetUSD: 10,
        },
        nodes: [
            {
                id: 'n1',
                type: 'git.clone',
                params: {},
            },
        ],
        edges: [],
    };
    const normalized = (0, index_ts_1.normalizeWorkflow)(workflow);
    const node = normalized.nodes[0];
    strict_1.default.equal(node.retries, index_ts_1.DEFAULT_VALIDATION_DEFAULTS.retries);
    strict_1.default.equal(node.timeoutMs, index_ts_1.DEFAULT_VALIDATION_DEFAULTS.timeoutMs);
    strict_1.default.ok(node.evidenceOutputs?.length);
    strict_1.default.match(node.evidenceOutputs?.[0]?.path ?? '', /prov\/n1.json/);
});
runTest('graph helpers expose sources, sinks, and summaries', () => {
    const nodes = [
        { id: 'a', type: 'git.clone', params: {} },
        { id: 'b', type: 'test.junit', params: {} },
        { id: 'c', type: 'quality.coverage', params: {} },
    ];
    const wf = (0, index_ts_1.normalizeWorkflow)({
        workflowId: 'wf_2',
        tenantId: 'tenant-1',
        name: 'graph',
        version: 1,
        policy: {
            purpose: 'engineering',
            retention: index_ts_1.DEFAULT_RETENTION,
            licenseClass: 'MIT-OK',
            pii: false,
        },
        constraints: { latencyP95Ms: 1000, budgetUSD: 10 },
        nodes,
        edges: [
            { from: 'a', to: 'b', on: 'success' },
            { from: 'b', to: 'c', on: 'success' },
        ],
    });
    strict_1.default.deepEqual((0, index_ts_1.listSourceNodes)(wf), ['a']);
    strict_1.default.deepEqual((0, index_ts_1.listSinkNodes)(wf), ['c']);
    const summary = (0, index_ts_1.summarizeWorkflow)(wf);
    strict_1.default.equal(summary.nodeCount, 3);
    strict_1.default.equal(summary.edgeCount, 2);
});
runTest('evidence analyzer differentiates required and optional', () => {
    const nodes = [
        {
            id: 'alpha',
            type: 'git.clone',
            params: {},
            evidenceOutputs: [],
        },
        {
            id: 'beta',
            type: 'test.junit',
            params: {},
            evidenceOutputs: [
                { type: 'junit', path: 'reports/junit.xml', required: true },
            ],
        },
        {
            id: 'gamma',
            type: 'quality.lint',
            params: {},
            evidenceOutputs: [
                { type: 'coverage', path: 'coverage/lcov.info', required: false },
            ],
        },
    ];
    const analysis = (0, index_ts_1.analyzeEvidence)(nodes);
    strict_1.default.deepEqual(analysis.missing, ['alpha']);
    strict_1.default.deepEqual(analysis.complete, ['beta']);
    strict_1.default.deepEqual(analysis.optional, ['gamma']);
});
runTest('enumerateArtifacts aggregates produced bindings', () => {
    const nodes = [
        {
            id: 'alpha',
            type: 'test.junit',
            params: {},
            produces: [
                { name: 'junit', type: 'junit' },
                { name: 'coverage', type: 'coverage', optional: true },
            ],
        },
    ];
    const artifacts = (0, index_ts_1.enumerateArtifacts)(nodes);
    strict_1.default.equal(artifacts.length, 2);
    strict_1.default.equal(artifacts[0]?.type, 'junit');
});
runTest('ensureSecret validates supported provider shapes', () => {
    strict_1.default.equal((0, index_ts_1.ensureSecret)('plain'), false);
    strict_1.default.equal((0, index_ts_1.ensureSecret)({ vault: 'vault://main', key: 'db/password' }), true);
    strict_1.default.equal((0, index_ts_1.ensureSecret)({
        provider: 'kms',
        keyId: 'kms-key',
        ciphertext: Buffer.from('cipher').toString('base64'),
        key: 'db/password',
    }), true);
    strict_1.default.equal((0, index_ts_1.ensureSecret)({ provider: 'kms', keyId: 'kms-key', key: 'db/password' }), false);
});
runTest('createWhatIfScenario wraps overrides', () => {
    const scenario = (0, index_ts_1.createWhatIfScenario)('low parallelism', {
        nodeA: { latencyP95Ms: 1000 },
    });
    strict_1.default.equal(scenario.label, 'low parallelism');
    strict_1.default.equal(scenario.overrides?.nodeA?.latencyP95Ms, 1000);
});
if (!process.exitCode) {
    console.log('All common-types assertions passed.');
}
