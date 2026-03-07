import { RuntimeGoal, TaskResult } from './schema.js';
import { buildDeterministicPlan } from './planner.js';
import { buildEvidencePrefix, writeArtifacts, buildStamp } from './artifacts.js';

export async function runGoal(goal: RuntimeGoal): Promise<{ plan: any; evidencePrefix: string }> {
  const plan = await buildDeterministicPlan(goal);
  const evidencePrefix = buildEvidencePrefix(goal.goalId);

  // Example persistence hook for the full end-to-end plan loop. In a full system
  // this would gather the execution results and metrics too.
  await writeArtifacts(goal.goalId, {
    plan,
    report: {},
    metrics: {},
    stamp: buildStamp('dummy-plan-hash', 'dummy-config-hash')
  });

  return { plan, evidencePrefix };
}
