import { runGoal } from '../../agents/runtime/controller.js';
import { BurstExecutor } from '../../agents/runtime/executors/burstExecutor.js';
import { config } from '../../agents/runtime/config.js';

async function main() {
  const goalPrompt = process.argv[2] || 'build example API';
  const goal = { goalId: `run-${Date.now()}`, prompt: goalPrompt, mode: 'burst' as const };

  console.log(`Starting goal in burst mode: ${goal.prompt}`);
  const { plan, evidencePrefix } = await runGoal(goal);

  console.log(`Plan generated with ${plan.length} tasks. Prefix: ${evidencePrefix}`);

  // Example only: enable burst
  config.multiAgentBurstEnabled = true;

  const executor = new BurstExecutor();
  const results = await executor.execute(plan);

  console.log(`Execution finished. ${results.filter(r => r.ok).length} queued for burst execution.`);
}

main().catch(console.error);
