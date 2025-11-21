/**
 * Worker Pool for distributed task execution
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { AsyncQueue } from '../utils/AsyncQueue.js';
import { generateId } from '../utils/uuid.js';

export interface WorkerConfig {
  workerId: string;
  concurrency: number;
  queues: string[];
  resources?: {
    cpu: number;
    memory: number;
    gpu?: number;
  };
}

export interface WorkerTask {
  taskId: string;
  workflowId: string;
  queue: string;
  priority: number;
  payload: any;
  requiredResources?: {
    cpu?: number;
    memory?: number;
    gpu?: number;
  };
}

export interface Worker {
  workerId: string;
  config: WorkerConfig;
  status: 'idle' | 'busy' | 'offline';
  currentTasks: Set<string>;
  totalTasksExecuted: number;
  lastHeartbeat: Date;
  queue: AsyncQueue;
}

interface WorkerPoolEvents {
  'worker:registered': (worker: Worker) => void;
  'worker:unregistered': (workerId: string) => void;
  'task:assigned': (workerId: string, task: WorkerTask) => void;
  'task:completed': (workerId: string, taskId: string) => void;
  'task:failed': (workerId: string, taskId: string, error: Error) => void;
}

export class WorkerPool extends EventEmitter<WorkerPoolEvents> {
  private workers: Map<string, Worker>;
  private taskQueues: Map<string, WorkerTask[]>;
  private heartbeatInterval: ReturnType<typeof setInterval> | null;
  private heartbeatTimeout: number;

  constructor(config: { heartbeatTimeout?: number } = {}) {
    super();
    this.workers = new Map();
    this.taskQueues = new Map();
    this.heartbeatInterval = null;
    this.heartbeatTimeout = config.heartbeatTimeout || 60000; // 1 minute
  }

  /**
   * Register a worker
   */
  registerWorker(config: WorkerConfig): void {
    const worker: Worker = {
      workerId: config.workerId,
      config,
      status: 'idle',
      currentTasks: new Set(),
      totalTasksExecuted: 0,
      lastHeartbeat: new Date(),
      queue: new AsyncQueue({ concurrency: config.concurrency }),
    };

    this.workers.set(config.workerId, worker);

    // Initialize queues for this worker
    config.queues.forEach(queueName => {
      if (!this.taskQueues.has(queueName)) {
        this.taskQueues.set(queueName, []);
      }
    });

    this.emit('worker:registered', worker);

    // Start heartbeat monitoring
    if (!this.heartbeatInterval) {
      this.startHeartbeatMonitoring();
    }
  }

  /**
   * Unregister a worker
   */
  unregisterWorker(workerId: string): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.status = 'offline';
      this.workers.delete(workerId);
      this.emit('worker:unregistered', workerId);
    }
  }

  /**
   * Update worker heartbeat
   */
  updateHeartbeat(workerId: string): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.lastHeartbeat = new Date();
      if (worker.status === 'offline') {
        worker.status = 'idle';
      }
    }
  }

  /**
   * Submit task to queue
   */
  submitTask(task: WorkerTask): void {
    const queue = this.taskQueues.get(task.queue);
    if (!queue) {
      throw new Error(`Queue ${task.queue} not found`);
    }

    // Insert task in priority order
    const insertIndex = queue.findIndex(t => t.priority < task.priority);
    if (insertIndex === -1) {
      queue.push(task);
    } else {
      queue.splice(insertIndex, 0, task);
    }

    // Try to assign task immediately
    this.assignTasks();
  }

  /**
   * Assign tasks to available workers
   */
  private assignTasks(): void {
    this.taskQueues.forEach((tasks, queueName) => {
      if (tasks.length === 0) return;

      // Find available workers for this queue
      const availableWorkers = Array.from(this.workers.values()).filter(
        worker =>
          worker.config.queues.includes(queueName) &&
          worker.status !== 'offline' &&
          worker.currentTasks.size < worker.config.concurrency
      );

      // Sort workers by load (ascending)
      availableWorkers.sort(
        (a, b) => a.currentTasks.size - b.currentTasks.size
      );

      // Assign tasks to workers
      for (const worker of availableWorkers) {
        if (tasks.length === 0) break;

        const availableSlots = worker.config.concurrency - worker.currentTasks.size;
        if (availableSlots === 0) continue;

        // Check resource availability
        const task = tasks[0];
        if (!this.hasAvailableResources(worker, task)) {
          continue;
        }

        // Assign task
        const assignedTask = tasks.shift()!;
        this.assignTaskToWorker(worker, assignedTask);
      }
    });
  }

  /**
   * Check if worker has available resources for task
   */
  private hasAvailableResources(worker: Worker, task: WorkerTask): boolean {
    if (!task.requiredResources) return true;

    const { cpu, memory, gpu } = task.requiredResources;
    const workerResources = worker.config.resources;

    if (!workerResources) return true;

    if (cpu && cpu > workerResources.cpu) return false;
    if (memory && memory > workerResources.memory) return false;
    if (gpu && (!workerResources.gpu || gpu > workerResources.gpu)) return false;

    return true;
  }

  /**
   * Assign task to specific worker
   */
  private assignTaskToWorker(worker: Worker, task: WorkerTask): void {
    worker.currentTasks.add(task.taskId);
    worker.status = 'busy';

    this.emit('task:assigned', worker.workerId, task);

    // Execute task
    worker.queue
      .add(async () => {
        try {
          // Task execution happens here
          // In a real implementation, this would call the actual task executor
          await this.executeTask(worker, task);

          worker.currentTasks.delete(task.taskId);
          worker.totalTasksExecuted++;

          if (worker.currentTasks.size === 0) {
            worker.status = 'idle';
          }

          this.emit('task:completed', worker.workerId, task.taskId);

          // Try to assign more tasks
          this.assignTasks();
        } catch (error) {
          worker.currentTasks.delete(task.taskId);
          if (worker.currentTasks.size === 0) {
            worker.status = 'idle';
          }
          this.emit('task:failed', worker.workerId, task.taskId, error as Error);
        }
      })
      .catch(error => {
        console.error(`Task ${task.taskId} failed:`, error);
      });
  }

  /**
   * Execute task (placeholder - implement actual execution logic)
   */
  private async executeTask(worker: Worker, task: WorkerTask): Promise<void> {
    // This is where the actual task execution would happen
    // In a distributed system, this would send the task to the worker
    // For now, it's a placeholder
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeatMonitoring(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();

      this.workers.forEach(worker => {
        const timeSinceHeartbeat = now - worker.lastHeartbeat.getTime();

        if (timeSinceHeartbeat > this.heartbeatTimeout) {
          worker.status = 'offline';
        }
      });
    }, this.heartbeatTimeout / 2);
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeatMonitoring(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Get worker
   */
  getWorker(workerId: string): Worker | undefined {
    return this.workers.get(workerId);
  }

  /**
   * Get all workers
   */
  getAllWorkers(): Worker[] {
    return Array.from(this.workers.values());
  }

  /**
   * Get active workers
   */
  getActiveWorkers(): Worker[] {
    return Array.from(this.workers.values()).filter(w => w.status !== 'offline');
  }

  /**
   * Get queue statistics
   */
  getQueueStats(queueName: string) {
    const queue = this.taskQueues.get(queueName);
    if (!queue) return null;

    const workers = Array.from(this.workers.values()).filter(w =>
      w.config.queues.includes(queueName)
    );

    return {
      queueName,
      pendingTasks: queue.length,
      workers: workers.length,
      activeWorkers: workers.filter(w => w.status !== 'offline').length,
      totalCapacity: workers.reduce((sum, w) => sum + w.config.concurrency, 0),
      utilization: workers.reduce((sum, w) => sum + w.currentTasks.size, 0),
    };
  }

  /**
   * Shutdown worker pool
   */
  shutdown(): void {
    this.stopHeartbeatMonitoring();
    this.workers.clear();
    this.taskQueues.clear();
  }
}
