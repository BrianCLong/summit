import crypto from 'node:crypto';
import { ClassifiedEntity, VerificationTask, VerificationWorkflowHooks } from './types.js';

export interface VerificationQueueOptions {
  minimumConfidence?: number;
  enforceForSeverities?: Set<'critical' | 'high' | 'medium' | 'low'>;
  hooks?: VerificationWorkflowHooks;
}

export class VerificationQueue {
  private readonly tasks = new Map<string, VerificationTask>();
  private readonly options: VerificationQueueOptions;

  constructor(options: VerificationQueueOptions = {}) {
    this.options = {
      minimumConfidence: options.minimumConfidence ?? 0.7,
      enforceForSeverities: options.enforceForSeverities ?? new Set(['critical', 'high']),
      hooks: options.hooks
    };
  }

  shouldEnqueue(entity: ClassifiedEntity): boolean {
    if (entity.confidence < (this.options.minimumConfidence ?? 0.7)) {
      return true;
    }
    return this.options.enforceForSeverities?.has(entity.severity) ?? false;
  }

  async enqueue(entity: ClassifiedEntity): Promise<VerificationTask> {
    const task: VerificationTask = {
      taskId: crypto.randomUUID(),
      entity,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
    this.tasks.set(task.taskId, task);
    await this.options.hooks?.onTaskCreated?.(task);
    return task;
  }

  async resolve(taskId: string, status: 'approved' | 'rejected', reviewer: string, notes?: string): Promise<VerificationTask> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Unknown verification task ${taskId}`);
    }
    const updated: VerificationTask = {
      ...task,
      status,
      reviewer,
      notes
    };
    this.tasks.set(taskId, updated);
    await this.options.hooks?.onTaskResolved?.(updated);
    return updated;
  }

  list(status?: VerificationTask['status']): VerificationTask[] {
    return [...this.tasks.values()].filter((task) => (status ? task.status === status : true));
  }

  clear(): void {
    this.tasks.clear();
  }
}

