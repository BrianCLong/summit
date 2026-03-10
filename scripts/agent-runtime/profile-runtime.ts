import { runGoal } from '../../agents/runtime/controller.js';

async function main() {
  const start = Date.now();
  try {
    await runGoal({
      goalId: 'perf-test-01',
      prompt: 'profile performance',
      mode: 'tmux'
    });
    const duration = Date.now() - start;
    console.log(`Profiling complete in ${duration}ms`);
  } catch (error) {
    console.error('Profiling error:', error);
    process.exit(1);
  }
}

main();
