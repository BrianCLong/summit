/**
 * Lifecycle enums used to track adapter execution.
 */
export enum AdapterLifecycleIntent {
  Prepare = "prepare",
  Preflight = "preflight",
  Execute = "execute",
  Retry = "retry",
  Finalize = "finalize",
}

export enum AdapterLifecycleStage {
  Registered = "registered",
  Warm = "warm",
  Ready = "ready",
  Executing = "executing",
  CoolingDown = "cooling-down",
  Completed = "completed",
  Failed = "failed",
}

export interface LifecycleCheckpoint {
  intent: AdapterLifecycleIntent;
  stage: AdapterLifecycleStage;
  at: string;
  note?: string;
}
