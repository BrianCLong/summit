import { runGoal } from '../../agents/runtime/controller.js';
import * as crypto from 'crypto';

function hashPlan(plan: any[]): string {
  const json = JSON.stringify(plan, Object.keys(plan).sort());
  return crypto.createHash('sha256').update(json).digest('hex');
}

async function checkDrift() {
  console.log('Running drift detection check for multi-agent-runtime...');

  // Baseline goal
  const goal = { goalId: 'drift-test-1', prompt: 'verify stability of plan generation', mode: 'burst' as const };

  // Run 1
  const result1 = await runGoal(goal);
  const hash1 = hashPlan(result1.plan);

  // Run 2
  const result2 = await runGoal(goal);
  const hash2 = hashPlan(result2.plan);

  if (hash1 !== hash2) {
    console.error(`DRIFT DETECTED: ${hash1} !== ${hash2}`);
    process.exit(1);
  } else {
    console.log('SUCCESS: Plan generation is deterministic and stable.');
    process.exit(0);
  }
}

checkDrift().catch(console.error);
