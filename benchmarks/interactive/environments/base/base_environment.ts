export interface Observation {
  state: Record<string, unknown>;
  availableActions?: string[];
}

export interface Action {
  type: string;
  payload?: Record<string, unknown>;
}

export interface StepResult {
  observation: Observation;
  reward: number;
  done: boolean;
  info?: Record<string, unknown>;
}

export interface BudgetState {
  steps_remaining: number;
  wallclock_remaining_ms: number;
}

export interface EnvSnapshot {
  seed: number;
  stepCount: number;
  state: Record<string, unknown>;
}

export interface BaseEnvironment {
  reset(seed: number, config: unknown): Promise<Observation>;
  step(action: Action): Promise<StepResult>;
  isTerminal(): boolean;
  budget(): BudgetState;
  snapshot(): EnvSnapshot;
}
