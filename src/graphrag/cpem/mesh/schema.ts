export type NodeType = 'ZONE' | 'SENSOR' | 'ASSET_IT' | 'ASSET_OT' | 'PERSON' | 'EVENT_DRONE' | 'EVENT_RF';

export interface CPEMNode {
  id: string;
  type: NodeType;
  labels: string[];
  properties: Record<string, any>;
}

export type EdgeType =
  | 'ADJACENT_TO'
  | 'CONTAINS'
  | 'LINE_OF_SIGHT'
  | 'ACOUSTIC_COUPLING'
  | 'RF_REACH'
  | 'MONITORS'
  | 'NETWORK_LINK'
  | 'OT_LINK'
  | 'HAS_ACCESS';

export interface CPEMEdge {
  source: string;
  target: string;
  type: EdgeType;
  properties: Record<string, any>;
}

export interface CPEMGraph {
  nodes: Map<string, CPEMNode>;
  edges: CPEMEdge[];
}
