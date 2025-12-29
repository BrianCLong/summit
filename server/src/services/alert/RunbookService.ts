import { RunbookBinding, RunbookExecution } from '../../types/runbooks.js';
import crypto from 'crypto';

export class RunbookService {
  private bindings: RunbookBinding[] = [];
  private executions: RunbookExecution[] = [];

  constructor() {
    // In prod, load from DB
  }

  public bindRunbook(ruleId: string | undefined, incidentTag: string | undefined, playbookId: string, autoRun: boolean = false): void {
    this.bindings.push({ ruleId, incidentTag, playbookId, autoRun });
  }

  public getBindingsForIncident(ruleId: string, incidentKey: string): RunbookBinding[] {
    // Logic: match specific ruleId, or tags (not implemented fully here but placeholder)
    return this.bindings.filter(b => b.ruleId === ruleId);
  }

  public async triggerRunbook(incidentId: string, playbookId: string): Promise<RunbookExecution> {
    const execution: RunbookExecution = {
      id: crypto.randomUUID(),
      playbookId,
      incidentId,
      status: 'pending',
      startedAt: Date.now()
    };
    this.executions.push(execution);

    // Simulate async execution
    this.executeRunbook(execution);

    return execution;
  }

  private async executeRunbook(execution: RunbookExecution) {
    execution.status = 'running';
    // Mock delay
    await new Promise(resolve => setTimeout(resolve, 100));
    execution.status = 'completed';
  }

  public getExecution(id: string): RunbookExecution | undefined {
    return this.executions.find(e => e.id === id);
  }
}

export const runbookService = new RunbookService();
