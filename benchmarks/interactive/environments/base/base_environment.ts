export interface Observation {
  state: any;
  reward?: number;
  done?: boolean;
}

export interface Action {
  type: string;
  payload?: any;
}

export interface StepResult {
  observation: Observation;
  reward: number;
  done: boolean;
  info?: any;
}

export interface BudgetState {
  steps_remaining: number;
  wallclock_remaining_ms: number;
}

export interface EnvSnapshot {
  state: any;
  budget: BudgetState;
}

export interface BaseEnvironment {
  reset(seed: number, config: unknown): Promise<Observation>;
  step(action: Action): Promise<StepResult>;
  isTerminal(): boolean;
  budget(): BudgetState;
  snapshot(): EnvSnapshot;
}
