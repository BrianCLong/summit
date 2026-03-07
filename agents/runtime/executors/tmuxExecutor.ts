import { spawn } from 'child_process';
import { Executor, Task, TaskResult } from '../schema.js';

export class TmuxExecutor implements Executor {
  constructor(private sessionName: string) {}

  async spawnWorker(workerId: string, command: string[]): Promise<{ stdout: string; stderr: string; code: number | null }> {
    return new Promise((resolve, reject) => {
      // Create a tmux pane running the specified command natively (no shell interpolation)
      // tmux new-window -t sessionName -n workerId command...
      const args = ['new-window', '-P', '-F', '#{pane_id}', '-t', this.sessionName, '-n', workerId, ...command];

      const proc = spawn('tmux', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false, // Critical to prevent shell injection
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({ stdout, stderr, code });
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });
  }

  async execute(tasks: Task[]): Promise<TaskResult[]> {
    const results: TaskResult[] = [];
    let i = 1;
    for (const task of tasks) {
      const workerId = `worker${i++}`;
      const start = Date.now();
      try {
        const result = await this.spawnWorker(workerId, task.command);
        results.push({
          taskId: task.taskId,
          ok: result.code === 0,
          rc: result.code ?? -1,
          stdout: result.stdout.trim(),
          stderr: result.stderr.trim(),
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
    }
    return results;
  }
}
