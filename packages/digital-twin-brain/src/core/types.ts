export type Modality = 'sensor' | 'text' | 'image' | 'audio' | 'document';

export type FeatureVector = Record<string, number>;

export interface FeatureRecord {
  assetId: string;
  modality: Modality;
  timestamp: Date;
  version: number;
  features: FeatureVector;
  context?: Record<string, unknown>;
}

export interface TwinNode {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
}

export interface TwinEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  attributes: Record<string, unknown>;
}

export interface Constraint {
  id: string;
  description: string;
  predicate: (proposal: ActionProposal) => boolean;
  severity: 'info' | 'warning' | 'error';
}

export interface ActionProposal {
  id: string;
  assetId: string;
  description: string;
  objectiveScore: number;
  riskScore: number;
  payload: Record<string, unknown>;
}

export interface SimulationOutcome {
  proposalId: string;
  projectedKpis: Record<string, number>;
  uncertainty: number;
}

export interface DriftSignal {
  assetId: string;
  modality: Modality;
  driftMagnitude: number;
  reason: string;
}
