/**
 * INFOWAR Narrative Graph Ontology Types.
 */

export type NodeType = "Narrative" | "Claim" | "Actor" | "Platform" | "Event" | "Artifact" | "Regulation";

export type EdgeType = "AMPLIFIES" | "REFERENCES" | "TARGETS" | "COUPLED_WITH" | "EVIDENCED_BY" | "PART_OF";

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

export interface NarrativeNode extends GraphNode {
  label: "Narrative";
  properties: {
    title: string;
    description: string;
    confidence: number;
    evidence_ids: string[];
  };
}

export interface ClaimNode extends GraphNode {
  label: "Claim";
  properties: {
    assertion: string;
    confidence: number;
    evidence_ids: string[];
  };
}

export interface ActorNode extends GraphNode {
  label: "Actor";
  properties: {
    name: string;
    type: "individual" | "group" | "state-actor" | "bot";
    attribution_confidence: number;
  };
}
