import { RuntimeGoal, Task, TaskResult } from '../schema.js';

export function aggregateResults(goal: RuntimeGoal, tasks: Task[], results: TaskResult[]) {
  const ok = results.filter(r => r.ok);
  const failed = results.filter(r => !r.ok);

  const summary = {
    goal: goal.prompt,
    mode: goal.mode,
    taskCount: tasks.length,
    okCount: ok.length,
    failedCount: failed.length,
    results: results.map(r => ({
      taskId: r.taskId,
      workerId: r.workerId,
      ok: r.ok,
      attempt: r.attempt,
      stdout: r.stdout,
      stderr: r.stderr,
      durationSec: r.startedAt && r.endedAt ? Number(((r.endedAt - r.startedAt) / 1000).toFixed(3)) : 0
    }))
  };

  return summary;
}

export function buildStamp(planHash: string, configHash: string) {
  return {
    planHash,
    configHash,
    deterministic: true
  };
}
