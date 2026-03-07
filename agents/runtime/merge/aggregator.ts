import { TaskResult } from '../schema.js';
import { redactSecrets } from '../redaction.js';

export function aggregateResults(results: TaskResult[]): any[] {
  // Sort results deterministically by taskId to ensure stable merging
  const sorted = [...results].sort((a, b) => a.taskId.localeCompare(b.taskId));

  return sorted.map(res => ({
    ...res,
    // Exclude unstable timestamps for deterministic verification
    startedAt: undefined,
    endedAt: undefined,
    durationMs: res.endedAt - res.startedAt,
    // Scrub secrets from stdout and stderr
    stdout: redactSecrets(res.stdout),
    stderr: redactSecrets(res.stderr)
  }));
}
