export interface Capability {
  id: string;
  version: string;
  inputs: string[];
  outputs: string[];
  dependencies?: string[];
  metrics?: CapabilityMetrics;
  relations?: CapabilityRelations;
}

export interface CapabilityMetrics {
  safety: number;
  completeness: number;
  executability: number;
  maintainability: number;
  costAwareness: number;
}

export interface CapabilityRelations {
  composeWith?: string[];
  similarTo?: string[];
  dependsOn?: string[];
}
