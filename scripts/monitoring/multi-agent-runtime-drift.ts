import { runGoal } from '../../agents/runtime/controller.js';
import { hashObject } from '../../agents/runtime/artifacts.js';

async function detectDrift() {
  console.log('Running drift detection baseline...');
  const res1 = await runGoal({ goalId: 'drift-01', prompt: 'test drift', mode: 'tmux' });
  const hash1 = hashObject(res1.plan);

  console.log('Running drift detection comparison...');
  const res2 = await runGoal({ goalId: 'drift-02', prompt: 'test drift', mode: 'tmux' });
  const hash2 = hashObject(res2.plan);

  if (hash1 !== hash2) {
    console.error('DRIFT DETECTED: Plans are not deterministic for the same input!');
    process.exitCode = 1;
  } else {
    console.log('No drift detected. Plans are stable.');
    process.exitCode = 0;
  }
}

detectDrift();
