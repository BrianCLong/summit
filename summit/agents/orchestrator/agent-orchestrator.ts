import { randomUUID } from 'node:crypto';

import { EventLogWriter } from '../logging/event-log.js';
import { hashInputs, hashOutputs } from '../provenance/hash.js';
import type {
  Agent,
  AgentEvent,
  AgentResult,
  AgentTask,
  OrchestratorRunSummary,
} from '../types.js';

export interface OrchestratorRuntime {
  now(): string;
  runId(): string;
}

const defaultRuntime: OrchestratorRuntime = {
  now: () => new Date().toISOString(),
  runId: () => randomUUID(),
};

const sortTasksDeterministically = (tasks: AgentTask[]): AgentTask[] =>
  [...tasks].sort((left, right) => {
    if (right.priority !== left.priority) {
      return right.priority - left.priority;
    }

    const createdComparison =
      new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
    if (createdComparison !== 0) {
      return createdComparison;
    }

    return left.id.localeCompare(right.id);
  });

const createEvent = (
  runtime: OrchestratorRuntime,
  event: Omit<AgentEvent, 'ts'>,
): AgentEvent => ({
  ...event,
  ts: runtime.now(),
});

export class AgentOrchestrator {
  constructor(
    private readonly agents: Agent[],
    private readonly eventLog = new EventLogWriter(),
    private readonly runtime: OrchestratorRuntime = defaultRuntime,
  ) {}

  async run(tasks: AgentTask[]): Promise<OrchestratorRunSummary> {
    const run_id = this.runtime.runId();
    const started_at = this.runtime.now();
    const orderedTasks = sortTasksDeterministically(tasks);
    const results: AgentResult[] = [];

    this.emit(
      createEvent(this.runtime, {
        run_id,
        task_id: null,
        agent_name: null,
        type: 'RUN_STARTED',
        inputs_hash: null,
        outputs_hash: null,
        attempt: null,
        status: 'started',
        metadata: { total_tasks: orderedTasks.length, who: 'orchestrator', what: 'run_start' },
      }),
    );

    for (const task of orderedTasks) {
      const inputsHash = hashInputs(task.inputs);
      this.emit(
        createEvent(this.runtime, {
          run_id,
          task_id: task.id,
          agent_name: null,
          type: 'TASK_ENQUEUED',
          inputs_hash: inputsHash,
          outputs_hash: null,
          attempt: 1,
          status: 'started',
          metadata: {
            priority: task.priority,
            created_at: task.created_at,
            who: 'orchestrator',
            what: 'enqueue',
          },
        }),
      );

      this.emit(
        createEvent(this.runtime, {
          run_id,
          task_id: task.id,
          agent_name: null,
          type: 'TASK_DEQUEUED',
          inputs_hash: inputsHash,
          outputs_hash: null,
          attempt: 1,
          status: 'started',
          metadata: { who: 'orchestrator', what: 'dequeue' },
        }),
      );

      const selectedAgent = this.agents.find((agent) => agent.canHandle(task));
      if (!selectedAgent) {
        const failureTs = this.runtime.now();
        this.emit(
          createEvent(this.runtime, {
            run_id,
            task_id: task.id,
            agent_name: null,
            type: 'TASK_FAILED',
            inputs_hash: inputsHash,
            outputs_hash: null,
            attempt: 1,
            status: 'failed',
            metadata: {
              reason: 'No suitable agent found',
              who: 'orchestrator',
              what: 'selection_failed',
            },
          }),
        );
        results.push({
          task_id: task.id,
          status: 'failed',
          outputs: {},
          error: 'No suitable agent found',
          attempt: 1,
          started_at: failureTs,
          finished_at: failureTs,
        });
        continue;
      }

      this.emit(
        createEvent(this.runtime, {
          run_id,
          task_id: task.id,
          agent_name: selectedAgent.name,
          type: 'AGENT_SELECTED',
          inputs_hash: inputsHash,
          outputs_hash: null,
          attempt: 1,
          status: 'started',
          metadata: { who: 'orchestrator', what: 'agent_selected' },
        }),
      );

      const maxAttempts = Math.max(1, task.max_attempts ?? 1);
      let attempt = 1;
      let finalResult: AgentResult | null = null;

      while (attempt <= maxAttempts) {
        this.emit(
          createEvent(this.runtime, {
            run_id,
            task_id: task.id,
            agent_name: selectedAgent.name,
            type: 'AGENT_EXEC_STARTED',
            inputs_hash: inputsHash,
            outputs_hash: null,
            attempt,
            status: 'started',
            metadata: { who: selectedAgent.name, what: 'exec_start' },
          }),
        );

        try {
          const result = await selectedAgent.execute(task);
          finalResult = { ...result, attempt };
          const outputHash = hashOutputs(result.outputs);

          this.emit(
            createEvent(this.runtime, {
              run_id,
              task_id: task.id,
              agent_name: selectedAgent.name,
              type: 'AGENT_EXEC_FINISHED',
              inputs_hash: inputsHash,
              outputs_hash: outputHash,
              attempt,
              status: result.status,
              metadata: {
                error: result.error ?? null,
                who: selectedAgent.name,
                what: 'exec_finish',
              },
            }),
          );

          if (result.status === 'success') {
            break;
          }

          if (attempt < maxAttempts) {
            this.emit(
              createEvent(this.runtime, {
                run_id,
                task_id: task.id,
                agent_name: selectedAgent.name,
                type: 'TASK_RETRIED',
                inputs_hash: inputsHash,
                outputs_hash: outputHash,
                attempt,
                status: 'retrying',
                metadata: { who: 'orchestrator', what: 'retry' },
              }),
            );
          }
        } catch (error) {
          const failureTs = this.runtime.now();
          const failureResult: AgentResult = {
            task_id: task.id,
            status: 'failed',
            outputs: {},
            error: error instanceof Error ? error.message : String(error),
            attempt,
            started_at: failureTs,
            finished_at: failureTs,
          };
          finalResult = failureResult;
          const outputHash = hashOutputs(failureResult.outputs);

          this.emit(
            createEvent(this.runtime, {
              run_id,
              task_id: task.id,
              agent_name: selectedAgent.name,
              type: 'AGENT_EXEC_FINISHED',
              inputs_hash: inputsHash,
              outputs_hash: outputHash,
              attempt,
              status: 'failed',
              metadata: {
                error: failureResult.error,
                who: selectedAgent.name,
                what: 'exec_error',
              },
            }),
          );

          if (attempt < maxAttempts) {
            this.emit(
              createEvent(this.runtime, {
                run_id,
                task_id: task.id,
                agent_name: selectedAgent.name,
                type: 'TASK_RETRIED',
                inputs_hash: inputsHash,
                outputs_hash: outputHash,
                attempt,
                status: 'retrying',
                metadata: {
                  reason: 'Execution error',
                  who: 'orchestrator',
                  what: 'retry_after_error',
                },
              }),
            );
          }
        }

        attempt += 1;
      }

      if (!finalResult) {
        continue;
      }

      if (finalResult.status === 'failed') {
        this.emit(
          createEvent(this.runtime, {
            run_id,
            task_id: task.id,
            agent_name: selectedAgent.name,
            type: 'TASK_FAILED',
            inputs_hash: inputsHash,
            outputs_hash: hashOutputs(finalResult.outputs),
            attempt: finalResult.attempt,
            status: 'failed',
            metadata: {
              error: finalResult.error ?? null,
              who: 'orchestrator',
              what: 'task_terminal_failure',
            },
          }),
        );
      }

      results.push(finalResult);
    }

    const finished_at = this.runtime.now();
    const succeededCount = results.filter((result) => result.status === 'success').length;
    const failedCount = results.filter((result) => result.status === 'failed').length;

    this.emit(
      createEvent(this.runtime, {
        run_id,
        task_id: null,
        agent_name: null,
        type: 'RUN_FINISHED',
        inputs_hash: null,
        outputs_hash: null,
        attempt: null,
        status: 'finished',
        metadata: {
          succeeded_tasks: succeededCount,
          failed_tasks: failedCount,
          who: 'orchestrator',
          what: 'run_finish',
        },
      }),
    );

    return {
      run_id,
      started_at,
      finished_at,
      total_tasks: orderedTasks.length,
      succeeded_tasks: succeededCount,
      failed_tasks: failedCount,
      results,
      events_emitted: this.eventLog.getEvents().length,
    };
  }

  getEvents(): AgentEvent[] {
    return this.eventLog.getEvents();
  }

  private emit(event: AgentEvent): void {
    this.eventLog.append(event);
  }
}

export { sortTasksDeterministically };
