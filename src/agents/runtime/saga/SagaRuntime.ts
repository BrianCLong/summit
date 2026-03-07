/**
 * SagaRuntime — durable, restartable execution wrapper for long-running agent tasks.
 *
 * Foundation-lane skeleton.  In production this will delegate to a
 * Temporal workflow or equivalent durable-execution backend.
 *
 * Feature flag: SUMMIT_DURABLE_SAGA_RUNTIME
 *
 * Safety invariants:
 *   - Maximum hop count enforced to prevent infinite loops.
 *   - Maximum retry count per step enforced.
 *   - All state transitions are recorded by the FlightRecorder.
 *
 * EVD-AFCP-ARCH-001
 */

import { FlightRecorder } from "../../controlplane/telemetry/FlightRecorder.js";

export type SagaStatus = "pending" | "running" | "completed" | "failed" | "aborted";

export interface SagaStep<TInput, TOutput> {
  id: string;
  execute(input: TInput): Promise<TOutput>;
  compensate?(input: TInput): Promise<void>;
}

export interface SagaState<TInput> {
  sagaId: string;
  taskId: string;
  input: TInput;
  status: SagaStatus;
  currentStep: number;
  totalSteps: number;
  hopCount: number;
  errorMessage?: string;
}

export const SAGA_DEFAULTS = {
  MAX_HOPS: 10,
  MAX_RETRIES_PER_STEP: 3,
} as const;

export class SagaRuntime<TInput, TOutput> {
  private readonly recorder: FlightRecorder;

  constructor(recorder?: FlightRecorder) {
    this.recorder = recorder ?? new FlightRecorder();
  }

  async execute(
    sagaId: string,
    taskId: string,
    input: TInput,
    steps: SagaStep<TInput, TOutput>[]
  ): Promise<TOutput | null> {
    const state: SagaState<TInput> = {
      sagaId,
      taskId,
      input,
      status: "running",
      currentStep: 0,
      totalSteps: steps.length,
      hopCount: 0,
    };

    let result: TOutput | null = null;

    for (let i = 0; i < steps.length; i++) {
      if (state.hopCount >= SAGA_DEFAULTS.MAX_HOPS) {
        state.status = "aborted";
        state.errorMessage = "MAX_HOP_LIMIT_EXCEEDED";
        this.recorder.emit({
          traceId: `${sagaId}-hop-abort`,
          taskId,
          event: "TASK_FAILED",
          timestamp: new Date().toISOString(),
          outcome: "failure",
          payload: { reason: state.errorMessage, hopCount: state.hopCount },
        });
        return null;
      }

      state.currentStep = i;
      state.hopCount++;

      let attempts = 0;
      let stepSucceeded = false;

      while (attempts < SAGA_DEFAULTS.MAX_RETRIES_PER_STEP && !stepSucceeded) {
        attempts++;
        try {
          result = await steps[i].execute(input);
          stepSucceeded = true;
        } catch (err) {
          if (attempts >= SAGA_DEFAULTS.MAX_RETRIES_PER_STEP) {
            state.status = "failed";
            state.errorMessage = err instanceof Error ? err.message : String(err);
            this.recorder.emit({
              traceId: `${sagaId}-step-${i}-fail`,
              taskId,
              event: "TASK_FAILED",
              timestamp: new Date().toISOString(),
              outcome: "failure",
              payload: { step: steps[i].id, attempts, error: state.errorMessage },
            });
            return null;
          }
        }
      }
    }

    state.status = "completed";
    this.recorder.emit({
      traceId: `${sagaId}-complete`,
      taskId,
      event: "TASK_COMPLETED",
      timestamp: new Date().toISOString(),
      outcome: "success",
      payload: { totalSteps: steps.length, hopCount: state.hopCount },
    });

    return result;
  }
}
