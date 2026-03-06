/**
 * Collection Queue - Priority queue for managing collection tasks
 */

import { EventEmitter } from 'events';
import type { CollectionTask, TaskStatus } from '../types/index.js';

export class CollectionQueue extends EventEmitter {
  private queue: CollectionTask[] = [];
  private processing: Map<string, CollectionTask> = new Map();
  private maxConcurrent: number;
  private currentWorkers: number = 0;

  constructor(maxConcurrent: number = 5) {
    super();
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Add a task to the queue
   */
  enqueue(task: CollectionTask): void {
    task.status = 'pending' as TaskStatus;
    this.queue.push(task);
    this.sortQueue();
    this.emit('task:enqueued', task);
    this.processNext();
  }

  /**
   * Add multiple tasks to the queue
   */
  enqueueBatch(tasks: CollectionTask[]): void {
    for (const task of tasks) {
      task.status = 'pending' as TaskStatus;
      this.queue.push(task);
    }
    this.sortQueue();
    this.emit('batch:enqueued', { count: tasks.length });
    this.processNext();
  }

  /**
   * Get next task from queue
   */
  private dequeue(): CollectionTask | undefined {
    return this.queue.shift();
  }

  /**
   * Process next task if workers available
   */
  private processNext(): void {
    if (this.currentWorkers >= this.maxConcurrent) {
      return;
    }

    const task = this.dequeue();
    if (!task) {
      return;
    }

    this.currentWorkers++;
    task.status = 'in_progress' as TaskStatus;
    this.processing.set(task.id, task);
    this.emit('task:processing', task);
  }

  /**
   * Mark task as completed
   */
  completeTask(taskId: string): void {
    const task = this.processing.get(taskId);
    if (task) {
      task.status = 'completed' as TaskStatus;
      this.processing.delete(taskId);
      this.currentWorkers--;
      this.emit('task:completed', task);
      this.processNext();
    }
  }

  /**
   * Mark task as failed
   */
  failTask(taskId: string, error: Error): void {
    const task = this.processing.get(taskId);
    if (task) {
      task.status = 'failed' as TaskStatus;
      this.processing.delete(taskId);
      this.currentWorkers--;
      this.emit('task:failed', { task, error: error.message });
      this.processNext();
    }
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    pending: number;
    processing: number;
    workers: number;
    maxConcurrent: number;
  } {
    return {
      pending: this.queue.length,
      processing: this.processing.size,
      workers: this.currentWorkers,
      maxConcurrent: this.maxConcurrent
    };
  }

  /**
   * Clear all tasks
   */
  clear(): void {
    this.queue = [];
    this.emit('queue:cleared');
  }

  /**
   * Sort queue by priority (highest first)
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Set max concurrent workers
   */
  setMaxConcurrent(max: number): void {
    this.maxConcurrent = max;
    this.processNext();
  }
}
