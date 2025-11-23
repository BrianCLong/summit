import {
  Graph,
  Path,
  PathQueryConstraints,
  NodePolicyFilter,
  EdgePolicyFilter,
} from '../types/analytics';
import { logger } from '../utils/logger';

/**
 * Pathfinding Algorithms
 *
 * Implements shortest path and K-shortest paths with policy-aware filtering
 */

interface AdjacencyList {
  [nodeId: string]: {
    neighbors: string[];
    edges: { toId: string; edgeId: string; type: string; weight: number }[];
  };
}

/**
 * Build adjacency list from graph with filters applied
 */
function buildAdjacencyList(
  graph: Graph,
  constraints?: PathQueryConstraints,
  nodePolicyFilter?: NodePolicyFilter,
  edgePolicyFilter?: EdgePolicyFilter,
): {
  adj: AdjacencyList;
  filteredNodesCount: number;
  filteredEdgesCount: number;
} {
  const adj: AdjacencyList = {};
  let filteredNodesCount = 0;
  let filteredEdgesCount = 0;

  // Filter nodes
  const allowedNodeIds = new Set<string>();
  for (const node of graph.nodes) {
    // Apply label constraints
    if (constraints?.disallowedNodeLabels?.length) {
      if (
        node.labels.some((label) =>
          constraints.disallowedNodeLabels!.includes(label),
        )
      ) {
        filteredNodesCount++;
        continue;
      }
    }

    if (constraints?.requiredNodeLabels?.length) {
      if (
        !node.labels.some((label) =>
          constraints.requiredNodeLabels!.includes(label),
        )
      ) {
        filteredNodesCount++;
        continue;
      }
    }

    // Apply policy filter
    if (nodePolicyFilter && !nodePolicyFilter(node)) {
      filteredNodesCount++;
      continue;
    }

    allowedNodeIds.add(node.id);
    adj[node.id] = { neighbors: [], edges: [] };
  }

  // Filter edges
  for (const edge of graph.edges) {
    // Skip if nodes not allowed
    if (!allowedNodeIds.has(edge.fromId) || !allowedNodeIds.has(edge.toId)) {
      filteredEdgesCount++;
      continue;
    }

    // Apply edge type constraints
    if (constraints?.disallowedEdgeTypes?.length) {
      if (constraints.disallowedEdgeTypes.includes(edge.type)) {
        filteredEdgesCount++;
        continue;
      }
    }

    if (constraints?.requiredEdgeTypes?.length) {
      if (!constraints.requiredEdgeTypes.includes(edge.type)) {
        filteredEdgesCount++;
        continue;
      }
    }

    // Apply policy filter
    if (edgePolicyFilter && !edgePolicyFilter(edge)) {
      filteredEdgesCount++;
      continue;
    }

    const weight = edge.weight || 1;

    // Add forward edge
    if (!adj[edge.fromId]) {
      adj[edge.fromId] = { neighbors: [], edges: [] };
    }
    adj[edge.fromId].neighbors.push(edge.toId);
    adj[edge.fromId].edges.push({
      toId: edge.toId,
      edgeId: edge.id,
      type: edge.type,
      weight,
    });

    // Add backward edge for undirected or BOTH direction
    if (
      !constraints?.direction ||
      constraints.direction === 'BOTH' ||
      edge.direction === 'undirected'
    ) {
      if (!adj[edge.toId]) {
        adj[edge.toId] = { neighbors: [], edges: [] };
      }
      adj[edge.toId].neighbors.push(edge.fromId);
      adj[edge.toId].edges.push({
        toId: edge.fromId,
        edgeId: edge.id,
        type: edge.type,
        weight,
      });
    }
  }

  return { adj, filteredNodesCount, filteredEdgesCount };
}

/**
 * Find shortest path using BFS (unweighted) or Dijkstra (weighted)
 */
export function shortestPath(
  graph: Graph,
  startNodeId: string,
  endNodeId: string,
  constraints?: PathQueryConstraints,
  nodePolicyFilter?: NodePolicyFilter,
  edgePolicyFilter?: EdgePolicyFilter,
): {
  path: Path | null;
  filteredNodesCount: number;
  filteredEdgesCount: number;
} {
  const { adj, filteredNodesCount, filteredEdgesCount } = buildAdjacencyList(
    graph,
    constraints,
    nodePolicyFilter,
    edgePolicyFilter,
  );

  if (!adj[startNodeId] || !adj[endNodeId]) {
    logger.warn('Start or end node not found or filtered out');
    return { path: null, filteredNodesCount, filteredEdgesCount };
  }

  const maxDepth = constraints?.maxDepth || 100;

  // BFS/Dijkstra
  const distances = new Map<string, number>();
  const previous = new Map<string, { nodeId: string; edgeId: string; type: string }>();
  const visited = new Set<string>();

  // Priority queue (min-heap) - using array for simplicity
  const queue: { nodeId: string; distance: number }[] = [
    { nodeId: startNodeId, distance: 0 },
  ];
  distances.set(startNodeId, 0);

  while (queue.length > 0) {
    // Get node with minimum distance
    queue.sort((a, b) => a.distance - b.distance);
    const current = queue.shift()!;

    if (visited.has(current.nodeId)) continue;
    visited.add(current.nodeId);

    if (current.nodeId === endNodeId) break;

    const currentDist = distances.get(current.nodeId)!;
    if (currentDist >= maxDepth) continue;

    const neighbors = adj[current.nodeId];
    if (!neighbors) continue;

    for (const edgeInfo of neighbors.edges) {
      const { toId, edgeId, type, weight } = edgeInfo;

      if (visited.has(toId)) continue;

      const newDist = currentDist + weight;
      const oldDist = distances.get(toId) ?? Infinity;

      if (newDist < oldDist) {
        distances.set(toId, newDist);
        previous.set(toId, { nodeId: current.nodeId, edgeId, type });
        queue.push({ nodeId: toId, distance: newDist });
      }
    }
  }

  // Reconstruct path
  if (!previous.has(endNodeId) && startNodeId !== endNodeId) {
    return { path: null, filteredNodesCount, filteredEdgesCount };
  }

  const nodeIds: string[] = [];
  const edgeIds: string[] = [];
  const relationships: string[] = [];
  let current = endNodeId;
  let totalWeight = 0;

  while (current !== startNodeId) {
    nodeIds.unshift(current);
    const prev = previous.get(current);
    if (!prev) break;

    edgeIds.unshift(prev.edgeId);
    relationships.unshift(prev.type);
    totalWeight = distances.get(current) || 0;
    current = prev.nodeId;
  }
  nodeIds.unshift(startNodeId);

  const path: Path = {
    nodeIds,
    edgeIds,
    length: nodeIds.length - 1,
    weight: totalWeight,
    relationships,
  };

  return { path, filteredNodesCount, filteredEdgesCount };
}

/**
 * Find K-shortest paths using Yen's algorithm (simplified)
 */
export function kShortestPaths(
  graph: Graph,
  startNodeId: string,
  endNodeId: string,
  k: number,
  constraints?: PathQueryConstraints,
  nodePolicyFilter?: NodePolicyFilter,
  edgePolicyFilter?: EdgePolicyFilter,
): {
  paths: Path[];
  filteredNodesCount: number;
  filteredEdgesCount: number;
} {
  const results: Path[] = [];
  const { path: firstPath, filteredNodesCount, filteredEdgesCount } =
    shortestPath(
      graph,
      startNodeId,
      endNodeId,
      constraints,
      nodePolicyFilter,
      edgePolicyFilter,
    );

  if (!firstPath) {
    return { paths: [], filteredNodesCount, filteredEdgesCount };
  }

  results.push(firstPath);

  // Candidate paths
  const candidates: Path[] = [];

  for (let pathIndex = 0; pathIndex < k - 1 && pathIndex < results.length; pathIndex++) {
    const prevPath = results[pathIndex];

    // For each node in the previous path (except last)
    for (let i = 0; i < prevPath.nodeIds.length - 1; i++) {
      const spurNode = prevPath.nodeIds[i];
      const rootPath = {
        nodeIds: prevPath.nodeIds.slice(0, i + 1),
        edgeIds: prevPath.edgeIds.slice(0, i),
        length: i,
        relationships: prevPath.relationships.slice(0, i),
      };

      // Remove edges that would create duplicate paths
      const edgesToRemove = new Set<string>();
      const nodesToRemove = new Set<string>();

      for (const existingPath of results) {
        if (existingPath.nodeIds.length > i) {
          const matches = rootPath.nodeIds.every(
            (nodeId, idx) => existingPath.nodeIds[idx] === nodeId,
          );
          if (matches && i < existingPath.edgeIds.length) {
            edgesToRemove.add(existingPath.edgeIds[i]);
          }
        }
      }

      // Also remove root path nodes (except spur node)
      for (let j = 0; j < i; j++) {
        nodesToRemove.add(rootPath.nodeIds[j]);
      }

      // Create modified graph
      const modifiedGraph: Graph = {
        nodes: graph.nodes.filter((n) => !nodesToRemove.has(n.id)),
        edges: graph.edges.filter((e) => !edgesToRemove.has(e.id)),
      };

      // Find spur path
      const { path: spurPath } = shortestPath(
        modifiedGraph,
        spurNode,
        endNodeId,
        constraints,
        nodePolicyFilter,
        edgePolicyFilter,
      );

      if (spurPath && spurPath.nodeIds.length > 1) {
        // Combine root path and spur path
        const totalPath: Path = {
          nodeIds: [...rootPath.nodeIds, ...spurPath.nodeIds.slice(1)],
          edgeIds: [...rootPath.edgeIds, ...spurPath.edgeIds],
          length: rootPath.length + spurPath.length,
          weight:
            (rootPath.weight || rootPath.length) +
            (spurPath.weight || spurPath.length),
          relationships: [...rootPath.relationships, ...spurPath.relationships],
        };

        // Check if this path is unique
        const pathSignature = totalPath.nodeIds.join('->');
        const isDuplicate = candidates.some(
          (p) => p.nodeIds.join('->') === pathSignature,
        );

        if (!isDuplicate) {
          candidates.push(totalPath);
        }
      }
    }

    if (candidates.length === 0) break;

    // Sort candidates by length/weight
    candidates.sort((a, b) => {
      const aWeight = a.weight || a.length;
      const bWeight = b.weight || b.length;
      return aWeight - bWeight;
    });

    // Add best candidate to results
    const bestCandidate = candidates.shift()!;
    results.push(bestCandidate);
  }

  return {
    paths: results.slice(0, k),
    filteredNodesCount,
    filteredEdgesCount,
  };
}

/**
 * Check if a path satisfies all constraints
 */
export function validatePath(
  path: Path,
  constraints: PathQueryConstraints,
): boolean {
  if (constraints.maxDepth && path.length > constraints.maxDepth) {
    return false;
  }

  // Additional validation can be added here
  return true;
}
