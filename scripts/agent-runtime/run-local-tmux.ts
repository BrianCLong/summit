import { runGoal } from '../../agents/runtime/controller.js';

async function main() {
  const prompt = process.argv.slice(2).join(' ') || 'default local test goal';
  try {
    const result = await runGoal({
      goalId: 'local-test-01',
      prompt,
      mode: 'tmux'
    });
    console.log('Successfully ran local tmux mode', result.evidencePrefix);
  } catch (error) {
    console.error('Error running local goal:', error);
    process.exit(1);
  }
}

main();
