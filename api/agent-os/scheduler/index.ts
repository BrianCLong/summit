import type { TaskGraph, TaskNode } from '../planner/task-graph';

export interface AgentLease {
  taskId: string;
  workerId: string;
  expiresAt: number;
}

export class Scheduler {
  private queue: TaskNode[] = [];
  private leases: Map<string, AgentLease> = new Map();

  enqueueGraph(graph: TaskGraph) {
    this.queue.push(...graph.nodes);
  }

  leaseTask(workerId: string): TaskNode | null {
    const task = this.queue.shift();
    if (task) {
      this.leases.set(task.id, {
        taskId: task.id,
        workerId,
        expiresAt: Date.now() + 300000 // 5 minutes
      });
      return task;
    }
    return null;
  }

  completeTask(taskId: string) {
    this.leases.delete(taskId);
  }
}
