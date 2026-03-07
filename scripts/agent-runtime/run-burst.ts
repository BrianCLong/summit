import { runGoal } from '../../agents/runtime/controller.js';

async function main() {
  const prompt = process.argv.slice(2).join(' ') || 'default burst test goal';
  try {
    const result = await runGoal({
      goalId: 'burst-test-01',
      prompt,
      mode: 'burst'
    });
    console.log('Successfully ran burst mode', result.evidencePrefix);
  } catch (error) {
    console.error('Error running burst goal:', error);
    process.exit(1);
  }
}

main();
