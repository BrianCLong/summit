import type { WorkGraphNode } from '../schema/nodes.js';
import type { WorkGraphEdge } from '../schema/edges.js';

export interface ArchitectureHealthScore {
  score: number;
  trend30d: number;
  couplingScore: number;
  circularDependencies: number;
  subsystemViolations: number;
  hotspotInstability: number;
  primaryRisks: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Reference formula:
 * health = 100 - coupling_score * 20 - circular_dependencies * 10
 *          - subsystem_violations * 5 - hotspot_instability * 5
 */
export function calculateArchitectureHealth(
  nodes: WorkGraphNode[],
  edges: WorkGraphEdge[],
): ArchitectureHealthScore {
  const dependencyEdges = edges.filter(edge => edge.type === 'depends_on');

  const outgoing = new Map<string, number>();
  const incoming = new Map<string, number>();
  for (const edge of dependencyEdges) {
    outgoing.set(edge.sourceId, (outgoing.get(edge.sourceId) || 0) + 1);
    incoming.set(edge.targetId, (incoming.get(edge.targetId) || 0) + 1);
  }

  const maxOut = Math.max(1, ...outgoing.values());
  const maxIn = Math.max(1, ...incoming.values());
  const couplingScore = clamp((maxOut + maxIn) / 20, 0, 1);

  const graph = new Map<string, string[]>();
  for (const edge of dependencyEdges) {
    if (!graph.has(edge.sourceId)) {
      graph.set(edge.sourceId, []);
    }
    graph.get(edge.sourceId)?.push(edge.targetId);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  let circularDependencies = 0;
  const dfs = (nodeId: string): void => {
    if (visiting.has(nodeId)) {
      circularDependencies += 1;
      return;
    }
    if (visited.has(nodeId)) {
      return;
    }
    visiting.add(nodeId);
    for (const neighbor of graph.get(nodeId) || []) {
      dfs(neighbor);
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
  };

  for (const node of nodes) {
    dfs(node.id);
  }
  circularDependencies = Math.min(circularDependencies, 10);

  const subsystemViolations = edges.filter(edge => edge.type === 'blocks').length;

  const instabilityThreshold = 4;
  const hotspotInstability = Array.from(outgoing.values()).filter(
    count => count >= instabilityThreshold,
  ).length;

  const rawScore =
    100 -
    couplingScore * 20 -
    circularDependencies * 10 -
    subsystemViolations * 5 -
    hotspotInstability * 5;
  const score = clamp(Math.round(rawScore), 0, 100);

  const trend30d = clamp(
    Math.round((couplingScore * -3 - circularDependencies * 0.7) * 10) / 10,
    -25,
    10,
  );

  const riskCandidates: Array<[string, number]> = [
    ['dependency fan-in', maxIn],
    ['subsystem coupling', Math.round(couplingScore * 10)],
    ['circular dependencies', circularDependencies],
    ['hotspot instability', hotspotInstability],
  ];

  const primaryRisks = riskCandidates
    .filter(([, magnitude]) => magnitude > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label]) => label);

  return {
    score,
    trend30d,
    couplingScore: Math.round(couplingScore * 100) / 100,
    circularDependencies,
    subsystemViolations,
    hotspotInstability,
    primaryRisks,
  };
}

