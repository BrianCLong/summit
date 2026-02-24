export const INFLUENCE_OPS_ENTITY_TYPES = [
  'Account',
  'Persona',
  'Channel',
  'Post',
  'Media',
  'Narrative',
  'Claim',
  'Campaign',
  'ActorHypothesis',
] as const;

export type InfluenceOpsEntityType =
  (typeof INFLUENCE_OPS_ENTITY_TYPES)[number];

export const INFLUENCE_OPS_RELATION_TYPES = [
  'AMPLIFIES',
  'COORDINATES_WITH',
  'REPOSTS',
  'DERIVES_FROM',
  'TARGETS',
  'LOCALIZES_TO',
  'LIKELY_SAME_AS',
] as const;

export type InfluenceOpsRelationType =
  (typeof INFLUENCE_OPS_RELATION_TYPES)[number];

export interface InfluenceOpsProvenance {
  sourceId: string;
  collectedAt: string;
  method: 'API' | 'API_LESS' | 'HUMAN_REPORT' | 'INFERENCE';
  transformChain: string[];
  confidence: number;
}

export interface InfluenceOpsTemporalWindow {
  observedAtStart: string;
  observedAtEnd?: string;
  ingestRunId?: string;
}

export interface InfluenceOpsNode {
  id: string;
  type: InfluenceOpsEntityType;
  tenantId: string;
  properties?: Record<string, unknown>;
  provenance: InfluenceOpsProvenance;
  temporal: InfluenceOpsTemporalWindow;
}

export interface InfluenceOpsEdge {
  source: string;
  target: string;
  type: InfluenceOpsRelationType;
  tenantId: string;
  properties?: Record<string, unknown>;
  provenance: InfluenceOpsProvenance;
  temporal: InfluenceOpsTemporalWindow;
}

export interface InfluenceOpsGraph {
  nodes: InfluenceOpsNode[];
  edges: InfluenceOpsEdge[];
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortValue(item));
  }

  if (value !== null && typeof value === 'object') {
    const sortedEntries = Object.entries(value as Record<string, unknown>).sort(
      ([a], [b]) => a.localeCompare(b),
    );
    return sortedEntries.reduce<Record<string, unknown>>((acc, [k, v]) => {
      acc[k] = sortValue(v);
      return acc;
    }, {});
  }

  return value;
}

export function canonicalizeInfluenceOpsGraph(
  graph: InfluenceOpsGraph,
): InfluenceOpsGraph {
  return {
    nodes: [...graph.nodes]
      .map((node) => ({
        ...node,
        properties: node.properties
          ? (sortValue(node.properties) as Record<string, unknown>)
          : undefined,
      }))
      .sort((a, b) => {
        const typeCmp = a.type.localeCompare(b.type);
        if (typeCmp !== 0) return typeCmp;
        return a.id.localeCompare(b.id);
      }),
    edges: [...graph.edges]
      .map((edge) => ({
        ...edge,
        properties: edge.properties
          ? (sortValue(edge.properties) as Record<string, unknown>)
          : undefined,
      }))
      .sort((a, b) => {
        const sourceCmp = a.source.localeCompare(b.source);
        if (sourceCmp !== 0) return sourceCmp;

        const targetCmp = a.target.localeCompare(b.target);
        if (targetCmp !== 0) return targetCmp;

        return a.type.localeCompare(b.type);
      }),
  };
}

export function toCanonicalInfluenceOpsJson(graph: InfluenceOpsGraph): string {
  return JSON.stringify(canonicalizeInfluenceOpsGraph(graph));
}
