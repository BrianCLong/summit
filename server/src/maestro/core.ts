import { IntelGraphClient } from '../intelgraph/client';
import { Task, Run, Artifact, TaskStatus } from './types';
import { CostMeter } from './cost_meter';
import { OpenAILLM } from './adapters/llm_openai';
import { logger, getContext, metrics, tracer } from '../observability/index.js';
import { SpanKind, SpanStatusCode } from '@opentelemetry/api';

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

  async createRun(userId: string, requestText: string): Promise<Run> {
    const context = getContext();
    // Use existing correlationId or generate one if missing (though runPipeline typically called within request context)
    const runId = crypto.randomUUID();

    logger.info('Creating Maestro Run', { userId, runId });
    metrics.incrementCounter('summit_maestro_runs_total', { status: 'created', tenantId: context?.tenantId });

    const run: Run = {
      id: runId,
      user: { id: userId },
      createdAt: new Date().toISOString(),
      requestText,
    };
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
    return tracer.trace('maestro.task', async (span) => {
      const start = process.hrtime();
      const now = new Date().toISOString();
      const ctx = getContext();

      span.setAttributes({
        'maestro.runId': task.runId,
        'maestro.taskId': task.id,
        'maestro.agent': task.agent.name,
        'maestro.agent.kind': task.agent.kind,
        'tenant.id': ctx?.tenantId
      });

      logger.info('Executing Maestro Task', {
        runId: task.runId,
        taskId: task.id,
        agent: task.agent.name
      });

      await this.ig.updateTask(task.id, { status: 'running', updatedAt: now });

      try {
        let result: string = '';

        if (task.agent.kind === 'llm') {
          // LLM calls should be instrumented inside the adapter, but we add high-level span event here
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

        const diff = process.hrtime(start);
        const duration = (diff[0] * 1e9 + diff[1]) / 1e9;
        metrics.observeHistogram('summit_maestro_task_duration_seconds', duration, {
          status: 'succeeded',
          agent: task.agent.name,
          tenantId: ctx?.tenantId
        });

        return {
          task: { ...task, ...updatedTask } as Task,
          artifact,
        };
      } catch (err: any) {
        logger.error('Maestro Task Failed', {
           runId: task.runId,
           taskId: task.id,
           error: err.message
        });

        const updatedTask: Partial<Task> = {
          status: 'failed',
          errorMessage: err?.message ?? String(err),
          updatedAt: new Date().toISOString(),
        };
        await this.ig.updateTask(task.id, updatedTask);

        const diff = process.hrtime(start);
        const duration = (diff[0] * 1e9 + diff[1]) / 1e9;
        metrics.observeHistogram('summit_maestro_task_duration_seconds', duration, {
          status: 'failed',
          agent: task.agent.name,
          tenantId: ctx?.tenantId
        });

        span.recordException(err);
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });

        return { task: { ...task, ...updatedTask } as Task, artifact: null };
      }
    }, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'maestro.runId': task.runId,
        'maestro.taskId': task.id
      }
    });
  }

  async runPipeline(userId: string, requestText: string) {
    return tracer.trace('maestro.run', async (span) => {
      const start = process.hrtime();
      const ctx = getContext();

      try {
        const run = await this.createRun(userId, requestText);

        span.setAttributes({
            'maestro.runId': run.id,
            'user.id': userId,
            'tenant.id': ctx?.tenantId
        });

        const tasks = await this.planRequest(run);

        const executable = tasks.filter(t => t.status === 'queued');

        const results = [];
        for (const task of executable) {
          const res = await this.executeTask(task);
          results.push(res);
        }

        const costSummary = await this.costMeter.summarize(run.id);

        const diff = process.hrtime(start);
        const duration = (diff[0] * 1e9 + diff[1]) / 1e9;

        metrics.observeHistogram('summit_maestro_run_duration_seconds', duration, {
            status: 'succeeded',
            tenantId: ctx?.tenantId
        });

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
      } catch (error: any) {
        const diff = process.hrtime(start);
        const duration = (diff[0] * 1e9 + diff[1]) / 1e9;

        metrics.observeHistogram('summit_maestro_run_duration_seconds', duration, {
            status: 'failed',
            tenantId: ctx?.tenantId
        });

        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        throw error;
      }
    });
  }
}
