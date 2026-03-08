export enum NodeType {
  Narrative = 'Narrative',
  Claim = 'Claim',
  Actor = 'Actor',
  Platform = 'Platform',
  Event = 'Event',
  Artifact = 'Artifact',
  Regulation = 'Regulation',
}

export enum EdgeType {
  AMPLIFIES = 'AMPLIFIES',
  REFERENCES = 'REFERENCES',
  TARGETS = 'TARGETS',
  COUPLED_WITH = 'COUPLED_WITH',
  EVIDENCED_BY = 'EVIDENCED_BY',
}

export interface Node {
  id: string;
  type: NodeType;
  properties: Record<string, any>;
}

export interface Edge {
  sourceId: string;
  targetId: string;
  type: EdgeType;
  properties: Record<string, any>;
}
