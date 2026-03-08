import { Task, TaskResult } from '../schema.js';
import { config } from '../config.js';

export async function executeBurst(tasks: Task[]): Promise<TaskResult[]> {
  if (!config.multiAgentBurstEnabled) {
    throw new Error('MULTI_AGENT_BURST_DISABLED');
  }

  // Simulating burst queue execution
  return tasks.map((task, idx) => ({
    taskId: task.taskId,
    ok: true,
    rc: 0,
    stdout: `[BURST] Executed task ${task.taskId}`,
    stderr: '',
    startedAt: Date.now(),
    endedAt: Date.now() + 100,
    workerId: `burst-worker-${idx}`,
    attempt: 1
  }));
}
