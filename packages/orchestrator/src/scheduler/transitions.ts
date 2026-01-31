import { OrchestratorStore } from '../store.js';
import { OrchestratorEvent } from '../types.js';
import { OrchestratorPolicy } from '@summit/policy';

export class Scheduler {
  private policy = new OrchestratorPolicy();

  constructor(public store: OrchestratorStore, public runId: string) { }

  async applyEvent(event: OrchestratorEvent) {
    // Audit log persistence
    await this.store.saveEvent(event);

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
        await this.store.upsertTask({ ...event.payload as any, runId: this.runId });
        break;
      case 'TASK_STARTED':
        {
          const p = event.payload as any;
          await this.store.updateTaskStatus(p.taskId, 'in_progress', {
            owner: p.agentId,
            startedAt: p.timestamp
          });
        }
        break;
      case 'TASK_COMPLETED':
        {
          const p = event.payload as any;
          await this.store.updateTaskStatus(p.taskId, 'completed', {
            completedAt: p.timestamp
          });
        }
        break;
    }
  }
}
