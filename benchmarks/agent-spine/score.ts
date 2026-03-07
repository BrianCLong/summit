import { SpineTask } from './schema';

export function scoreTask(task: SpineTask): { score: number; passed: boolean } {
  const passed = task.expected_evidence.length > 0;
  const score = passed ? 1 : 0;
  return { score, passed };
}
