import {
  GymRunner,
  BrowserOpsEnvironment,
  SpreadsheetOpsEnvironment,
  MCPToolChainEnvironment,
  Agent,
  Observation,
  Action
} from '@summit/agent-gym';
import { AgentMetrics } from '@summit/agent-gym-metrics';

// Simple heuristic agent
class RandomAgent implements Agent {
  async act(observation: Observation): Promise<Action> {
    const type = observation.type;

    // Simple logic based on env (heuristic)
    if (JSON.stringify(observation.content).includes('dom')) {
      // BrowserOps
      return { type: 'goto', params: { url: 'https://internal.summit.corp/home' } };
    } else if (JSON.stringify(observation.content).includes('sheet')) {
      // SpreadsheetOps
      return { type: 'write_cell', params: { row: 1, col: 1, value: 99.99 } };
    } else {
      // MCPToolChain
      return { type: 'call_tool', params: { tool: 'calculator', args: { a: 5, b: 3, op: 'add' } } };
    }
  }
}

async function runSuite() {
  console.log('Starting Agent Gym Suite...');

  const envs = [
    new BrowserOpsEnvironment(),
    new SpreadsheetOpsEnvironment(),
    new MCPToolChainEnvironment()
  ];

  const agent = new RandomAgent();
  const allResults = [];

  for (const env of envs) {
    console.log(`Running episodes for ${env.name}...`);
    const runner = new GymRunner(env, agent, { maxSteps: 5 });

    // Run 3 episodes per env
    for (let i = 0; i < 3; i++) {
      const result = await runner.runEpisode();
      allResults.push(result);
      console.log(`  Episode ${i+1}: Success=${result.success}, Score=${result.score}`);
    }
  }

  // Calculate Metrics
  const successRate = AgentMetrics.calculateSuccessRate(allResults);
  const avgSteps = AgentMetrics.calculateAverageSteps(allResults);

  // Looping index for all turns
  const allTurns = allResults.flatMap(r => r.turns);
  const looping = AgentMetrics.calculateLoopingIndex(allTurns);

  console.log('\n--- Agent Gym Report ---');
  console.log(`Total Episodes: ${allResults.length}`);
  console.log(`${successRate.name}: ${(successRate.value * 100).toFixed(1)}%`);
  console.log(`${avgSteps.name}: ${avgSteps.value.toFixed(1)}`);
  console.log(`${looping.name}: ${(looping.value * 100).toFixed(1)}%`);

  if (successRate.value < 0.5) {
      console.warn('Warning: Success rate is low (expected for RandomAgent).');
      // In a real scenario, uncomment the following line to enforce the gate:
      // process.exit(1);
  }

  console.log('Done.');
}

runSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
