import { Task } from '../types.js';

export class TaskGraph {
  private tasks: Map<string, Task> = new Map();

  addTask(task: Task) {
    this.tasks.set(task.id, task);
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  getReadyTasks(): Task[] {
    const ready: Task[] = [];
    for (const task of this.tasks.values()) {
      if (task.status === 'pending') {
        const isBlocked = task.blockedBy.some(depId => {
          const dep = this.tasks.get(depId);
          // If dependency is missing, we assume it's not completed, so blocked.
          // Or should we assume unblocked? Safety says blocked.
          return !dep || dep.status !== 'completed';
        });
        if (!isBlocked) {
          ready.push(task);
        }
      }
    }
    // Deterministic sort by ID
    return ready.sort((a, b) => a.id.localeCompare(b.id));
  }

  completeTask(taskId: string, timestamp: string) {
      const task = this.tasks.get(taskId);
      if (task) {
          task.status = 'completed';
          task.timestamps.completed = timestamp;
      }
  }

  startTask(taskId: string, owner: string, timestamp: string) {
      const task = this.tasks.get(taskId);
      if (task && task.status === 'pending') {
          task.status = 'in_progress';
          task.owner = owner;
          task.timestamps.started = timestamp;
      }
  }
}
