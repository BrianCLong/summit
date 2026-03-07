import { runGoal } from '../../agents/runtime/controller.js';
import { TmuxExecutor } from '../../agents/runtime/executors/tmuxExecutor.js';

async function main() {
  const goalPrompt = process.argv[2] || 'build example API';
  const goal = { goalId: `run-${Date.now()}`, prompt: goalPrompt, mode: 'tmux' as const };

  console.log(`Starting goal: ${goal.prompt}`);
  const { plan, evidencePrefix } = await runGoal(goal);

  console.log(`Plan generated with ${plan.length} tasks. Prefix: ${evidencePrefix}`);

  const executor = new TmuxExecutor('agents10');
  const results = await executor.execute(plan);

  console.log(`Execution finished. ${results.filter(r => r.ok).length} succeeded.`);
}

main().catch(console.error);
