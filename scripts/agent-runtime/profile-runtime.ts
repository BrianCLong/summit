import { runGoal } from '../../agents/runtime/controller.js';

async function main() {
  const goal = { goalId: 'profile-goal-1', prompt: 'test performance benchmarking', mode: 'tmux' as const };

  const start = Date.now();
  const result = await runGoal(goal);
  const end = Date.now();

  console.log(`Profiling completed in ${end - start} ms`);
  console.log(`Plan size: ${result.plan.length} tasks`);
}

main().catch(console.error);
