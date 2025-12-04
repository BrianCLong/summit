export interface Node {
  id: string;
  label: string; // e.g., 'Person', 'Org'
  properties: Record<string, any>;
  riskScore?: number;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  type: string;
  properties: Record<string, any>;
  weight?: number;
}

export interface GraphSnapshot {
  nodes: Node[];
  edges: Edge[];
  metadata: {
    timestamp: number;
    investigationId?: string;
  };
}

export interface LegalBasis {
  purpose: string;
  policyId: string;
  approvedBy?: string;
}

export interface ForecastRequest {
  entityId: string;
  metric: 'risk' | 'centrality' | 'activity';
  horizon: number; // periods ahead
  legalBasis: LegalBasis;
}

export interface ForecastResult {
  entityId: string;
  metric: string;
  historical: { timestamp: number; value: number }[];
  forecast: { timestamp: number; value: number; confidenceInterval?: [number, number] }[];
  modelUsed: string;
}

export interface WhatIfRequest {
  baseSnapshotId?: string; // Optional: if omitted, fetch current live snapshot of context
  investigationId: string; // To scope the snapshot fetch
  injectedNodes: Node[];
  injectedEdges: Edge[];
  legalBasis: LegalBasis;
}

export interface GraphMetrics {
  density: number;
  avgDegree: number;
  centrality: Record<string, number>; // nodeId -> score
  communities: number; // count
}

export interface WhatIfResult {
  baselineMetrics: GraphMetrics;
  scenarioMetrics: GraphMetrics;
  delta: {
    density: number;
    avgDegree: number;
    centrality: Record<string, number>;
  };
}

export interface SimulationRequest {
  seedEntityIds: string[];
  investigationId: string;
  steps: number;
  parameters: {
    spreadProbability: number;
    decayFactor: number;
  };
  legalBasis: LegalBasis;
}

export interface SimulationStep {
  step: number;
  infectedNodeIds: string[];
  activeEdges: string[];
}

export interface SimulationResult {
  trajectory: SimulationStep[];
  impactAssessment: {
    totalReached: number;
    criticalNodesReached: string[];
  };
}
