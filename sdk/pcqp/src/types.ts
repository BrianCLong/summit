export type SiloId = 'Eu' | 'Us' | 'Apac';

export interface TraceEvent {
  policyId: string;
  silo: SiloId | null;
  message: string;
}

export interface SiloSubplan {
  silo: SiloId;
  sourceAlias: string;
  dataset: string;
  pushedProjections: string[];
  pushedFilters: Array<{
    table: string;
    column: string;
    op: string;
    value: Record<string, unknown>;
  }>;
}

export interface CoordinatorPlan {
  joinStrategy: Record<string, unknown> | null;
  outputProjections: Array<{
    table: string;
    column: string;
    alias: string | null;
  }>;
}

export interface FederatedPlan {
  subplans: SiloSubplan[];
  coordinator: CoordinatorPlan;
  compliance: {
    events: TraceEvent[];
  };
}
