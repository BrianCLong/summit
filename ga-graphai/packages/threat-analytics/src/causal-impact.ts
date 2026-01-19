import type {
  CausalImpactOptions,
  CausalImpactResult,
  CascadeEdge,
  CascadeGraph,
  CascadeNode,
} from './types';

type GraphMetrics = {
  reach: number;
  depth: number;
  breadth: number;
};

export class CausalImpactEstimator {
  private readonly defaultReach: number;

  constructor(options?: CausalImpactOptions) {
    this.defaultReach = options?.defaultReach ?? 1;
  }

  estimateActorRemovalImpact(cascade: CascadeGraph, actorIds: string[]): CausalImpactResult {
    const removedActorIds = Array.from(new Set(actorIds));
    const removedNodes = cascade.nodes.filter((node) => removedActorIds.includes(node.actorId));
    const removedNodeIds = removedNodes.map((node) => node.id);
    const affectedNodeIds = this.expandDownstream(cascade, removedNodeIds);

    const remainingNodes = cascade.nodes.filter((node) => !affectedNodeIds.includes(node.id));
    const remainingEdges = cascade.edges.filter(
      (edge) =>
        remainingNodes.some((node) => node.id === edge.source) &&
        remainingNodes.some((node) => node.id === edge.target),
    );

    const baseline = this.computeMetrics(cascade.nodes, cascade.edges);
    const counterfactual = this.computeMetrics(remainingNodes, remainingEdges);

    return {
      removedActorIds,
      removedNodeIds,
      affectedNodeIds,
      baselineReach: baseline.reach,
      counterfactualReach: counterfactual.reach,
      reachDelta: baseline.reach - counterfactual.reach,
      baselineDepth: baseline.depth,
      counterfactualDepth: counterfactual.depth,
      depthDelta: baseline.depth - counterfactual.depth,
      baselineBreadth: baseline.breadth,
      counterfactualBreadth: counterfactual.breadth,
      breadthDelta: baseline.breadth - counterfactual.breadth,
    } satisfies CausalImpactResult;
  }

  private expandDownstream(cascade: CascadeGraph, removedNodeIds: string[]): string[] {
    const adjacency = this.buildAdjacency(cascade.edges);
    const affected = new Set<string>(removedNodeIds);
    const queue = [...removedNodeIds];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        continue;
      }
      const next = adjacency.get(current) ?? [];
      for (const nodeId of next) {
        if (!affected.has(nodeId)) {
          affected.add(nodeId);
          queue.push(nodeId);
        }
      }
    }
    return Array.from(affected);
  }

  private computeMetrics(nodes: CascadeNode[], edges: CascadeEdge[]): GraphMetrics {
    if (nodes.length === 0) {
      return { reach: 0, depth: 0, breadth: 0 };
    }

    const nodeIds = new Set(nodes.map((node) => node.id));
    const adjacency = this.buildAdjacency(edges, nodeIds);
    const indegree = new Map<string, number>();

    for (const node of nodes) {
      indegree.set(node.id, 0);
    }
    for (const edge of edges) {
      if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
        indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
      }
    }

    const roots = nodes.filter((node) => (indegree.get(node.id) ?? 0) === 0).map((node) => node.id);
    const seeds = roots.length > 0 ? roots : nodes.map((node) => node.id);

    const depth = new Map<string, number>();
    const queue: string[] = [];
    for (const seed of seeds) {
      depth.set(seed, 0);
      queue.push(seed);
    }

    const maxIterations = Math.max(edges.length * 2, nodes.length * 2, 1);
    let iterations = 0;

    while (queue.length > 0 && iterations < maxIterations) {
      const current = queue.shift();
      if (!current) {
        iterations += 1;
        continue;
      }
      const currentDepth = depth.get(current) ?? 0;
      const neighbors = adjacency.get(current) ?? [];
      for (const neighbor of neighbors) {
        const candidate = currentDepth + 1;
        const existing = depth.get(neighbor);
        if (existing === undefined || candidate > existing) {
          depth.set(neighbor, candidate);
          queue.push(neighbor);
        }
      }
      iterations += 1;
    }

    const breadthBuckets = new Map<number, number>();
    for (const [nodeId, nodeDepth] of depth.entries()) {
      if (!nodeIds.has(nodeId)) {
        continue;
      }
      breadthBuckets.set(nodeDepth, (breadthBuckets.get(nodeDepth) ?? 0) + 1);
    }

    const breadth = Math.max(...breadthBuckets.values(), 0);
    const maxDepth = Math.max(...depth.values(), 0);
    const reach = nodes.reduce((total, node) => total + (node.reach ?? this.defaultReach), 0);

    return {
      reach,
      depth: maxDepth,
      breadth,
    };
  }

  private buildAdjacency(edges: CascadeEdge[], nodeFilter?: Set<string>): Map<string, string[]> {
    const adjacency = new Map<string, string[]>();
    for (const edge of edges) {
      if (nodeFilter && (!nodeFilter.has(edge.source) || !nodeFilter.has(edge.target))) {
        continue;
      }
      const existing = adjacency.get(edge.source) ?? [];
      existing.push(edge.target);
      adjacency.set(edge.source, existing);
    }
    return adjacency;
  }
}
