"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
process.env.DATABASE_URL = 'postgresql://invalid:invalid@localhost:5432/invalid';
process.env.NEO4J_URI = 'bolt://127.0.0.1:8888';
process.env.NODE_ENV = 'test';
const pg_1 = require("pg");
// @ts-ignore
pg_1.Pool.prototype.connect = async function () {
    return {
        query: async () => ({ rows: [] }),
        release: () => { },
        on: () => { }
    };
};
// @ts-ignore
pg_1.Pool.prototype.query = async function () {
    return { rows: [] };
};
// @ts-ignore
pg_1.Pool.prototype.on = function () { return this; };
const client_js_1 = require("../../conductor/mcp/client.js");
const core_js_1 = require("../core.js");
const client_js_2 = require("../../intelgraph/client.js");
const cost_meter_js_1 = require("../cost_meter.js");
const llm_openai_js_1 = require("../adapters/llm_openai.js");
const narrative_server_js_1 = require("../../conductor/mcp/servers/narrative-server.js");
const neo4j_loader_js_1 = require("../../narrative/adapters/neo4j-loader.js");
const governance_service_js_1 = require("../governance-service.js");
async function testSimulationRunner() {
    node_fs_1.default.appendFileSync('/tmp/verify_out.txt', 'SCRIPT STARTING...\n');
    console.log('--- SCRIPT STARTING ---');
    console.log('--- Mocking Neo4j Loader ---');
    neo4j_loader_js_1.Neo4jNarrativeLoader.loadFromGraph = async () => [
        {
            id: 'node-123',
            name: 'Mock Entity',
            type: 'actor',
            alignment: 'neutral',
            influence: 0.5,
            resilience: 0.5,
            sentiment: 0,
            volatility: 0,
            themes: { 'Security': 0.8, 'Trust': 0.5 },
            relationships: []
        }
    ];
    console.log('--- Mocking Governance ---');
    governance_service_js_1.agentGovernance.evaluateAction = async () => ({
        allowed: true,
        reason: 'Mocked governance decision',
        riskScore: 0,
        violations: []
    });
    console.log('--- Manual MCP Registration ---');
    const narrativeServer = new narrative_server_js_1.NarrativeMCPServer();
    client_js_1.mcpRegistry.register('narrative', {
        url: 'local://narrative',
        transport: 'local',
        name: 'narrative',
        authToken: 'test-token',
        tools: narrative_server_js_1.NarrativeMCPServer.tools
    });
    (0, client_js_1.initializeMCPClient)();
    client_js_1.mcpClient.registerLocalServer('narrative', (req) => narrativeServer.handleRequest(req));
    // Implementation for Maestro
    const ig = new client_js_2.IntelGraphClientImpl();
    const costMeter = new cost_meter_js_1.CostMeter(ig, {
        'openai:gpt-4': { inputPer1K: 0.03, outputPer1K: 0.06 }
    });
    const llm = new llm_openai_js_1.OpenAILLM('fake-key', costMeter);
    // Mock llm.callCompletion to simulate tool calling multiple tools
    llm.callCompletion = async (runId, taskId, params) => {
        return {
            content: 'I will run a simulation, inject an event, and then check the state.',
            tool_calls: [
                {
                    id: 'call_1',
                    type: 'function',
                    function: {
                        name: 'narrative.simulate',
                        arguments: JSON.stringify({ rootId: 'node-123', ticks: 1 })
                    }
                },
                {
                    id: 'call_2',
                    type: 'function',
                    function: {
                        name: 'narrative.inject',
                        arguments: JSON.stringify({
                            simulationId: '66cc8f0c-9cad-4520-8faf-88c26f892f05', // We'll assume it exists or use a real one from previous call if we wanted to be fancy, but local storage will keep it.
                            actorId: 'node-123',
                            description: 'A major leak occurs.'
                        })
                    }
                }
            ]
        };
    };
    const maestro = new core_js_1.Maestro(ig, costMeter, llm, {
        defaultPlannerAgent: 'openai:gpt-4',
        defaultActionAgent: 'openai:gpt-4'
    });
    console.log('--- Executing Task ---');
    const task = {
        id: 'task-1',
        runId: 'run-1',
        tenantId: 'tenant-1',
        description: 'Verify the impact of spreading a counter-narrative.',
        kind: 'action',
        agent: { id: 'agent-1', name: 'analyst', kind: 'llm', modelId: 'openai:gpt-4' },
        input: { tenantId: 'tenant-1' },
        status: 'queued',
        output: {}
    };
    const result = await maestro.executeTask(task);
    node_fs_1.default.appendFileSync('/tmp/verify_out.txt', `TASK COMPLETED: ${result.task.status}\n`);
    console.log('--- Task Result ---');
    console.log('Status:', result.task.status);
    if (result.task.status === 'failed') {
        console.log('Error Message:', result.task.errorMessage);
    }
    const resultStr = result.task.output?.result;
    console.log('Output Result:', resultStr);
    if (resultStr && resultStr.includes('tool_results') && resultStr.includes('narrative.simulate')) {
        console.log('SUCCESS: Agent called the simulation tool!');
        node_fs_1.default.appendFileSync('/tmp/verify_out.txt', 'SUCCESS: Tool called\n');
    }
    else {
        console.log('FAILURE: Agent did not call the tool correctly.');
        node_fs_1.default.appendFileSync('/tmp/verify_out.txt', 'FAILURE: Tool not called\n');
    }
    process.exit(0);
}
testSimulationRunner().catch(err => {
    node_fs_1.default.appendFileSync('/tmp/verify_out.txt', `ERROR: ${err.message}\n`);
    console.error(err);
    process.exit(1);
});
