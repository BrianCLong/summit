import { Executor, Task, TaskResult } from '../schema.js';
import { config } from '../config.js';
import { spawn } from 'child_process';

export class BurstExecutor implements Executor {
  async execute(tasks: Task[]): Promise<TaskResult[]> {
    if (!config.multiAgentBurstEnabled) {
      throw new Error('MULTI_AGENT_BURST_DISABLED');
    }

    const results: TaskResult[] = [];
    const promises = tasks.map(async (task, idx) => {
      const workerId = `burst-worker-${idx + 1}`;
      const start = Date.now();
      try {
        const { stdout, stderr, code } = await new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve, reject) => {
          const proc = spawn(task.command[0], task.command.slice(1), { shell: false });
          let out = '';
          let err = '';
          proc.stdout.on('data', d => out += d.toString());
          proc.stderr.on('data', d => err += d.toString());
          proc.on('close', c => resolve({ stdout: out, stderr: err, code: c }));
          proc.on('error', e => reject(e));
        });

        results.push({
          taskId: task.taskId,
          ok: code === 0,
          rc: code ?? -1,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          startedAt: start,
          endedAt: Date.now(),
          workerId,
          attempt: task.retries + 1
        });
      } catch (e: any) {
        results.push({
          taskId: task.taskId,
          ok: false,
          rc: 1,
          stdout: '',
          stderr: e.message,
          startedAt: start,
          endedAt: Date.now(),
          workerId,
          attempt: task.retries + 1
        });
      }
    });

    await Promise.all(promises);
    return results;
  }
}
