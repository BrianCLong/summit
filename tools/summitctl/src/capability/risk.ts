import { CapabilityRegistry, GraphEdge, CapabilitySpec } from './types';
import { computeBlastRadius } from './graph';

const CLASSIFICATION_SCORES: Record<string, number> = {
  public: 1,
  internal: 3,
  confidential: 5,
  restricted: 8,
};

const OPERATION_SCORES: Record<string, number> = {
  read: 1,
  write: 3,
  delete: 5,
  exec: 4,
};

export type CapabilityRisk = {
  capability_id: string;
  score: number;
  blast_radius: {
    downstream_services: number;
    downstream_nodes: string[];
  };
  missing_metadata: string[];
};

export function scoreCapabilities(
  registry: CapabilityRegistry,
  edges: GraphEdge[],
): CapabilityRisk[] {
  return registry.capabilities.map((capability) => {
    const classificationScore =
      CLASSIFICATION_SCORES[capability.data_classification] ?? 4;
    const operationScore = capability.operations.reduce(
      (sum, op) => sum + (OPERATION_SCORES[op] ?? 2),
      0,
    );
    const missingMetadata: string[] = [];
    if (!capability.owner_team) missingMetadata.push('owner_team');
    if (!capability.oncall) missingMetadata.push('oncall');
    if (!capability.schemas?.input_schema_ref) missingMetadata.push('input_schema');
    if (!capability.schemas?.output_schema_ref) missingMetadata.push('output_schema');
    if (!capability.policy_refs?.length) missingMetadata.push('policy_refs');

    const blast = computeBlastRadius(edges, capability.capability_id);
    const fanoutScore = Math.min(blast.downstream.length, 10);

    const score = classificationScore + operationScore + fanoutScore;

    return {
      capability_id: capability.capability_id,
      score,
      blast_radius: {
        downstream_services: blast.downstream.length,
        downstream_nodes: blast.downstream,
      },
      missing_metadata: missingMetadata,
    };
  });
}

export type RiskDiff = {
  new_capabilities: string[];
  removed_capabilities: string[];
  scope_changes: string[];
  new_edges: Array<{ source: string; target: string }>;
};

export function diffRisk(
  previous: { capabilities: CapabilitySpec[] } | null,
  current: CapabilityRegistry,
  edges: GraphEdge[],
  previousEdges: GraphEdge[] | null,
): RiskDiff {
  const prevIds = new Set(previous?.capabilities.map((cap) => cap.capability_id) ?? []);
  const currentIds = new Set(current.capabilities.map((cap) => cap.capability_id));

  const new_capabilities = Array.from(currentIds).filter((id) => !prevIds.has(id));
  const removed_capabilities = Array.from(prevIds).filter((id) => !currentIds.has(id));

  const scope_changes: string[] = [];
  if (previous) {
    const prevMap = new Map(
      previous.capabilities.map((cap) => [cap.capability_id, cap]),
    );
    for (const cap of current.capabilities) {
      const prev = prevMap.get(cap.capability_id);
      if (!prev) continue;
      const prevScopes = prev.allowed_identities?.join(',') ?? '';
      const nextScopes = cap.allowed_identities?.join(',') ?? '';
      if (prevScopes !== nextScopes) {
        scope_changes.push(`${cap.capability_id}: ${prevScopes} -> ${nextScopes}`);
      }
    }
  }

  const edgeKey = (edge: GraphEdge) => `${edge.source}::${edge.target}`;
  const previousEdgeKeys = previousEdges
    ? new Set(previousEdges.map(edgeKey))
    : new Set<string>();
  const new_edges = previousEdges
    ? edges
        .filter((edge) => !previousEdgeKeys.has(edgeKey(edge)))
        .map((edge) => ({ source: edge.source, target: edge.target }))
    : [];

  return {
    new_capabilities: new_capabilities.sort(),
    removed_capabilities: removed_capabilities.sort(),
    scope_changes: scope_changes.sort(),
    new_edges,
  };
}
