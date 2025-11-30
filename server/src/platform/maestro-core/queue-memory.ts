import { Task, TaskQueue, TaskPriority } from './types.js';

export class InMemoryTaskQueue implements TaskQueue {
  private tasks: Map<string, Task> = new Map();
  private queue: Task[] = [];

  async enqueue(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'attemptCount' | 'status'>): Promise<Task> {
    const task: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      status: 'PENDING',
      attemptCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tasks.set(task.id, task);
    this.queue.push(task);
    this.sortQueue();
    return task;
  }

  async dequeue(workerTypes: string[]): Promise<Task | null> {
    // Simple filter and find first logic
    const index = this.queue.findIndex(t => workerTypes.includes(t.type) && t.status === 'PENDING');
    if (index === -1) return null;

    const task = this.queue[index];
    this.queue.splice(index, 1);

    task.status = 'RUNNING';
    task.updatedAt = new Date();
    this.tasks.set(task.id, task);

    return task;
  }

  async ack(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = 'COMPLETED';
      task.updatedAt = new Date();
    }
  }

  async nack(taskId: string, error?: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.attemptCount++;
    task.lastError = error;
    task.updatedAt = new Date();

    if (task.attemptCount >= task.maxAttempts) {
      task.status = 'FAILED';
    } else {
      task.status = 'PENDING';
      // Basic backoff simulation (not real delay here, just re-queue)
      this.queue.push(task);
      this.sortQueue();
    }
  }

  async get(taskId: string): Promise<Task | null> {
    return this.tasks.get(taskId) || null;
  }

  private sortQueue() {
    // Sort by Priority (Critical first) then Creation Time
    const priorityMap: Record<TaskPriority, number> = {
      'CRITICAL': 0,
      'HIGH': 1,
      'NORMAL': 2,
      'LOW': 3
    };

    this.queue.sort((a, b) => {
      const pA = priorityMap[a.priority];
      const pB = priorityMap[b.priority];
      if (pA !== pB) return pA - pB;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }
}
