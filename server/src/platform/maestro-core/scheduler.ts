import { TaskQueue, Task } from './types.js';
import { SLOEvaluationEngine } from '../summitsight/engine.js';

export class MaestroScheduler {
  constructor(
    private queue: TaskQueue,
    private sloEngine?: SLOEvaluationEngine // Optional for testing/scaffold
  ) {}

  async scheduleTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'attemptCount' | 'status'>): Promise<Task> {
    const task = await this.queue.enqueue(taskData);

    // Initial SLO check - e.g. acceptance rate or queue depth?
    // For now we just return.
    return task;
  }

  async processNext(workerTypes: string[]): Promise<Task | null> {
    const task = await this.queue.dequeue(workerTypes);

    if (task && this.sloEngine) {
        // Evaluate SLA compliance upon pickup (time in queue)
        const now = new Date().getTime();
        const created = task.createdAt.getTime();
        const latencyMs = now - created;

        // Emit event for Latency SLO
        // We use a convention for the metric ID: "maestro-task-queue-latency"
        this.sloEngine.evaluate(latencyMs, 'maestro-task-queue-latency');

        // Check explicit task SLA if defined
        if (task.slaSeconds) {
             const slaMs = task.slaSeconds * 1000;
             const inCompliance = latencyMs <= slaMs;
             // We could emit a specific SLA event here
        }
    }

    return task;
  }

  // Helper to check SLA compliance (could be run periodically)
  checkSLACompliance(task: Task): boolean {
    if (!task.slaSeconds) return true;
    const now = new Date().getTime();
    const created = task.createdAt.getTime();
    const compliance = (now - created) / 1000 <= task.slaSeconds;

    if (!compliance && this.sloEngine) {
        // Record a failure event
        // this.sloEngine.recordViolation(...) // specific method if we had it
    }
    return compliance;
  }
}
