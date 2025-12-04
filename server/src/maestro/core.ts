import { IntelGraphClient } from '../intelgraph/client.js';
import { CostMeter } from './cost_meter.js';
import { MaestroRunResponse, Run, Task, Artifact } from './types.js';
import { MaestroQueries } from './queries.js';

export interface LLMClient {
  callCompletion(prompt: string, model: string): Promise<string>;
}

export interface MaestroConfig {
  defaultPlannerAgent: string;
  defaultActionAgent: string;
}

export class Maestro {
  constructor(
    private ig: IntelGraphClient,
    private costMeter: CostMeter,
    private llm: LLMClient,
    private config: MaestroConfig
  ) {}

  async runPipeline(userId: string, requestText: string): Promise<MaestroRunResponse> {
    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const run: Run = {
      id: runId,
      user: { id: userId },
      createdAt: new Date().toISOString(),
      requestText,
      status: 'running'
    };

    await this.ig.createRun(run);

    try {
      // 1. Plan (simulate planning by creating a fixed set of tasks for now, or use LLM)
      // For the vertical slice, we'll create a Planner task and an Action task.

      const plannerTaskId = `task-plan-${Date.now()}`;
      const plannerTask: Task = {
        id: plannerTaskId,
        runId,
        status: 'succeeded',
        kind: 'planner',
        description: 'Plan execution',
        input: { requestText },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        agent: { id: 'planner', name: 'Planner', kind: 'llm' }
      };
      await this.ig.createTask(plannerTask);

      // Record planner cost (simulated)
      await this.costMeter.record(runId, this.config.defaultPlannerAgent, 100, 50, plannerTaskId);

      // 2. Execute Action
      const actionTaskId = `task-act-${Date.now()}`;
      const actionTask: Task = {
        id: actionTaskId,
        runId,
        status: 'running',
        kind: 'action',
        description: 'Execute user request: ' + requestText,
        input: { requestText },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        agent: { id: 'action', name: 'Action', kind: 'llm' }
      };
      await this.ig.createTask(actionTask);

      let output: string;
      try {
        output = await this.llm.callCompletion(requestText, this.config.defaultActionAgent);

        actionTask.status = 'succeeded';
        actionTask.output = output;
        actionTask.updatedAt = new Date().toISOString();
        await this.ig.updateTask(actionTaskId, { status: 'succeeded', output, updatedAt: new Date().toISOString() });

        // Record action cost
        await this.costMeter.record(runId, this.config.defaultActionAgent, 50, 100, actionTaskId);

        // Create Artifact
        const artifact: Artifact = {
          id: `art-${Date.now()}`,
          runId,
          taskId: actionTaskId,
          kind: 'text',
          label: 'task-output',
          data: output,
          createdAt: new Date().toISOString()
        };
        await this.ig.createArtifact(artifact);

      } catch (error: any) {
        actionTask.status = 'failed';
        actionTask.errorMessage = error.message;
        actionTask.updatedAt = new Date().toISOString();
        await this.ig.updateTask(actionTaskId, { status: 'failed', errorMessage: error.message, updatedAt: new Date().toISOString() });
        run.status = 'failed';
        await this.ig.updateRun(runId, { status: 'failed' });
        // Re-throw if we want the outer catch to handle it, but for pipeline we might want to return partial result
        // The user test expects 'failed' status in result.
      }

      run.status = run.status === 'failed' ? 'failed' : 'completed';
      await this.ig.updateRun(runId, { status: run.status });

      // Build response
      const queries = new MaestroQueries(this.ig);
      const response = await queries.getRunResponse(runId);
      if (!response) throw new Error('Failed to retrieve run response');
      return response;

    } catch (error: any) {
       // If run creation failed or something catastrophic
       console.error("Pipeline error", error);
       throw error;
    }
  }
}
