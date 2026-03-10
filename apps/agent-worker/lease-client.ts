import type { TaskNode } from '../../api/agent-os/planner/task-graph';
import type { Scheduler } from '../../api/agent-os/scheduler/index';

export class LeaseClient {
  constructor(private scheduler: Scheduler, private workerId: string) {}

  poll(): TaskNode | null {
    return this.scheduler.leaseTask(this.workerId);
  }

  reportComplete(taskId: string) {
    this.scheduler.completeTask(taskId);
  }
}
