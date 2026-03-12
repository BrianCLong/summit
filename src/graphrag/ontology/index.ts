export type NodeType =
  | 'Narrative'
  | 'Claim'
  | 'Actor'
  | 'Platform'
  | 'Event'
  | 'Artifact'
  | 'Regulation';

export type EdgeType =
  | 'AMPLIFIES'
  | 'REFERENCES'
  | 'TARGETS'
  | 'COUPLED_WITH'
  | 'EVIDENCED_BY';

export interface GraphNode {
  id: string;
  type: NodeType;
  properties: Record<string, any>;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: EdgeType;
  properties: Record<string, any>;
}
