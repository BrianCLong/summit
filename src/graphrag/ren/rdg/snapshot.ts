import { RDGNode, RDGEdge } from './schema';

export interface RDGSnapshot {
  tenant_id: string;
  timestamp: string; // ISO8601
  nodes: RDGNode[];
  edges: RDGEdge[];
  metadata: {
    artifact_count: number;
    node_count: number;
    edge_count: number;
  };
}

export function createSnapshot(tenantId: string, nodes: RDGNode[], edges: RDGEdge[]): RDGSnapshot {
  return {
    tenant_id: tenantId,
    timestamp: new Date().toISOString(),
    nodes,
    edges,
    metadata: {
      artifact_count: nodes.filter(n => n.type === 'Artifact').length,
      node_count: nodes.length,
      edge_count: edges.length
    }
  };
}
