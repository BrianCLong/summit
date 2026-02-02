import fs from 'node:fs';
process.env.DATABASE_URL = 'postgresql://invalid:invalid@localhost:5432/invalid';
process.env.NEO4J_URI = 'bolt://127.0.0.1:8888';
process.env.NODE_ENV = 'test';

import { Pool } from 'pg';
// @ts-ignore
Pool.prototype.connect = async function () {
    return {
        query: async () => ({ rows: [] }),
        release: () => { },
        on: () => { }
    };
};
// @ts-ignore
Pool.prototype.query = async function () {
    return { rows: [] };
};
// @ts-ignore
Pool.prototype.on = function () { return this; };

import { mcpRegistry, mcpClient, initializeMCPClient } from '../../conductor/mcp/client.js';
import { Maestro } from '../core.js';
import { IntelGraphClientImpl } from '../../intelgraph/client.js';
import { CostMeter } from '../cost_meter.js';
import { OpenAILLM } from '../adapters/llm_openai.js';
import { NarrativeMCPServer } from '../../conductor/mcp/servers/narrative-server.js';
import { Neo4jNarrativeLoader } from '../../narrative/adapters/neo4j-loader.js';
import { agentGovernance } from '../governance-service.js';

async function testSimulationRunner() {
    fs.appendFileSync('/tmp/verify_out.txt', 'SCRIPT STARTING...\n');
    console.log('--- SCRIPT STARTING ---');

    console.log('--- Mocking Neo4j Loader ---');
    (Neo4jNarrativeLoader as any).loadFromGraph = async () => [
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
    (agentGovernance as any).evaluateAction = async () => ({
        allowed: true,
        reason: 'Mocked governance decision',
        riskScore: 0,
        violations: []
    });

    console.log('--- Manual MCP Registration ---');

    const narrativeServer = new NarrativeMCPServer();
    mcpRegistry.register('narrative', {
        url: 'local://narrative',
        transport: 'local',
        name: 'narrative',
        authToken: 'test-token',
        tools: NarrativeMCPServer.tools
    });

    initializeMCPClient();
    mcpClient.registerLocalServer('narrative', (req) => narrativeServer.handleRequest(req));

    // Implementation for Maestro
    const ig = new IntelGraphClientImpl();
    const costMeter = new CostMeter(ig as any, {
        'openai:gpt-4': { inputPer1K: 0.03, outputPer1K: 0.06 }
    });
    const llm = new OpenAILLM('fake-key', costMeter);

    // Mock llm.callCompletion to simulate tool calling multiple tools
    (llm as any).callCompletion = async (runId: string, taskId: string, params: any) => {
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

    const maestro = new Maestro(ig as any, costMeter, llm, {
        defaultPlannerAgent: 'openai:gpt-4',
        defaultActionAgent: 'openai:gpt-4'
    } as any);

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

    const result = await maestro.executeTask(task as any);
    fs.appendFileSync('/tmp/verify_out.txt', `TASK COMPLETED: ${result.task.status}\n`);

    console.log('--- Task Result ---');
    console.log('Status:', result.task.status);
    if (result.task.status === 'failed') {
        console.log('Error Message:', result.task.errorMessage);
    }

    const resultStr = result.task.output?.result;
    console.log('Output Result:', resultStr);

    if (resultStr && resultStr.includes('tool_results') && resultStr.includes('narrative.simulate')) {
        console.log('SUCCESS: Agent called the simulation tool!');
        fs.appendFileSync('/tmp/verify_out.txt', 'SUCCESS: Tool called\n');
    } else {
        console.log('FAILURE: Agent did not call the tool correctly.');
        fs.appendFileSync('/tmp/verify_out.txt', 'FAILURE: Tool not called\n');
    }

    process.exit(0);
}

testSimulationRunner().catch(err => {
    fs.appendFileSync('/tmp/verify_out.txt', `ERROR: ${err.message}\n`);
    console.error(err);
    process.exit(1);
});
