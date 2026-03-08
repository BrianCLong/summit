"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const src_1 = require("../../../packages/connector-sdk/src");
const src_2 = require("../../../packages/mandates/src");
const src_3 = require("../../../packages/integration-twin/src");
const index_1 = require("./index");
// Mock Jira Connector
class JiraConnector extends src_1.ActionConnector {
    manifest = {
        id: 'jira-connector',
        name: 'Jira Connector',
        version: '1.0.0',
        description: 'Mock Jira Connector',
        status: 'stable',
        category: 'productivity',
        capabilities: ['action'],
        entityTypes: [],
        relationshipTypes: [],
        authentication: ['api-key'],
        configSchema: {},
        requiredSecrets: [],
        license: 'MIT',
        maintainer: 'Summit'
    };
    async testConnection() { return { success: true, message: 'Connected' }; }
    async getTools() {
        return [{
                name: 'createTicket',
                description: 'Creates a Jira ticket',
                inputSchema: { type: 'object', properties: { summary: { type: 'string' } } }
            }];
    }
    async implementExecute(toolName, args, context) {
        console.log(`[JiraConnector] Executing ${toolName} with args:`, args);
        return { id: 'JIRA-123', summary: args.summary, status: 'Open' };
    }
    async dryRun(toolName, args, context) {
        return {
            description: `Create ticket '${args.summary}'`,
            changes: [{
                    path: 'tickets/new',
                    newValue: { summary: args.summary },
                    type: 'create'
                }],
            riskLevel: 'low'
        };
    }
}
async function main() {
    console.log('--- Starting Integration Gateway Demo ---');
    // 1. Setup
    const mandates = new src_2.MandateService();
    const registry = new index_1.ToolRegistry();
    const twin = new src_3.IntegrationTwin();
    const gateway = new index_1.Gateway(registry, mandates, twin);
    const jira = new JiraConnector();
    await jira.initialize({
        config: {},
        secrets: {},
        tenantId: 'tenant-1'
    });
    await registry.registerConnector(jira);
    // 2. Issue Mandate
    console.log('\n--- Issuing Mandate ---');
    const mandate = mandates.createMandate('user-1', 'Allow creating tickets', [{ type: 'intent', value: 'createTicket' }], { maxSpend: 100 });
    console.log('Mandate issued:', mandate.id);
    // 3. Dry Run
    console.log('\n--- Requesting Dry Run ---');
    const dryRunResult = await gateway.dryRun(mandate.id, 'createTicket', { summary: 'Fix the login bug' });
    console.log('Dry Run Result:', JSON.stringify(dryRunResult, null, 2));
    if (!dryRunResult.allowed) {
        console.error('Dry Run failed:', dryRunResult.reason);
        return;
    }
    // 4. Execution
    console.log('\n--- Executing Action ---');
    const execResult = await gateway.execute(mandate.id, 'createTicket', { summary: 'Fix the login bug' });
    console.log('Execution Result:', execResult);
    // 5. Verification (Negative Test)
    console.log('\n--- Testing Unauthorized Action ---');
    const execResultFail = await gateway.execute(mandate.id, 'deleteTicket', { id: 'JIRA-123' });
    console.log('Execution Result (Expected Failure):', execResultFail);
    console.log('\n--- Demo Complete ---');
}
main().catch(console.error);
