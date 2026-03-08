"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const node_assert_1 = __importDefault(require("node:assert"));
const run_service_js_1 = require("../../src/maestro/run-service.js");
const workflow_service_js_1 = require("../../src/maestro/workflow-service.js");
(0, globals_1.describe)('Maestro Conductor V2 Flow', () => {
    let cypherCalls = [];
    const mockRunCypher = async (query, params) => {
        cypherCalls.push({ query, params });
        return [{
                w: { properties: { id: params.id, name: 'Workflow 1.0', ...params } },
                r: { properties: { id: params.runId, status: 'PENDING', ...params } }
            }];
    };
    const mockReceiptService = {
        generateReceipt: () => ({
            id: 'rcpt-1',
            digest: 'digest',
            signature: 'sig',
            kid: 'key-1',
            timestamp: new Date().toISOString()
        })
    };
    const mockMeteringService = {
        trackRunUsage: async () => { },
        trackStepUsage: async () => { }
    };
    (0, globals_1.beforeEach)(() => {
        cypherCalls = [];
        workflow_service_js_1.WorkflowService.resetInstance(mockRunCypher);
        run_service_js_1.RunService.resetInstance(mockRunCypher, mockReceiptService, mockMeteringService);
    });
    (0, globals_1.it)('should create a workflow definition', async () => {
        const service = workflow_service_js_1.WorkflowService.getInstance();
        const wf = await service.createDefinition('t1', {
            version: '1.0',
            env: 'prod',
            retentionClass: 'standard',
            costCenter: 'engineering',
            inputSchema: '{}',
            body: 'steps: []'
        });
        node_assert_1.default.ok(wf.id);
        node_assert_1.default.strictEqual(cypherCalls.length, 1);
        node_assert_1.default.match(cypherCalls[0].query, /CREATE \(w:WorkflowDefinition:Entity/);
    });
    (0, globals_1.it)('should create a run with receipt and policy decision', async () => {
        const service = run_service_js_1.RunService.getInstance();
        const run = await service.createRun('t1', 'wf-1', '{}', 'user-1', 'prod');
        node_assert_1.default.ok(run.id);
        node_assert_1.default.strictEqual(run.status, 'PENDING');
        // Verify graph query structure
        const query = cypherCalls[0].query;
        node_assert_1.default.match(query, /CREATE \(r:Run:Entity/);
        node_assert_1.default.match(query, /CREATE \(r\)-\[:DEFINED_BY\]->\(w\)/);
        node_assert_1.default.match(query, /CREATE \(rcpt:Receipt:BaseNode/);
        node_assert_1.default.match(query, /CREATE \(r\)-\[:LOGGED_IN\]->\(rcpt\)/);
        node_assert_1.default.match(query, /CREATE \(pd:PolicyDecision:BaseNode/);
        node_assert_1.default.match(query, /CREATE \(r\)-\[:SUBJECT_TO\]->\(pd\)/);
    });
});
