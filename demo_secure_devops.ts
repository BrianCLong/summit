
import { AgentFactory } from './server/src/products/SecureDevOpsFactory/AgentFactory.js';

const runDemo = async () => {
    const factory = new AgentFactory();

    console.log('\n--- SecureDevOps Factory Demo ---\n');

    // Scenario 1: Safe PR
    console.log('Scenario 1: Submitting Safe PR...');
    const safeResult = await factory.spawnAgentSwarm('PR-SAFE-001', 'const x = 10; return x * 2;');
    console.log('Result:', {
        status: safeResult.deploymentStatus,
        resistance: safeResult.aggregateResistance,
        findings: safeResult.agentResults.flatMap(r => r.findings)
    });

    console.log('\n---------------------------------\n');

    // Scenario 2: Vulnerable PR
    console.log('Scenario 2: Submitting Vulnerable PR...');
    const unsafeResult = await factory.spawnAgentSwarm('PR-RISK-999', 'const user = getInput(); eval(user);');
    console.log('Result:', {
        status: unsafeResult.deploymentStatus,
        resistance: unsafeResult.aggregateResistance,
        findings: unsafeResult.agentResults.flatMap(r => r.findings)
    });

    console.log('\n--- Demo Complete ---\n');
};

runDemo().catch(console.error);
