export type UncertaintyLifecyclePhase = 'representation' | 'identification' | 'evolution' | 'adaptation';
export type UncertaintyAction = 'spawnDebateAgents' | 'humanReview' | 'requireMultiAgentDebate' | 'humanEscalate' | 'none';

export interface UncertaintySensor {
  type: string;
  value: any;
  confidence: number;
}

export interface UncertaintyMetrics {
  epistemic: number;
  aleatoric: number;
  diverseAgentEntropy: number;
}

export interface UncertaintyState {
  lifecycle: UncertaintyLifecyclePhase;
  metrics: UncertaintyMetrics;
  sensors: UncertaintySensor[];
  actions: UncertaintyAction[];
}

export interface UncertaintyRecord extends UncertaintyState {
  id: string;
  entityId: string; // Task/Claim/AgentRun
}

export interface Task {
  id: string;
  type: 'Task';
}

export interface Claim {
  id: string;
  type: 'Claim';
  statement: string;
}

export interface AgentRun {
  id: string;
  type: 'AgentRun';
}

export type Entity = Task | Claim | AgentRun;
