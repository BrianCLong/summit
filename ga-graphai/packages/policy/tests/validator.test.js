"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const index_ts_1 = require("../src/index.ts");
const secrets_1 = require("secrets");
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
function createWorkflow() {
    return {
        workflowId: 'wf_valid',
        tenantId: 'tenant-1',
        name: 'valid',
        version: 1,
        policy: {
            purpose: 'engineering',
            retention: 'standard-365d',
            licenseClass: 'MIT-OK',
            pii: false,
        },
        constraints: {
            latencyP95Ms: 900000,
            budgetUSD: 12,
            maxParallelism: 16,
        },
        nodes: [
            {
                id: 'n1',
                type: 'git.clone',
                params: { repo: 'vault://repo' },
                estimates: { latencyP95Ms: 60000, costUSD: 0.5 },
            },
            {
                id: 'n2',
                type: 'build.compile',
                params: { cacheKey: 'main' },
                estimates: { latencyP95Ms: 180000, costUSD: 2.5 },
                produces: [{ name: 'artifact', type: 'generic' }],
            },
            {
                id: 'n3',
                type: 'test.junit',
                params: { pattern: '**/*.xml' },
                consumes: [{ name: 'artifact', type: 'generic' }],
                estimates: { latencyP95Ms: 120000, costUSD: 1.2, successRate: 0.98 },
            },
        ],
        edges: [
            { from: 'n1', to: 'n2', on: 'success' },
            { from: 'n2', to: 'n3', on: 'success' },
        ],
    };
}
runTest('validateWorkflow passes healthy graph', () => {
    const result = (0, index_ts_1.validateWorkflow)(createWorkflow());
    strict_1.default.equal(result.analysis.issues.length, 0);
    strict_1.default.equal(result.analysis.suggestions.length, 0);
    strict_1.default.deepEqual(result.analysis.sources, ['n1']);
    strict_1.default.deepEqual(result.analysis.sinks, ['n3']);
    strict_1.default.ok(result.analysis.estimated.latencyP95Ms > 0);
});
runTest('policy retention enforced for PII', () => {
    const workflow = createWorkflow();
    workflow.policy.pii = true;
    workflow.policy.retention = 'standard-365d';
    const result = (0, index_ts_1.validateWorkflow)(workflow);
    const retentionIssue = result.analysis.issues.find((issue) => issue.code === 'policy.retention');
    strict_1.default.ok(retentionIssue);
});
runTest('what-if planner adjusts estimates', () => {
    const workflow = createWorkflow();
    const original = (0, index_ts_1.computeWorkflowEstimates)(workflow);
    const scenario = (0, index_ts_1.planWhatIf)(workflow, {
        label: 'halve cost',
        cacheHitRate: 0.5,
        parallelismMultiplier: 0.5,
        overrides: { n2: { latencyP95Ms: 60000 } },
    });
    strict_1.default.ok(scenario.latencyP95Ms < original.latencyP95Ms);
    strict_1.default.ok(scenario.costUSD <= original.costUSD);
});
runTest('budget suggestions trigger when near threshold', () => {
    const workflow = createWorkflow();
    const estimates = {
        latencyP95Ms: 1000,
        costUSD: 10,
        queueMs: 0,
        successRate: 0.9,
        criticalPath: ['n1', 'n2', 'n3'],
    };
    const suggestions = (0, index_ts_1.suggestBudgetActions)(workflow, estimates, 0.8);
    strict_1.default.ok(suggestions.some((item) => item.code === 'budget.watch'));
});
runTest('artifact catalog aggregates producer bindings', () => {
    const workflow = createWorkflow();
    const artifacts = (0, index_ts_1.collectArtifactCatalog)(workflow);
    strict_1.default.equal(artifacts.length, 1);
    strict_1.default.equal(artifacts[0]?.type, 'generic');
});
runTest('topological sort orders nodes', () => {
    const workflow = createWorkflow();
    const topology = (0, index_ts_1.topologicalSort)(workflow);
    strict_1.default.deepEqual(topology.order, ['n1', 'n2', 'n3']);
    strict_1.default.equal(topology.cycles.length, 0);
});
runTest('validateWorkflow flags cyclic graphs', () => {
    const workflow = createWorkflow();
    workflow.edges.push({ from: 'n3', to: 'n2', on: 'success' });
    const result = (0, index_ts_1.validateWorkflow)(workflow);
    const cycleIssue = result.analysis.issues.find((issue) => issue.code === 'topology.cycle');
    strict_1.default.ok(cycleIssue);
    strict_1.default.equal(cycleIssue?.severity, 'error');
});
runTest('topological sort surfaces cycles without infinite loop', () => {
    const workflow = createWorkflow();
    workflow.edges.push({ from: 'n3', to: 'n2', on: 'success' });
    const topology = (0, index_ts_1.topologicalSort)(workflow);
    strict_1.default.ok(topology.cycles.length > 0);
    strict_1.default.ok(topology.cycles.some((cycle) => cycle.includes('n2') && cycle.includes('n3')));
});
runTest('secret rotation compliance surfaces stale references', () => {
    const workflow = createWorkflow();
    workflow.nodes[0].params = {
        repo: 'vault://repo',
        credential: {
            provider: 'kms',
            keyId: 'alias/db',
            ciphertext: Buffer.from('envelope').toString('base64'),
            key: 'db/password',
        },
    };
    const manager = new secrets_1.ZeroTrustSecretsManager([
        {
            name: 'kms-stub',
            supports: (ref) => ref.provider === 'kms',
            getSecret: async () => ({ provider: 'kms-stub', value: 'placeholder' }),
            describeRotation: () => ({
                needsRotation: true,
                reason: 'rotation interval exceeded',
            }),
        },
    ]);
    const result = (0, index_ts_1.validateWorkflow)(workflow, { secretsManager: manager });
    const rotationIssue = result.analysis.issues.find((issue) => issue.code === 'policy.secret-rotation');
    strict_1.default.ok(rotationIssue);
});
runTest('unsupported secret provider is blocked', () => {
    const workflow = createWorkflow();
    workflow.nodes[0].params = {
        repo: 'vault://repo',
        credential: {
            provider: 'kms',
            keyId: 'alias/db',
            ciphertext: Buffer.from('envelope').toString('base64'),
            key: 'db/password',
        },
    };
    const manager = new secrets_1.ZeroTrustSecretsManager([]);
    const result = (0, index_ts_1.validateWorkflow)(workflow, { secretsManager: manager });
    const providerIssue = result.analysis.issues.find((issue) => issue.code === 'policy.secret-provider');
    strict_1.default.ok(providerIssue);
});
if (process?.env?.NODE_TEST) {
    const { test: nodeTest } = await Promise.resolve().then(() => __importStar(require('node:test')));
    nodeTest('validator vitest compatibility placeholder', () => { });
}
if (!process.exitCode) {
    console.log('All policy assertions passed.');
}
