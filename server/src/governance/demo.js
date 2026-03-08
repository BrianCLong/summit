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
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("./index.js");
const uuid_1 = require("uuid");
const fs = __importStar(require("fs"));
// 1. Setup Policies
const policies = [
    {
        id: 'safety-runtime-v1',
        description: 'Block highly toxic prompts at runtime',
        scope: { stages: ['runtime'], tenants: ['*'] },
        rules: [
            { field: 'prompt.toxicity', operator: 'gt', value: 0.8 }
        ],
        action: 'DENY'
    },
    {
        id: 'tool-restriction-v1',
        description: 'Restrict system shell access for external tenants',
        scope: { stages: ['runtime'], tenants: ['external-tenant'] },
        rules: [
            { field: 'tool', operator: 'in', value: ['system_shell', 'rm_rf'] }
        ],
        action: 'DENY'
    },
    {
        id: 'data-pii-v1',
        description: 'Escalate if PII detected in training data',
        scope: { stages: ['data'], tenants: ['*'] },
        rules: [
            { field: 'metadata.has_pii', operator: 'eq', value: true }
        ],
        action: 'ESCALATE'
    }
];
index_js_1.governance.loadPolicies(policies);
console.log('Policies loaded.');
// 2. Simulate Runtime Request (Allowed)
const runId1 = (0, uuid_1.v4)();
console.log(`\n--- Simulating Runtime Request 1 (Safe) [RunID: ${runId1}] ---`);
const context1 = {
    stage: 'runtime',
    tenantId: 'internal-tenant',
    payload: {
        prompt: { text: "Hello world", toxicity: 0.1 },
        tool: "calculator"
    },
    metadata: { runId: runId1 } // Hack to pass runId for logging
};
const decision1 = index_js_1.governance.check(context1);
console.log('Decision:', decision1.action);
await index_js_1.governance.logEvent({
    kind: 'inference',
    runId: runId1,
    modelId: 'frontier-1.0',
    tenantId: 'internal-tenant',
    details: { prompt_length: 11 }
});
// 3. Simulate Runtime Request (Blocked - Toxicity)
const runId2 = (0, uuid_1.v4)();
console.log(`\n--- Simulating Runtime Request 2 (Toxic) [RunID: ${runId2}] ---`);
const context2 = {
    stage: 'runtime',
    tenantId: 'internal-tenant',
    payload: {
        prompt: { text: "I hate you", toxicity: 0.95 },
        tool: "calculator"
    },
    metadata: { runId: runId2 }
};
const decision2 = index_js_1.governance.check(context2);
console.log('Decision:', decision2.action, decision2.reasons);
// Note: violation is auto-logged by governance.check
// 4. Simulate Runtime Request (Blocked - Tool)
const runId3 = (0, uuid_1.v4)();
console.log(`\n--- Simulating Runtime Request 3 (Bad Tool) [RunID: ${runId3}] ---`);
const context3 = {
    stage: 'runtime',
    tenantId: 'external-tenant',
    payload: {
        prompt: { text: "Run this command", toxicity: 0.1 },
        tool: "system_shell"
    },
    metadata: { runId: runId3 }
};
const decision3 = index_js_1.governance.check(context3);
console.log('Decision:', decision3.action, decision3.reasons);
// 5. Simulate Data Ingestion (Escalated)
const runId4 = (0, uuid_1.v4)();
console.log(`\n--- Simulating Data Ingestion [RunID: ${runId4}] ---`);
const context4 = {
    stage: 'data',
    tenantId: 'internal-tenant',
    payload: {
        metadata: { has_pii: true, source: "leaked_db" }
    },
    metadata: { runId: runId4 }
};
const decision4 = index_js_1.governance.check(context4);
console.log('Decision:', decision4.action, decision4.reasons);
// 6. Verify Graph
console.log(`\n--- Verifying Telemetry Graph ---`);
const stats = index_js_1.governance.getGraphStats();
console.log('Graph Stats:', stats);
const trace2 = index_js_1.governance.getTrace(runId2);
console.log(`Trace for Run ${runId2} (Toxic):`, trace2.map(e => ({ kind: e.kind, decision: e.details?.decision?.action })));
// 7. Output Result for Verification
const result = {
    policies_loaded: policies.length,
    tests: [
        { name: "Safe Request", expected: "ALLOW", actual: decision1.action },
        { name: "Toxic Request", expected: "DENY", actual: decision2.action },
        { name: "Bad Tool", expected: "DENY", actual: decision3.action },
        { name: "PII Data", expected: "ESCALATE", actual: decision4.action }
    ],
    graph_nodes: stats.nodeCount
};
console.log('\nFinal Result:', JSON.stringify(result, null, 2));
// Save benchmark results as per prompt
fs.writeFileSync('benchmark/governance_results.json', JSON.stringify(result, null, 2));
