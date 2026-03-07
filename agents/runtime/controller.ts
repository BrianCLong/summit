import { RuntimeGoal, TaskResult } from './schema.js';
import { buildDeterministicPlan, stableId } from './planner.js';
import { writeDeterministicJson, hashObject } from './artifacts.js';
import { config } from './config.js';
import { spawnTmuxWorker } from './executors/tmuxExecutor.js';
import { executeBurst } from './executors/burstExecutor.js';
import { aggregateResults, buildStamp } from './merge/aggregator.js';
import { redactSecrets } from './redaction.js';
import { join } from 'path';

export async function runGoal(goal: RuntimeGoal) {
  const plan = await buildDeterministicPlan(goal);
  const planHash = hashObject(plan);

  const runId = stableId(goal.prompt + Date.now().toString());
  const runDir = join(config.runDir, runId);
  const evidencePrefix = `SUMMIT-MAR-${goal.goalId}`;

  writeDeterministicJson(join(runDir, 'plan.json'), plan);

  let results: TaskResult[] = [];

  if (goal.mode === 'burst') {
    if (!config.multiAgentBurstEnabled) {
      throw new Error('MULTI_AGENT_BURST_DISABLED');
    }
    results = await executeBurst(plan);
  } else {
    // defaults to tmux mode
    const sessionName = `agents_${runId.substring(0, 6)}`;
    // Just simulating the spawn for now since we don't have tmux installed in CI
    const spawnPromises = plan.map((task, idx) => {
      const workerId = `worker${idx}`;
      return spawnTmuxWorker(sessionName, workerId, task.command);
    });
    const tmuxResults = await Promise.all(spawnPromises);
    results = plan.map((task, idx) => {
      const execResult = tmuxResults[idx];
      return {
        taskId: task.taskId,
        ok: execResult.exitCode === 0,
        rc: execResult.exitCode || 0,
        stdout: execResult.stdout || '',
        stderr: execResult.stderr || '',
        startedAt: 0,
        endedAt: 0,
        workerId: `worker${idx}`,
        attempt: 1
      };
    });
  }

  // Redact secrets
  results = results.map(r => ({
    ...r,
    stdout: redactSecrets(r.stdout),
    stderr: redactSecrets(r.stderr),
  }));

  const report = aggregateResults(goal, plan, results);
  const stamp = buildStamp(planHash, hashObject(config));

  writeDeterministicJson(join(runDir, 'report.json'), report);
  writeDeterministicJson(join(runDir, 'stamp.json'), stamp);

  return { plan, report, stamp, evidencePrefix };
}
