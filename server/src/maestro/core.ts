import { IntelGraphClient } from '../intelgraph/client';
import { Task, Run, Artifact, TaskStatus } from './types';
import { CostMeter } from './cost_meter';
import { OpenAILLM } from './adapters/llm_openai';
import { ResidencyGuard } from '../data-residency/residency-guard';

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
    const now = new Date().toISOString();
    const run: Run = {
      id: crypto.randomUUID(),
      user: { id: userId },
      createdAt: now,
      updatedAt: now,
      status: 'queued',
      requestText,
      // Pass tenant context if available (will need DB schema update for full persistence)
      ...(options?.tenantId ? { tenantId: options.tenantId } : {})
    } as Run;
    await this.ig.createRun(run);
    return run;
  }

  async planRequest(run: Run): Promise<Task[]> {
    // Here you can do something simple at first: single action task
    const tenantId = (run as any).tenantId;

    const planTask: Task = {
      id: crypto.randomUUID(),
      runId: run.id,
      tenantId,
      status: 'succeeded',        // planning is instant for v0.1
      agent: {
        id: this.config.defaultPlannerAgent,
        name: 'planner',
        kind: 'llm',
        modelId: this.config.defaultPlannerAgent,
      },
      kind: 'plan',
      description: `Plan for: ${run.requestText}`,
      input: { requestText: run.requestText, tenantId },
      output: { steps: ['single_action'] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const actionTask: Task = {
      id: crypto.randomUUID(),
      runId: run.id,
      parentTaskId: planTask.id,
      tenantId,
      status: 'queued',
      agent: {
        id: this.config.defaultActionAgent,
        name: 'action-llm',
        kind: 'llm',
        modelId: this.config.defaultActionAgent,
      },
      kind: 'action',
      description: `Execute user request: ${run.requestText}`,
      input: { requestText: run.requestText, tenantId },
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
      // Residency Check for Agent Execution
      // We assume run or task input has tenantId.
      // If run object isn't passed here, we rely on task input.
      // Or we should fetch the Run. For v0.1 simplification, we assume context is in task inputs
      // or we extract it from runId lookup (not efficient here without caching).
      // Assuming tasks created by createRun have tenantId in their metadata/input if provided.
      const tenantId = (task.input as any)?.tenantId;

      if (tenantId) {
          const guard = ResidencyGuard.getInstance();
          await guard.validateAgentExecution(tenantId);
      }

      let result: string = '';

      if (task.agent.kind === 'llm') {
        let attempts = 0;
        const maxRetries = 3;
        let lastError: any;

        while (attempts < maxRetries) {
          const controller = new AbortController();
          const signal = controller.signal;
          let timeoutId: NodeJS.Timeout;

          try {
            // Timeout promise that cleans up properly
            const timeout = new Promise<never>((_, reject) => {
              timeoutId = setTimeout(() => {
                controller.abort();
                reject(new Error('LLM execution timed out'));
              }, 60000);
            });

            const llmCall = this.llm.callCompletion(
              task.runId,
              task.id,
              {
                model: task.agent.modelId!,
                messages: [
                  { role: 'system', content: 'You are an execution agent.' },
                  { role: 'user', content: task.description },
                  ...(task.input.requestText
                    ? [{ role: 'user', content: String(task.input.requestText) }]
                    : []),
                ],
              },
              {
                feature: `maestro_${task.kind}`,
                tenantId: typeof task.input?.tenantId === 'string' ? task.input.tenantId : undefined,
                environment: process.env.NODE_ENV || 'unknown',
                // @ts-ignore - Assuming adapter supports signal or just ignoring it safely
                signal: signal
              },
            );

            const llmResult = (await Promise.race([llmCall, timeout])) as any;
            clearTimeout(timeoutId!); // Clear timeout on success
            result = llmResult.content;
            break; // Success
          } catch (err: any) {
            clearTimeout(timeoutId!); // Clear timeout on failure
            lastError = err;
            attempts++;
            // Clean up abort controller on error if not already aborted
            if (!signal.aborted) controller.abort();

            if (attempts >= maxRetries) break;
            // Exponential backoff: 1s, 2s, 4s...
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts - 1)));
          }
        }

        if (!result && lastError) throw lastError;
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
    const startedAt = new Date().toISOString();
    await this.ig.updateRun(run.id, {
      status: 'running',
      startedAt,
      updatedAt: startedAt,
      tenantId: run.tenantId,
    });
    const tasks = await this.planRequest(run);

    const executable = tasks.filter(t => t.status === 'queued');

    const results = [];
    for (const task of executable) {
      const res = await this.executeTask(task);
      results.push(res);
    }

    const finishedAt = new Date().toISOString();
    const runStatus = results.some((res) => res.task.status === 'failed')
      ? 'failed'
      : 'succeeded';
    await this.ig.updateRun(run.id, {
      status: runStatus,
      completedAt: finishedAt,
      updatedAt: finishedAt,
      tenantId: run.tenantId,
    });

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
