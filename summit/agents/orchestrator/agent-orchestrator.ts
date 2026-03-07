import { randomUUID } from 'node:crypto';
import { globalRegistry } from './uncertainty/registry.js';
import { UncertaintySensorRunner } from './uncertainty/sensors.js';
import { globalPolicyEngine } from './uncertainty/policy-engine.js';


import { EventLogWriter } from '../logging/event-log.js';
import { hashInputs, hashOutputs } from '../provenance/hash.js';
import type {
  Agent,
  AgentEvent,
  AgentResult,
  AgentTask,
  OrchestratorRunSummary,
} from '../types.js';

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

export class AgentOrchestrator {
  constructor(
    private readonly agents: Agent[],
    private readonly eventLog = new EventLogWriter(),
    private readonly sensorRunner = new UncertaintySensorRunner(),
  ) {}

  async run(tasks: AgentTask[]): Promise<OrchestratorRunSummary> {
    const run_id = randomUUID();
    const started_at = new Date().toISOString();
    const orderedTasks = sortTasksDeterministically(tasks);
    const results: AgentResult[] = [];

    this.emit({
      run_id,
      task_id: null,
      agent_name: null,
      ts: started_at,
      type: 'RUN_STARTED',
      inputs_hash: null,
      outputs_hash: null,
      attempt: null,
      status: 'started',
      metadata: { total_tasks: orderedTasks.length },
    });

    for (const task of orderedTasks) {
      const inputsHash = hashInputs(task.inputs);
      this.emit({
        run_id,
        task_id: task.id,
        agent_name: null,
        ts: new Date().toISOString(),
        type: 'TASK_ENQUEUED',
        inputs_hash: inputsHash,
        outputs_hash: null,
        attempt: 1,
        status: 'started',
        metadata: { priority: task.priority, created_at: task.created_at },
      });

      this.emit({
        run_id,
        task_id: task.id,
        agent_name: null,
        ts: new Date().toISOString(),
        type: 'TASK_DEQUEUED',
        inputs_hash: inputsHash,
        outputs_hash: null,
        attempt: 1,
        status: 'started',
        metadata: {},
      });

      // --- UNCERTAINTY REPRESENTATION & IDENTIFICATION ---
      // Ensure we have a baseline record for this task
      const existingRecords = globalRegistry.findByEntity(task.id);
      if (existingRecords.length === 0) {
        globalRegistry.createRecord(task.id, {}, { source_agent: 'orchestrator' });
      }

      // --- UNCERTAINTY ADAPTATION (POLICY CHECK) ---
      const policyActions = globalPolicyEngine.evaluatePlan(task.metadata || {}, globalRegistry.findByEntity(task.id));
      let shouldBlock = false;
      let policyAdaptationReason = '';

      for (const action of policyActions) {
        if (action.action_type === 'block_and_route') {
          shouldBlock = true;
          policyAdaptationReason = `Blocked by uncertainty policy: ${action.parameters.reason}`;
        } else if (action.action_type === 'add_step' || action.action_type === 'adjust_sampling') {
           // We might adapt the task here if needed
           console.log(`Adapting task ${task.id} due to policy action: ${action.action_type}`);
        }
      }

      if (shouldBlock) {
        this.emit({
          run_id,
          task_id: task.id,
          agent_name: null,
          ts: new Date().toISOString(),
          type: 'TASK_FAILED',
          inputs_hash: inputsHash,
          outputs_hash: null,
          attempt: 1,
          status: 'failed',
          metadata: { reason: policyAdaptationReason },
        });
        results.push({
          task_id: task.id,
          status: 'failed',
          outputs: {},
          error: policyAdaptationReason,
          attempt: 1,
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        });
        continue;
      }

      const selectedAgent = this.agents.find((agent) => agent.canHandle(task));
      if (!selectedAgent) {
        this.emit({
          run_id,
          task_id: task.id,
          agent_name: null,
          ts: new Date().toISOString(),
          type: 'TASK_FAILED',
          inputs_hash: inputsHash,
          outputs_hash: null,
          attempt: 1,
          status: 'failed',
          metadata: { reason: 'No suitable agent found' },
        });
        results.push({
          task_id: task.id,
          status: 'failed',
          outputs: {},
          error: 'No suitable agent found',
          attempt: 1,
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        });
        continue;
      }

      this.emit({
        run_id,
        task_id: task.id,
        agent_name: selectedAgent.name,
        ts: new Date().toISOString(),
        type: 'AGENT_SELECTED',
        inputs_hash: inputsHash,
        outputs_hash: null,
        attempt: 1,
        status: 'started',
        metadata: {},
      });

      const maxAttempts = Math.max(1, task.max_attempts ?? 1);
      let attempt = 1;
      let finalResult: AgentResult | null = null;

      while (attempt <= maxAttempts) {
        this.emit({
          run_id,
          task_id: task.id,
          agent_name: selectedAgent.name,
          ts: new Date().toISOString(),
          type: 'AGENT_EXEC_STARTED',
          inputs_hash: inputsHash,
          outputs_hash: null,
          attempt,
          status: 'started',
          metadata: {},
        });

        try {
          const result = await selectedAgent.execute(task);
          finalResult = { ...result, attempt };

          this.emit({
            run_id,
            task_id: task.id,
            agent_name: selectedAgent.name,
            ts: new Date().toISOString(),
            type: 'AGENT_EXEC_FINISHED',
            inputs_hash: inputsHash,
            outputs_hash: hashOutputs(result.outputs),
            attempt,
            status: result.status,
            metadata: {
              error: result.error ?? null,
            },
          });

          if (result.status === 'success') {
             // Run sensors on output to identify any new uncertainty
             this.sensorRunner.runAll(task.id, result.outputs, globalRegistry);
            break;
          }

          if (attempt < maxAttempts) {
            this.emit({
              run_id,
              task_id: task.id,
              agent_name: selectedAgent.name,
              ts: new Date().toISOString(),
              type: 'TASK_RETRIED',
              inputs_hash: inputsHash,
              outputs_hash: hashOutputs(result.outputs),
              attempt,
              status: 'retrying',
              metadata: {},
            });
          }
        } catch (error) {
          const failureResult: AgentResult = {
            task_id: task.id,
            status: 'failed',
            outputs: {},
            error: error instanceof Error ? error.message : String(error),
            attempt,
            started_at: new Date().toISOString(),
            finished_at: new Date().toISOString(),
          };
          finalResult = failureResult;
          this.emit({
            run_id,
            task_id: task.id,
            agent_name: selectedAgent.name,
            ts: new Date().toISOString(),
            type: 'AGENT_EXEC_FINISHED',
            inputs_hash: inputsHash,
            outputs_hash: hashOutputs(failureResult.outputs),
            attempt,
            status: 'failed',
            metadata: {
              error: failureResult.error,
            },
          });

          if (attempt < maxAttempts) {
            this.emit({
              run_id,
              task_id: task.id,
              agent_name: selectedAgent.name,
              ts: new Date().toISOString(),
              type: 'TASK_RETRIED',
              inputs_hash: inputsHash,
              outputs_hash: hashOutputs(failureResult.outputs),
              attempt,
              status: 'retrying',
              metadata: {
                reason: 'Execution error',
              },
            });
          }
        }

        attempt += 1;
      }

      if (!finalResult) {
        continue;
      }

      if (finalResult.status === 'failed') {
        this.emit({
          run_id,
          task_id: task.id,
          agent_name: selectedAgent.name,
          ts: new Date().toISOString(),
          type: 'TASK_FAILED',
          inputs_hash: inputsHash,
          outputs_hash: hashOutputs(finalResult.outputs),
          attempt: finalResult.attempt,
          status: 'failed',
          metadata: {
            error: finalResult.error ?? null,
          },
        });
      }

      results.push(finalResult);
    }

    const finished_at = new Date().toISOString();
    this.emit({
      run_id,
      task_id: null,
      agent_name: null,
      ts: finished_at,
      type: 'RUN_FINISHED',
      inputs_hash: null,
      outputs_hash: null,
      attempt: null,
      status: 'finished',
      metadata: {
        succeeded_tasks: results.filter((result) => result.status === 'success').length,
        failed_tasks: results.filter((result) => result.status === 'failed').length,
      },
    });

    return {
      run_id,
      started_at,
      finished_at,
      total_tasks: orderedTasks.length,
      succeeded_tasks: results.filter((result) => result.status === 'success').length,
      failed_tasks: results.filter((result) => result.status === 'failed').length,
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
