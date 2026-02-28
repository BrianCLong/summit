/**
 * Minimal ontology types for INFOWAR Narrative Graph.
 */

export type NodeType = 'Narrative' | 'Claim' | 'Actor' | 'Platform' | 'Event' | 'Artifact' | 'Regulation';

export type EdgeType = 'AMPLIFIES' | 'REFERENCES' | 'TARGETS' | 'COUPLED_WITH' | 'EVIDENCED_BY' | 'PART_OF';

export interface GraphNode {
  id: string;
  label: NodeType;
  properties: Record<string, any>;
}

export interface GraphEdge {
  from: string;
  to: string;
  label: EdgeType;
  properties: Record<string, any>;
}
