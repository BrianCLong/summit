import { TaskGraph } from './graph.js';
import { OrchestratorEvent } from '../types.js';
import { OrchestratorPolicy } from '@summit/policy';

export class Scheduler {
  private policy = new OrchestratorPolicy();

  constructor(public graph: TaskGraph) {}

  applyEvent(event: OrchestratorEvent) {
    // Policy check logic
    let action = '';
    // Simple mapping for MWS
    if (event.type === 'TASK_STARTED') action = 'start_task';
    else if (event.type === 'TASK_COMPLETED') action = 'complete_task';

    if (action) {
        if (!this.policy.checkPermission(action, {})) {
            // In a real system we might flag this event as a violation
            console.warn(`Event ${event.type} potentially violated policy (simulation)`);
        }
    }

    switch (event.type) {
      case 'TASK_CREATED':
        this.graph.addTask(event.payload as any);
        break;
      case 'TASK_STARTED':
        {
            const p = event.payload as any;
            this.graph.startTask(p.taskId, p.agentId, p.timestamp);
        }
        break;
      case 'TASK_COMPLETED':
        {
            const p = event.payload as any;
            this.graph.completeTask(p.taskId, p.timestamp);
        }
        break;
    }
  }
}
