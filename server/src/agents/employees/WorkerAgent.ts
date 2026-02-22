
import { AgentEmployee } from './AgentEmployee.ts';
import { AgentTask } from './types.ts';

export class WorkerAgent extends AgentEmployee {
  async processTask(task: AgentTask): Promise<void> {
    this.status = 'working';
    this.log(`Received task: ${task.type} - ${task.description}`);
    task.status = 'in_progress';
    task.assignedTo = this.id;
    task.history.push({ timestamp: Date.now(), action: 'started', actor: this.id });

    try {
      // Simulate work based on capabilities
      if (task.type === 'investigate' && this.capabilities.includes('investigate_incident')) {
        const investigateCap = this.capabilityMap.get('investigate_incident');
        if (investigateCap) {
            task.result = await investigateCap.execute(task.payload);
        }
      } else if (task.type === 'enrich' && this.capabilities.includes('enrich_entity')) {
        const enrichCap = this.capabilityMap.get('enrich_entity');
        if (enrichCap) {
             task.result = await enrichCap.execute(task.payload);
        }
      } else if (task.type === 'triage' && this.capabilities.includes('triage_alert')) {
          const triageCap = this.capabilityMap.get('triage_alert');
          if (triageCap) {
              task.result = await triageCap.execute(task.payload);
          }
      }
      else {
        this.log(`No capability found for task type: ${task.type}`);
        task.result = { error: 'Capability not found' };
      }

      task.status = 'completed';
      task.history.push({ timestamp: Date.now(), action: 'completed', actor: this.id });
      this.log(`Task completed: ${task.id}`);

    } catch (error: any) {
      this.log(`Task failed: ${error.message}`);
      task.status = 'failed';
      task.result = { error: error.message };
      task.history.push({ timestamp: Date.now(), action: 'failed', actor: this.id });
    } finally {
      this.status = 'idle';
    }
  }
}
