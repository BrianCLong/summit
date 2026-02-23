import { AgentGovernanceService } from './src/maestro/governance-service.js';
import { MaestroAgent } from './src/maestro/model.js';

async function test() {
    console.log('Starting AgentGovernanceService test...');
    try {
        const gov = AgentGovernanceService.getInstance();
        console.log('Got instance');

        const agent: MaestroAgent = {
            id: 'test-agent',
            tenantId: 'system',
            name: 'Test Agent',
            capabilities: ['data-query'],
            templateId: 'tpl-1',
            config: {},
            metadata: {}
        };

        const decision = await gov.evaluateAction(agent, 'data-query', { tenantId: 'system' });
        console.log('Decision:', JSON.stringify(decision, null, 2));
    } catch (err) {
        console.error('Test failed:', err);
    }
}

test();
