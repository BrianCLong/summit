import type { ConnectorOutput, NormalizedEdge, NormalizedEntity } from "./types.js";

export function makeEntity(input: {
  entity_id: string;
  entity_type: string;
  canonical_value: string;
  display_name?: string;
  confidence?: number;
  source_refs?: string[];
  attributes?: Record<string, unknown>;
}): NormalizedEntity {
  return {
    entity_id: input.entity_id,
    entity_type: input.entity_type,
    canonical_value: input.canonical_value,
    display_name: input.display_name ?? input.canonical_value,
    confidence: input.confidence ?? 1,
    source_refs: input.source_refs ?? [],
    attributes: input.attributes ?? {}
  };
}

export function makeEdge(input: {
  edge_id: string;
  edge_type: string;
  from: string;
  to: string;
  confidence?: number;
  source_refs?: string[];
  attributes?: Record<string, unknown>;
}): NormalizedEdge {
  return {
    edge_id: input.edge_id,
    edge_type: input.edge_type,
    from: input.from,
    to: input.to,
    confidence: input.confidence ?? 1,
    source_refs: input.source_refs ?? [],
    attributes: input.attributes ?? {}
  };
}

export function finalizeOutput(output: ConnectorOutput): ConnectorOutput {
  return {
    ...output,
    entities: [...output.entities].sort((a, b) => a.entity_id.localeCompare(b.entity_id)),
    edges: [...output.edges].sort((a, b) => a.edge_id.localeCompare(b.edge_id)),
    observations: [...output.observations]
  };
}
