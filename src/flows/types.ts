export type FlowId = string;

export type FlowEdgeKind = 'http' | 'event' | 'db' | 'workflow' | 'unknown';

export type FlowConfidence = 'high' | 'medium' | 'low';

export interface FlowEntrypoint {
  uiPath?: string;
  httpPath?: string;
}

export interface FlowEdge {
  id: string;
  from: string;
  to: string;
  kind: FlowEdgeKind;
  evidence: string[];
  confidence: FlowConfidence;
}

export interface FlowDoc {
  id: FlowId;
  name: string;
  entrypoints: FlowEntrypoint[];
  edges: FlowEdge[];
}
