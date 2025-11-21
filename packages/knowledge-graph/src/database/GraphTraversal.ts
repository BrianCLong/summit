/**
 * Graph traversal and path finding algorithms
 */

import { GraphNode, GraphEdge, GraphTraversalOptions } from '../types.js';
import { Logger } from '../utils/Logger.js';

export interface TraversalResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  paths: GraphNode[][];
  depth: number;
  totalVisited: number;
}

export interface PathResult {
  path: GraphNode[];
  edges: GraphEdge[];
  totalWeight: number;
  length: number;
}

export class GraphTraversal {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('GraphTraversal');
  }

  /**
   * Breadth-first traversal from a starting node
   */
  async bfs(
    startId: string,
    getNeighbors: (nodeId: string) => Promise<Array<{ node: GraphNode; edge: GraphEdge }>>,
    options: GraphTraversalOptions = {}
  ): Promise<TraversalResult> {
    const { maxDepth = 10, filter } = options;

    const visited = new Set<string>();
    const result: TraversalResult = {
      nodes: [],
      edges: [],
      paths: [],
      depth: 0,
      totalVisited: 0
    };

    interface QueueItem {
      nodeId: string;
      depth: number;
      path: GraphNode[];
    }

    const queue: QueueItem[] = [{ nodeId: startId, depth: 0, path: [] }];

    while (queue.length > 0) {
      const { nodeId, depth, path } = queue.shift()!;

      if (visited.has(nodeId) || depth > maxDepth) {
        continue;
      }

      visited.add(nodeId);
      result.totalVisited++;
      result.depth = Math.max(result.depth, depth);

      const neighbors = await getNeighbors(nodeId);

      for (const { node, edge } of neighbors) {
        // Apply filter if provided
        if (filter && !filter(node, edge)) {
          continue;
        }

        if (!visited.has(node.id)) {
          result.nodes.push(node);
          result.edges.push(edge);

          const newPath = [...path, node];
          result.paths.push(newPath);

          queue.push({
            nodeId: node.id,
            depth: depth + 1,
            path: newPath
          });
        }
      }
    }

    return result;
  }

  /**
   * Depth-first traversal from a starting node
   */
  async dfs(
    startId: string,
    getNeighbors: (nodeId: string) => Promise<Array<{ node: GraphNode; edge: GraphEdge }>>,
    options: GraphTraversalOptions = {}
  ): Promise<TraversalResult> {
    const { maxDepth = 10, filter } = options;

    const visited = new Set<string>();
    const result: TraversalResult = {
      nodes: [],
      edges: [],
      paths: [],
      depth: 0,
      totalVisited: 0
    };

    const dfsRecursive = async (
      nodeId: string,
      depth: number,
      path: GraphNode[]
    ): Promise<void> => {
      if (visited.has(nodeId) || depth > maxDepth) {
        return;
      }

      visited.add(nodeId);
      result.totalVisited++;
      result.depth = Math.max(result.depth, depth);

      const neighbors = await getNeighbors(nodeId);

      for (const { node, edge } of neighbors) {
        if (filter && !filter(node, edge)) {
          continue;
        }

        if (!visited.has(node.id)) {
          result.nodes.push(node);
          result.edges.push(edge);

          const newPath = [...path, node];
          result.paths.push(newPath);

          await dfsRecursive(node.id, depth + 1, newPath);
        }
      }
    };

    await dfsRecursive(startId, 0, []);
    return result;
  }

  /**
   * Find shortest path using Dijkstra's algorithm
   */
  async dijkstra(
    startId: string,
    endId: string,
    getNeighbors: (nodeId: string) => Promise<Array<{ node: GraphNode; edge: GraphEdge }>>,
    getWeight: (edge: GraphEdge) => number = () => 1
  ): Promise<PathResult | null> {
    const distances = new Map<string, number>();
    const previous = new Map<string, { nodeId: string; edge: GraphEdge }>();
    const unvisited = new Set<string>();

    distances.set(startId, 0);
    unvisited.add(startId);

    while (unvisited.size > 0) {
      // Get node with minimum distance
      let currentId: string | null = null;
      let minDistance = Infinity;

      for (const nodeId of unvisited) {
        const dist = distances.get(nodeId) ?? Infinity;
        if (dist < minDistance) {
          minDistance = dist;
          currentId = nodeId;
        }
      }

      if (currentId === null || minDistance === Infinity) {
        break;
      }

      if (currentId === endId) {
        // Reconstruct path
        return this.reconstructPath(startId, endId, previous, distances.get(endId)!);
      }

      unvisited.delete(currentId);

      const neighbors = await getNeighbors(currentId);

      for (const { node, edge } of neighbors) {
        const weight = getWeight(edge);
        const tentativeDistance = (distances.get(currentId) ?? Infinity) + weight;

        if (tentativeDistance < (distances.get(node.id) ?? Infinity)) {
          distances.set(node.id, tentativeDistance);
          previous.set(node.id, { nodeId: currentId, edge });
          unvisited.add(node.id);
        }
      }
    }

    return null; // No path found
  }

  /**
   * Find all paths between two nodes (up to maxPaths)
   */
  async findAllPaths(
    startId: string,
    endId: string,
    getNeighbors: (nodeId: string) => Promise<Array<{ node: GraphNode; edge: GraphEdge }>>,
    maxDepth: number = 5,
    maxPaths: number = 10
  ): Promise<PathResult[]> {
    const paths: PathResult[] = [];

    const findPathsRecursive = async (
      currentId: string,
      visited: Set<string>,
      currentPath: string[],
      currentEdges: GraphEdge[],
      totalWeight: number
    ): Promise<void> => {
      if (paths.length >= maxPaths) {
        return;
      }

      if (currentPath.length > maxDepth) {
        return;
      }

      if (currentId === endId) {
        paths.push({
          path: currentPath.map(id => ({ id, type: '', properties: {} } as GraphNode)),
          edges: currentEdges,
          totalWeight,
          length: currentPath.length - 1
        });
        return;
      }

      const neighbors = await getNeighbors(currentId);

      for (const { node, edge } of neighbors) {
        if (!visited.has(node.id)) {
          visited.add(node.id);

          await findPathsRecursive(
            node.id,
            visited,
            [...currentPath, node.id],
            [...currentEdges, edge],
            totalWeight + (edge.weight ?? 1)
          );

          visited.delete(node.id);
        }
      }
    };

    const visited = new Set<string>([startId]);
    await findPathsRecursive(startId, visited, [startId], [], 0);

    return paths;
  }

  /**
   * Find k-hop neighborhood
   */
  async kHopNeighborhood(
    startId: string,
    k: number,
    getNeighbors: (nodeId: string) => Promise<Array<{ node: GraphNode; edge: GraphEdge }>>
  ): Promise<Map<number, Set<string>>> {
    const hops = new Map<number, Set<string>>();
    const visited = new Set<string>([startId]);

    let currentLevel = new Set<string>([startId]);
    hops.set(0, new Set([startId]));

    for (let hop = 1; hop <= k; hop++) {
      const nextLevel = new Set<string>();

      for (const nodeId of currentLevel) {
        const neighbors = await getNeighbors(nodeId);

        for (const { node } of neighbors) {
          if (!visited.has(node.id)) {
            visited.add(node.id);
            nextLevel.add(node.id);
          }
        }
      }

      hops.set(hop, nextLevel);
      currentLevel = nextLevel;
    }

    return hops;
  }

  /**
   * Reconstruct path from Dijkstra's result
   */
  private reconstructPath(
    startId: string,
    endId: string,
    previous: Map<string, { nodeId: string; edge: GraphEdge }>,
    totalWeight: number
  ): PathResult {
    const path: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    let currentId = endId;

    while (currentId !== startId) {
      path.unshift({ id: currentId, type: '', properties: {} } as GraphNode);

      const prev = previous.get(currentId);
      if (!prev) break;

      edges.unshift(prev.edge);
      currentId = prev.nodeId;
    }

    path.unshift({ id: startId, type: '', properties: {} } as GraphNode);

    return {
      path,
      edges,
      totalWeight,
      length: path.length - 1
    };
  }
}
