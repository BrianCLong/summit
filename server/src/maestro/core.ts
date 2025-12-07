import { IntelGraphClient } from '../intelgraph/client';
import { Task, Run, Artifact, TaskStatus } from './types';
import { CostMeter } from './cost_meter';
import { OpenAILLM } from './adapters/llm_openai';

export interface MaestroConfig {
  defaultPlannerAgent: string;   // e.g. "openai:gpt-4.1"
  defaultActionAgent: string;
}

export class Maestro {
  constructor(
    private ig: IntelGraphClient,
    private costMeter: CostMeter,
    private llm: OpenAILLM,
    private config: MaestroConfig,
  ) {}

  async createRun(userId: string, requestText: string, options?: { tenantId?: string }): Promise<Run> {
    const run: Run = {
      id: crypto.randomUUID(),
      user: { id: userId },
      createdAt: new Date().toISOString(),
      requestText,
      // Pass tenant context if available (will need DB schema update for full persistence)
      ...(options?.tenantId ? { tenantId: options.tenantId } : {})
    } as Run;
    await this.ig.createRun(run);
    return run;
  }

  async planRequest(run: Run): Promise<Task[]> {
    // Here you can do something simple at first: single action task
    const planTask: Task = {
      id: crypto.randomUUID(),
      runId: run.id,
      status: 'succeeded',        // planning is instant for v0.1
      agent: {
        id: this.config.defaultPlannerAgent,
        name: 'planner',
        kind: 'llm',
        modelId: this.config.defaultPlannerAgent,
      },
      kind: 'plan',
      description: `Plan for: ${run.requestText}`,
      input: { requestText: run.requestText },
      output: { steps: ['single_action'] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const actionTask: Task = {
      id: crypto.randomUUID(),
      runId: run.id,
      parentTaskId: planTask.id,
      status: 'queued',
      agent: {
        id: this.config.defaultActionAgent,
        name: 'action-llm',
        kind: 'llm',
        modelId: this.config.defaultActionAgent,
      },
      kind: 'action',
      description: `Execute user request: ${run.requestText}`,
      input: { requestText: run.requestText },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.ig.createTask(planTask);
    await this.ig.createTask(actionTask);

    return [planTask, actionTask];
  }

  async executeTask(task: Task): Promise<{ task: Task; artifact: Artifact | null }> {
    const now = new Date().toISOString();
    await this.ig.updateTask(task.id, { status: 'running', updatedAt: now });

    try {
      let result: string = '';

      if (task.agent.kind === 'llm') {
        result = await this.llm.callCompletion(task.runId, task.id, {
          model: task.agent.modelId!,
          messages: [
            { role: 'system', content: 'You are an execution agent.' },
            { role: 'user', content: task.description },
            ...(task.input.requestText ? [{ role: 'user', content: String(task.input.requestText) }] : []),
          ],
        });
      } else {
        // TODO: shell tools, etc.
        result = 'TODO: implement non-LLM agent';
      }

      const artifact: Artifact = {
        id: crypto.randomUUID(),
        runId: task.runId,
        taskId: task.id,
        kind: 'text',
        label: 'task-output',
        data: result,
        createdAt: new Date().toISOString(),
      };

      const updatedTask: Partial<Task> = {
        status: 'succeeded',
        output: { result },
        updatedAt: new Date().toISOString(),
      };

      await this.ig.createArtifact(artifact);
      await this.ig.updateTask(task.id, updatedTask);

      return {
        task: { ...task, ...updatedTask } as Task,
        artifact,
      };
    } catch (err: any) {
      const updatedTask: Partial<Task> = {
        status: 'failed',
        errorMessage: err?.message ?? String(err),
        updatedAt: new Date().toISOString(),
      };
      await this.ig.updateTask(task.id, updatedTask);

      return { task: { ...task, ...updatedTask } as Task, artifact: null };
    }
  }

  async runPipeline(userId: string, requestText: string, options?: { tenantId?: string }) {
    const run = await this.createRun(userId, requestText, options);
    const tasks = await this.planRequest(run);

    const executable = tasks.filter(t => t.status === 'queued');

    const results = [];
    for (const task of executable) {
      const res = await this.executeTask(task);
      results.push(res);
    }

    const costSummary = await this.costMeter.summarize(run.id);

    return {
      run,
      tasks: tasks.map(t => ({
        id: t.id,
        status: t.status,
        description: t.description,
      })),
      results,
      costSummary,
    };
  }
}
