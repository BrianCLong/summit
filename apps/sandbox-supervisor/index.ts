import type { TaskNode } from '../../api/agent-os/planner/task-graph';

export interface SandboxOptions {
  repoSnapshot: string;
  networkEnabled: boolean;
  maxMemoryMB: number;
}

export class SandboxSupervisor {
  async execute(task: TaskNode, options: SandboxOptions): Promise<void> {
    // This is where Firecracker / Docker execution would actually occur.
    // For MVP, we simulate sandboxed execution.
    if (options.maxMemoryMB < 512 && task.budgetClass === 'l') {
      throw new Error('Insufficient budget for task');
    }
  }
}
