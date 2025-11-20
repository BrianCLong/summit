/**
 * Shortest Path Algorithms
 * Dijkstra, A*, Bellman-Ford implementations
 */

import type { GraphStorage, Node, Edge, Path } from '@intelgraph/graph-database';

interface PriorityQueueItem {
  nodeId: string;
  distance: number;
  path: string[];
}

export class ShortestPathAlgorithms {
  constructor(private storage: GraphStorage) {}

  /**
   * Dijkstra's shortest path algorithm
   */
  dijkstra(sourceId: string, targetId: string): Path | null {
    const distances = new Map<string, number>();
    const previous = new Map<string, string>();
    const visited = new Set<string>();
    const queue: PriorityQueueItem[] = [];

    // Initialize
    distances.set(sourceId, 0);
    queue.push({ nodeId: sourceId, distance: 0, path: [sourceId] });

    while (queue.length > 0) {
      // Get node with minimum distance
      queue.sort((a, b) => a.distance - b.distance);
      const current = queue.shift()!;

      if (visited.has(current.nodeId)) continue;
      visited.add(current.nodeId);

      // Found target
      if (current.nodeId === targetId) {
        return this.reconstructPath(sourceId, targetId, previous);
      }

      // Explore neighbors
      const edges = this.storage.getOutgoingEdges(current.nodeId);

      for (const edge of edges) {
        if (visited.has(edge.targetId)) continue;

        const distance = current.distance + edge.weight;
        const currentDistance = distances.get(edge.targetId) ?? Infinity;

        if (distance < currentDistance) {
          distances.set(edge.targetId, distance);
          previous.set(edge.targetId, current.nodeId);
          queue.push({
            nodeId: edge.targetId,
            distance,
            path: [...current.path, edge.targetId]
          });
        }
      }
    }

    return null; // No path found
  }

  /**
   * A* pathfinding algorithm with heuristic
   */
  aStar(
    sourceId: string,
    targetId: string,
    heuristic: (nodeId: string, targetId: string) => number
  ): Path | null {
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    const previous = new Map<string, string>();
    const openSet: PriorityQueueItem[] = [];
    const closedSet = new Set<string>();

    gScore.set(sourceId, 0);
    fScore.set(sourceId, heuristic(sourceId, targetId));
    openSet.push({ nodeId: sourceId, distance: fScore.get(sourceId)!, path: [sourceId] });

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.distance - b.distance);
      const current = openSet.shift()!;

      if (current.nodeId === targetId) {
        return this.reconstructPath(sourceId, targetId, previous);
      }

      closedSet.add(current.nodeId);

      const edges = this.storage.getOutgoingEdges(current.nodeId);

      for (const edge of edges) {
        if (closedSet.has(edge.targetId)) continue;

        const tentativeGScore = (gScore.get(current.nodeId) ?? Infinity) + edge.weight;

        if (tentativeGScore < (gScore.get(edge.targetId) ?? Infinity)) {
          previous.set(edge.targetId, current.nodeId);
          gScore.set(edge.targetId, tentativeGScore);
          fScore.set(edge.targetId, tentativeGScore + heuristic(edge.targetId, targetId));

          if (!openSet.some(item => item.nodeId === edge.targetId)) {
            openSet.push({
              nodeId: edge.targetId,
              distance: fScore.get(edge.targetId)!,
              path: [...current.path, edge.targetId]
            });
          }
        }
      }
    }

    return null;
  }

  /**
   * Bellman-Ford algorithm (handles negative weights)
   */
  bellmanFord(sourceId: string, targetId: string): Path | null {
    const distances = new Map<string, number>();
    const previous = new Map<string, string>();

    // Get all nodes
    const exported = this.storage.exportGraph();
    const nodes = exported.nodes;
    const edges = exported.edges;

    // Initialize distances
    for (const node of nodes) {
      distances.set(node.id, Infinity);
    }
    distances.set(sourceId, 0);

    // Relax edges V-1 times
    for (let i = 0; i < nodes.length - 1; i++) {
      for (const edge of edges) {
        const sourceDistance = distances.get(edge.sourceId) ?? Infinity;
        const targetDistance = distances.get(edge.targetId) ?? Infinity;

        if (sourceDistance + edge.weight < targetDistance) {
          distances.set(edge.targetId, sourceDistance + edge.weight);
          previous.set(edge.targetId, edge.sourceId);
        }
      }
    }

    // Check for negative cycles
    for (const edge of edges) {
      const sourceDistance = distances.get(edge.sourceId) ?? Infinity;
      const targetDistance = distances.get(edge.targetId) ?? Infinity;

      if (sourceDistance + edge.weight < targetDistance) {
        throw new Error('Graph contains negative cycle');
      }
    }

    if (distances.get(targetId) === Infinity) {
      return null;
    }

    return this.reconstructPath(sourceId, targetId, previous);
  }

  /**
   * All pairs shortest paths (Floyd-Warshall)
   */
  allPairsShortestPaths(): Map<string, Map<string, number>> {
    const exported = this.storage.exportGraph();
    const nodes = exported.nodes;
    const edges = exported.edges;

    const dist = new Map<string, Map<string, number>>();

    // Initialize
    for (const node of nodes) {
      dist.set(node.id, new Map());
      for (const other of nodes) {
        if (node.id === other.id) {
          dist.get(node.id)!.set(other.id, 0);
        } else {
          dist.get(node.id)!.set(other.id, Infinity);
        }
      }
    }

    // Set edge weights
    for (const edge of edges) {
      dist.get(edge.sourceId)!.set(edge.targetId, edge.weight);
    }

    // Floyd-Warshall
    for (const k of nodes) {
      for (const i of nodes) {
        for (const j of nodes) {
          const distIK = dist.get(i.id)!.get(k.id) ?? Infinity;
          const distKJ = dist.get(k.id)!.get(j.id) ?? Infinity;
          const distIJ = dist.get(i.id)!.get(j.id) ?? Infinity;

          if (distIK + distKJ < distIJ) {
            dist.get(i.id)!.set(j.id, distIK + distKJ);
          }
        }
      }
    }

    return dist;
  }

  /**
   * K shortest paths
   */
  kShortestPaths(sourceId: string, targetId: string, k: number): Path[] {
    const paths: Path[] = [];
    const candidates: Path[] = [];

    // Get first shortest path
    const firstPath = this.dijkstra(sourceId, targetId);
    if (!firstPath) return [];

    paths.push(firstPath);

    for (let pathCount = 1; pathCount < k; pathCount++) {
      const lastPath = paths[paths.length - 1];

      // Generate candidate paths
      for (let i = 0; i < lastPath.nodes.length - 1; i++) {
        const spurNode = lastPath.nodes[i];
        const rootPath = lastPath.nodes.slice(0, i + 1);

        // Find spur path
        // This is a simplified implementation
        const spurPath = this.dijkstra(spurNode.id, targetId);
        if (spurPath) {
          candidates.push(spurPath);
        }
      }

      if (candidates.length === 0) break;

      // Get shortest candidate
      candidates.sort((a, b) => a.weight - b.weight);
      const nextPath = candidates.shift()!;
      paths.push(nextPath);
    }

    return paths;
  }

  private reconstructPath(sourceId: string, targetId: string, previous: Map<string, string>): Path | null {
    const path: string[] = [];
    let current = targetId;

    while (current !== sourceId) {
      path.unshift(current);
      const prev = previous.get(current);
      if (!prev) return null;
      current = prev;
    }
    path.unshift(sourceId);

    // Build path with nodes and edges
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let totalWeight = 0;

    for (let i = 0; i < path.length; i++) {
      const node = this.storage.getNode(path[i]);
      if (!node) return null;
      nodes.push(node);

      if (i < path.length - 1) {
        const outgoingEdges = this.storage.getOutgoingEdges(path[i]);
        const edge = outgoingEdges.find(e => e.targetId === path[i + 1]);
        if (!edge) return null;
        edges.push(edge);
        totalWeight += edge.weight;
      }
    }

    return {
      nodes,
      edges,
      length: path.length - 1,
      weight: totalWeight
    };
  }
}
