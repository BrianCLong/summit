"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shortestPath = shortestPath;
exports.kShortestPaths = kShortestPaths;
exports.validatePath = validatePath;
const logger_1 = require("../utils/logger");
/**
 * Build adjacency list from graph with filters applied
 */
function buildAdjacencyList(graph, constraints, nodePolicyFilter, edgePolicyFilter) {
    const adj = {};
    let filteredNodesCount = 0;
    let filteredEdgesCount = 0;
    // Filter nodes
    const allowedNodeIds = new Set();
    for (const node of graph.nodes) {
        // Apply label constraints
        if (constraints?.disallowedNodeLabels?.length) {
            if (node.labels.some((label) => constraints.disallowedNodeLabels.includes(label))) {
                filteredNodesCount++;
                continue;
            }
        }
        if (constraints?.requiredNodeLabels?.length) {
            if (!node.labels.some((label) => constraints.requiredNodeLabels.includes(label))) {
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
        if (!constraints?.direction ||
            constraints.direction === 'BOTH' ||
            edge.direction === 'undirected') {
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
function shortestPath(graph, startNodeId, endNodeId, constraints, nodePolicyFilter, edgePolicyFilter) {
    const { adj, filteredNodesCount, filteredEdgesCount } = buildAdjacencyList(graph, constraints, nodePolicyFilter, edgePolicyFilter);
    if (!adj[startNodeId] || !adj[endNodeId]) {
        logger_1.logger.warn('Start or end node not found or filtered out');
        return { path: null, filteredNodesCount, filteredEdgesCount };
    }
    const maxDepth = constraints?.maxDepth || 100;
    // BFS/Dijkstra
    const distances = new Map();
    const previous = new Map();
    const visited = new Set();
    // Priority queue (min-heap) - using array for simplicity
    const queue = [
        { nodeId: startNodeId, distance: 0 },
    ];
    distances.set(startNodeId, 0);
    while (queue.length > 0) {
        // Get node with minimum distance
        queue.sort((a, b) => a.distance - b.distance);
        const current = queue.shift();
        if (visited.has(current.nodeId))
            continue;
        visited.add(current.nodeId);
        if (current.nodeId === endNodeId)
            break;
        const currentDist = distances.get(current.nodeId);
        if (currentDist >= maxDepth)
            continue;
        const neighbors = adj[current.nodeId];
        if (!neighbors)
            continue;
        for (const edgeInfo of neighbors.edges) {
            const { toId, edgeId, type, weight } = edgeInfo;
            if (visited.has(toId))
                continue;
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
    const nodeIds = [];
    const edgeIds = [];
    const relationships = [];
    let current = endNodeId;
    let totalWeight = 0;
    while (current !== startNodeId) {
        nodeIds.unshift(current);
        const prev = previous.get(current);
        if (!prev)
            break;
        edgeIds.unshift(prev.edgeId);
        relationships.unshift(prev.type);
        totalWeight = distances.get(current) || 0;
        current = prev.nodeId;
    }
    nodeIds.unshift(startNodeId);
    const path = {
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
function kShortestPaths(graph, startNodeId, endNodeId, k, constraints, nodePolicyFilter, edgePolicyFilter) {
    const results = [];
    const { path: firstPath, filteredNodesCount, filteredEdgesCount } = shortestPath(graph, startNodeId, endNodeId, constraints, nodePolicyFilter, edgePolicyFilter);
    if (!firstPath) {
        return { paths: [], filteredNodesCount, filteredEdgesCount };
    }
    results.push(firstPath);
    // Candidate paths
    const candidates = [];
    for (let pathIndex = 0; pathIndex < k - 1 && pathIndex < results.length; pathIndex++) {
        const prevPath = results[pathIndex];
        // For each node in the previous path (except last)
        for (let i = 0; i < prevPath.nodeIds.length - 1; i++) {
            const spurNode = prevPath.nodeIds[i];
            const rootPath = {
                nodeIds: prevPath.nodeIds.slice(0, i + 1),
                edgeIds: prevPath.edgeIds.slice(0, i),
                length: i,
                weight: prevPath.weight ? (prevPath.weight * i / (prevPath.length || 1)) : i,
                relationships: prevPath.relationships.slice(0, i),
            };
            // Remove edges that would create duplicate paths
            const edgesToRemove = new Set();
            const nodesToRemove = new Set();
            for (const existingPath of results) {
                if (existingPath.nodeIds.length > i) {
                    const matches = rootPath.nodeIds.every((nodeId, idx) => existingPath.nodeIds[idx] === nodeId);
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
            const modifiedGraph = {
                nodes: graph.nodes.filter((n) => !nodesToRemove.has(n.id)),
                edges: graph.edges.filter((e) => !edgesToRemove.has(e.id)),
            };
            // Find spur path
            const { path: spurPath } = shortestPath(modifiedGraph, spurNode, endNodeId, constraints, nodePolicyFilter, edgePolicyFilter);
            if (spurPath && spurPath.nodeIds.length > 1) {
                // Combine root path and spur path
                const totalPath = {
                    nodeIds: [...rootPath.nodeIds, ...spurPath.nodeIds.slice(1)],
                    edgeIds: [...rootPath.edgeIds, ...spurPath.edgeIds],
                    length: rootPath.length + spurPath.length,
                    weight: (rootPath.weight ?? rootPath.length) +
                        (spurPath.weight ?? spurPath.length),
                    relationships: [...rootPath.relationships, ...spurPath.relationships],
                };
                // Check if this path is unique
                const pathSignature = totalPath.nodeIds.join('->');
                const isDuplicate = candidates.some((p) => p.nodeIds.join('->') === pathSignature);
                if (!isDuplicate) {
                    candidates.push(totalPath);
                }
            }
        }
        if (candidates.length === 0)
            break;
        // Sort candidates by length/weight
        candidates.sort((a, b) => {
            const aWeight = a.weight || a.length;
            const bWeight = b.weight || b.length;
            return aWeight - bWeight;
        });
        // Add best candidate to results
        const bestCandidate = candidates.shift();
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
function validatePath(path, constraints) {
    if (constraints.maxDepth && path.length > constraints.maxDepth) {
        return false;
    }
    // Additional validation can be added here
    return true;
}
