import { randomUUID } from 'crypto';
import { EventType, type Event } from '../types.js';
import { type TaskGraph } from './taskGraph.js';
import {
  type SandboxExecutionBoundary,
  type SandboxExecutionRequest,
  type SandboxExecutionResult,
} from './sandboxExecution.js';

export interface ArkSpineRunResult {
  runId: string;
  events: Event[];
  taskResults: Record<string, SandboxExecutionResult>;
}

export class ArkSpine {
  private taskGraph: TaskGraph;
  private sandboxBoundary: SandboxExecutionBoundary;

  constructor(taskGraph: TaskGraph, sandboxBoundary: SandboxExecutionBoundary) {
    this.taskGraph = taskGraph;
    this.sandboxBoundary = sandboxBoundary;
  }

  async run(runId = randomUUID()): Promise<ArkSpineRunResult> {
    const events: Event[] = [];
    const taskResults: Record<string, SandboxExecutionResult> = {};
    const orderedTasks = this.taskGraph.getExecutionOrder();

    for (const task of orderedTasks) {
      const request: SandboxExecutionRequest = {
        sandboxId: task.sandboxId,
        code: task.code,
        language: task.language,
        entryPoint: task.entryPoint,
        inputs: task.inputs,
        metadata: task.metadata,
      };

      events.push(this.createEvent(runId, EventType.TOOL_CALL_REQUESTED, {
        taskId: task.id,
        taskName: task.name,
      }));

      try {
        const result = await this.sandboxBoundary.execute(request);
        taskResults[task.id] = result;
        const eventType = result.status === 'success'
          ? EventType.TOOL_CALL_COMPLETED
          : EventType.TOOL_CALL_FAILED;

        events.push(this.createEvent(runId, eventType, {
          taskId: task.id,
          status: result.status,
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        taskResults[task.id] = {
          executionId: randomUUID(),
          status: 'error',
          output: null,
          logs: [message],
        };
        events.push(this.createEvent(runId, EventType.TOOL_CALL_FAILED, {
          taskId: task.id,
          status: 'error',
          error: message,
        }));
      }
    }

    return { runId, events, taskResults };
  }

  private createEvent(runId: string, type: EventType, payload: Record<string, unknown>): Event {
    return {
      event_id: randomUUID(),
      run_id: runId,
      ts: new Date(),
      type,
      payload,
    };
  }
}
