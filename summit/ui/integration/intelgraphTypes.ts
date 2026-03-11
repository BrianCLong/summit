export type IntelGraphNodeType =
  | 'Entity'
  | 'Event'
  | 'Source'
  | 'Relationship'
  | 'Narrative'
  | 'Insight';

export interface IntelGraphNode {
  id: string;
  type: IntelGraphNodeType;
  label: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface IntelGraphRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  weight?: number;
  evidenceIds?: string[];
}

export interface IntelGraphClient {
  queryGraph: (query: string, variables?: Record<string, unknown>) => Promise<unknown>;
  upsertNodes: (nodes: IntelGraphNode[]) => Promise<void>;
  upsertRelationships: (relationships: IntelGraphRelationship[]) => Promise<void>;
}
