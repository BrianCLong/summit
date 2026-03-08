"use strict";
/**
 * Pathfinding Algorithms with Policy Awareness and XAI Integration
 *
 * Provides shortest path and k-shortest paths algorithms with:
 * - Policy-aware filtering (node/edge types, policy labels)
 * - XAI-friendly explanation outputs
 * - Subgraph scoping (case/time filtering)
 * - Performance controls (resource budgets)
 *
 * @module algorithms/pathfinding
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.findShortestPath = findShortestPath;
exports.findKShortestPaths = findKShortestPaths;
/**
 * Calculate shortest path between source and target using Dijkstra's algorithm
 * with policy awareness and XAI integration
 */
function findShortestPath(graph, source, target, options = {}) {
    const startTime = performance.now();
    const { directed = false, weightProperty = 'weight', policyFilter, scopeFilter, maxPathLength = Infinity, maxNodesToExplore = Infinity, generateExplanations = false, } = options;
    // Apply filters to create filtered graph
    const filteredGraph = applyFilters(graph, policyFilter, scopeFilter);
    if (!filteredGraph.nodes.find((n) => n.id === source) ||
        !filteredGraph.nodes.find((n) => n.id === target)) {
        return {
            path: null,
            nodesExplored: 0,
            executionTime: performance.now() - startTime,
            found: false,
            metadata: {
                policyFiltered: !!policyFilter,
                scopeFiltered: !!scopeFilter,
                budgetExceeded: false,
                graphSize: { nodes: filteredGraph.nodes.length, edges: filteredGraph.edges.length },
            },
        };
    }
    // Build adjacency list
    const adjacency = buildAdjacencyList(filteredGraph, directed);
    // Dijkstra's algorithm
    const distances = new Map();
    const predecessors = new Map();
    const visited = new Set();
    const queue = [];
    // Initialize distances
    for (const node of filteredGraph.nodes) {
        distances.set(node.id, Infinity);
    }
    distances.set(source, 0);
    queue.push({ node: source, dist: 0 });
    let nodesExplored = 0;
    let budgetExceeded = false;
    while (queue.length > 0 && nodesExplored < maxNodesToExplore) {
        // Extract min distance node
        queue.sort((a, b) => a.dist - b.dist);
        const { node: current, dist: currentDist } = queue.shift();
        if (visited.has(current))
            continue;
        visited.add(current);
        nodesExplored++;
        // Found target
        if (current === target) {
            break;
        }
        // Check path length constraint
        const pathLength = reconstructPathLength(current, predecessors);
        if (pathLength >= maxPathLength) {
            continue;
        }
        // Explore neighbors
        const neighbors = adjacency.get(current) || [];
        for (const { node: neighbor, weight } of neighbors) {
            if (visited.has(neighbor))
                continue;
            const newDist = currentDist + weight;
            const oldDist = distances.get(neighbor) || Infinity;
            if (newDist < oldDist) {
                distances.set(neighbor, newDist);
                predecessors.set(neighbor, current);
                queue.push({ node: neighbor, dist: newDist });
            }
        }
    }
    if (nodesExplored >= maxNodesToExplore) {
        budgetExceeded = true;
    }
    const executionTime = performance.now() - startTime;
    // Reconstruct path
    const pathDistance = distances.get(target) || Infinity;
    if (pathDistance === Infinity || !predecessors.has(target)) {
        return {
            path: null,
            nodesExplored,
            executionTime,
            found: false,
            metadata: {
                policyFiltered: !!policyFilter,
                scopeFiltered: !!scopeFilter,
                budgetExceeded,
                graphSize: { nodes: filteredGraph.nodes.length, edges: filteredGraph.edges.length },
            },
        };
    }
    const path = reconstructPath(target, predecessors);
    const edges = reconstructEdges(path, adjacency);
    let explanations;
    if (generateExplanations) {
        explanations = generatePathExplanations(path, edges, filteredGraph, {
            totalDistance: pathDistance,
            nodesExplored,
            pathLength: path.length,
        });
    }
    return {
        path: {
            path,
            distance: pathDistance,
            edges,
            explanations,
        },
        nodesExplored,
        executionTime,
        found: true,
        metadata: {
            policyFiltered: !!policyFilter,
            scopeFiltered: !!scopeFilter,
            budgetExceeded,
            graphSize: { nodes: filteredGraph.nodes.length, edges: filteredGraph.edges.length },
        },
    };
}
/**
 * Find k shortest paths using Yen's algorithm
 * with policy awareness and resource budgets
 */
function findKShortestPaths(graph, source, target, k, options = {}) {
    const startTime = performance.now();
    const { directed = false, policyFilter, scopeFilter, maxNodesToExplore = Infinity, generateExplanations = false, } = options;
    // Apply filters
    const filteredGraph = applyFilters(graph, policyFilter, scopeFilter);
    const paths = [];
    let totalNodesExplored = 0;
    let budgetExceeded = false;
    // Find first shortest path
    const firstPathResult = findShortestPath(filteredGraph, source, target, {
        ...options,
        generateExplanations: false, // Generate at end
    });
    totalNodesExplored += firstPathResult.nodesExplored;
    if (!firstPathResult.found || !firstPathResult.path) {
        return {
            paths: [],
            nodesExplored: totalNodesExplored,
            executionTime: performance.now() - startTime,
            metadata: {
                k,
                foundPaths: 0,
                policyFiltered: !!policyFilter,
                scopeFiltered: !!scopeFilter,
                budgetExceeded: firstPathResult.metadata.budgetExceeded,
                graphSize: firstPathResult.metadata.graphSize,
            },
        };
    }
    paths.push(firstPathResult.path);
    // Yen's algorithm: find k-1 more paths
    const candidatePaths = [];
    for (let pathIndex = 1; pathIndex < k; pathIndex++) {
        if (totalNodesExplored >= maxNodesToExplore) {
            budgetExceeded = true;
            break;
        }
        const previousPath = paths[pathIndex - 1];
        // For each node in the previous path (except target)
        for (let i = 0; i < previousPath.path.length - 1; i++) {
            const spurNode = previousPath.path[i];
            const rootPath = previousPath.path.slice(0, i + 1);
            // Create graph with removed edges/nodes
            const modifiedGraph = createModifiedGraph(filteredGraph, paths, rootPath, i, directed);
            // Find spur path
            const spurPathResult = findShortestPath(modifiedGraph, spurNode, target, {
                ...options,
                maxNodesToExplore: maxNodesToExplore - totalNodesExplored,
                generateExplanations: false,
            });
            totalNodesExplored += spurPathResult.nodesExplored;
            if (spurPathResult.found && spurPathResult.path) {
                // Combine root path and spur path
                const totalPath = [
                    ...rootPath.slice(0, -1),
                    ...spurPathResult.path.path,
                ];
                const totalDistance = calculatePathDistance(rootPath, filteredGraph) +
                    spurPathResult.path.distance;
                if (!pathExists(totalPath, paths) && !pathExists(totalPath, candidatePaths.map(c => ({ path: c.path.path })))) {
                    candidatePaths.push({
                        path: {
                            path: totalPath,
                            distance: totalDistance,
                            edges: reconstructEdgesFromPath(totalPath, filteredGraph, directed),
                        },
                        deviation: i,
                    });
                }
            }
            if (totalNodesExplored >= maxNodesToExplore) {
                budgetExceeded = true;
                break;
            }
        }
        // Select best candidate path
        if (candidatePaths.length === 0) {
            break;
        }
        candidatePaths.sort((a, b) => a.path.distance - b.path.distance);
        const nextPath = candidatePaths.shift();
        paths.push(nextPath.path);
    }
    // Generate explanations if requested
    if (generateExplanations) {
        for (const pathResult of paths) {
            pathResult.explanations = generatePathExplanations(pathResult.path, pathResult.edges, filteredGraph, {
                totalDistance: pathResult.distance,
                nodesExplored: totalNodesExplored,
                pathLength: pathResult.path.length,
            });
        }
    }
    const executionTime = performance.now() - startTime;
    return {
        paths,
        nodesExplored: totalNodesExplored,
        executionTime,
        metadata: {
            k,
            foundPaths: paths.length,
            policyFiltered: !!policyFilter,
            scopeFiltered: !!scopeFilter,
            budgetExceeded,
            graphSize: {
                nodes: filteredGraph.nodes.length,
                edges: filteredGraph.edges.length,
            },
        },
    };
}
// Helper functions
function applyFilters(graph, policyFilter, scopeFilter) {
    let nodes = [...graph.nodes];
    let edges = [...graph.edges];
    // Apply policy filters
    if (policyFilter) {
        if (policyFilter.allowedNodeTypes && policyFilter.allowedNodeTypes.length > 0) {
            nodes = nodes.filter((n) => policyFilter.allowedNodeTypes.includes(n.type || ''));
        }
        if (policyFilter.allowedEdgeTypes && policyFilter.allowedEdgeTypes.length > 0) {
            edges = edges.filter((e) => policyFilter.allowedEdgeTypes.includes(e.type || ''));
        }
        if (policyFilter.requiredPolicyLabels && policyFilter.requiredPolicyLabels.length > 0) {
            nodes = nodes.filter((n) => n.policyLabels?.some((label) => policyFilter.requiredPolicyLabels.includes(label)));
            edges = edges.filter((e) => e.policyLabels?.some((label) => policyFilter.requiredPolicyLabels.includes(label)));
        }
        if (policyFilter.forbiddenPolicyLabels && policyFilter.forbiddenPolicyLabels.length > 0) {
            nodes = nodes.filter((n) => !n.policyLabels?.some((label) => policyFilter.forbiddenPolicyLabels.includes(label)));
            edges = edges.filter((e) => !e.policyLabels?.some((label) => policyFilter.forbiddenPolicyLabels.includes(label)));
        }
    }
    // Apply scope filters
    if (scopeFilter) {
        if (scopeFilter.startTime !== undefined || scopeFilter.endTime !== undefined) {
            const start = scopeFilter.startTime ?? -Infinity;
            const end = scopeFilter.endTime ?? Infinity;
            nodes = nodes.filter((n) => {
                const ts = n.timestamp ?? Date.now();
                return ts >= start && ts <= end;
            });
            edges = edges.filter((e) => {
                const ts = e.timestamp ?? Date.now();
                return ts >= start && ts <= end;
            });
        }
        if (scopeFilter.nodeScope && scopeFilter.nodeScope.size > 0) {
            nodes = nodes.filter((n) => scopeFilter.nodeScope.has(n.id));
        }
        if (scopeFilter.maxSubgraphSize !== undefined) {
            const totalSize = nodes.length + edges.length;
            if (totalSize > scopeFilter.maxSubgraphSize) {
                // Sample to fit budget (simple strategy: keep proportionally)
                const ratio = scopeFilter.maxSubgraphSize / totalSize;
                nodes = nodes.slice(0, Math.floor(nodes.length * ratio));
            }
        }
    }
    // Filter edges to only include those with both nodes present
    const nodeIds = new Set(nodes.map((n) => n.id));
    edges = edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
    return { nodes, edges };
}
function buildAdjacencyList(graph, directed) {
    const adjacency = new Map();
    for (const node of graph.nodes) {
        adjacency.set(node.id, []);
    }
    for (const edge of graph.edges) {
        const weight = edge.weight ?? 1;
        adjacency.get(edge.source)?.push({
            node: edge.target,
            weight,
            edge,
        });
        if (!directed) {
            adjacency.get(edge.target)?.push({
                node: edge.source,
                weight,
                edge,
            });
        }
    }
    return adjacency;
}
function reconstructPath(target, predecessors) {
    const path = [];
    let current = target;
    while (current !== undefined) {
        path.unshift(current);
        current = predecessors.get(current);
    }
    return path;
}
function reconstructPathLength(node, predecessors) {
    let length = 0;
    let current = node;
    while (current !== undefined) {
        length++;
        current = predecessors.get(current);
    }
    return length;
}
function reconstructEdges(path, adjacency) {
    const edges = [];
    for (let i = 0; i < path.length - 1; i++) {
        const source = path[i];
        const target = path[i + 1];
        const neighbors = adjacency.get(source) || [];
        const edge = neighbors.find((n) => n.node === target);
        if (edge) {
            edges.push({
                source,
                target,
                weight: edge.weight,
            });
        }
    }
    return edges;
}
function reconstructEdgesFromPath(path, graph, directed) {
    const edges = [];
    for (let i = 0; i < path.length - 1; i++) {
        const source = path[i];
        const target = path[i + 1];
        const edge = graph.edges.find((e) => (e.source === source && e.target === target) ||
            (!directed && e.source === target && e.target === source));
        if (edge) {
            edges.push({
                source,
                target,
                weight: edge.weight ?? 1,
            });
        }
    }
    return edges;
}
function calculatePathDistance(path, graph) {
    let distance = 0;
    for (let i = 0; i < path.length - 1; i++) {
        const edge = graph.edges.find((e) => e.source === path[i] && e.target === path[i + 1]);
        distance += edge?.weight ?? 1;
    }
    return distance;
}
function createModifiedGraph(graph, paths, rootPath, deviationIndex, directed) {
    const removedEdges = new Set();
    const removedNodes = new Set();
    // Remove edges that are part of previous paths at this deviation point
    for (const pathResult of paths) {
        const path = pathResult.path;
        if (path.length <= deviationIndex)
            continue;
        // Check if root paths match
        let rootMatches = true;
        for (let i = 0; i < deviationIndex; i++) {
            if (path[i] !== rootPath[i]) {
                rootMatches = false;
                break;
            }
        }
        if (rootMatches && path.length > deviationIndex + 1) {
            const edgeKey = `${path[deviationIndex]}-${path[deviationIndex + 1]}`;
            removedEdges.add(edgeKey);
        }
    }
    // Remove nodes in root path (except spur node)
    for (let i = 0; i < rootPath.length - 1; i++) {
        removedNodes.add(rootPath[i]);
    }
    // Filter graph
    const nodes = graph.nodes.filter((n) => !removedNodes.has(n.id));
    const edges = graph.edges.filter((e) => {
        const key = `${e.source}-${e.target}`;
        const reverseKey = `${e.target}-${e.source}`;
        return !removedEdges.has(key) && (!directed ? !removedEdges.has(reverseKey) : true);
    });
    return { nodes, edges };
}
function pathExists(path, existingPaths) {
    return existingPaths.some((p) => p.path.length === path.length &&
        p.path.every((node, i) => node === path[i]));
}
function generatePathExplanations(path, edges, graph, context) {
    const explanations = [];
    // Explain each node in the path
    for (let i = 0; i < path.length; i++) {
        const nodeId = path[i];
        const node = graph.nodes.find((n) => n.id === nodeId);
        if (!node)
            continue;
        const isStart = i === 0;
        const isEnd = i === path.length - 1;
        const isIntermediate = !isStart && !isEnd;
        let reasoning = '';
        const evidence = [];
        let importanceScore = 0.5;
        if (isStart) {
            reasoning = `Starting point of the path`;
            evidence.push(`Source node for pathfinding`);
            importanceScore = 1.0;
        }
        else if (isEnd) {
            reasoning = `Target destination of the path`;
            evidence.push(`Target node for pathfinding`);
            importanceScore = 1.0;
        }
        else {
            reasoning = `Critical intermediary node connecting source to target`;
            evidence.push(`Hop ${i} of ${path.length - 1} in shortest path`, `Node type: ${node.type || 'Unknown'}`);
            // Calculate importance based on position and degree
            const degree = graph.edges.filter((e) => e.source === nodeId || e.target === nodeId).length;
            importanceScore = 0.5 + (degree / (graph.nodes.length * 2)) * 0.5;
        }
        if (node.policyLabels && node.policyLabels.length > 0) {
            evidence.push(`Policy labels: ${node.policyLabels.join(', ')}`);
        }
        explanations.push({
            elementId: nodeId,
            elementType: 'node',
            importanceScore,
            reasoning,
            evidence,
            uncertainty: 0.05,
        });
    }
    // Explain each edge in the path
    for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        const graphEdge = graph.edges.find((e) => e.source === edge.source && e.target === edge.target);
        const evidence = [
            `Connection ${i + 1} of ${edges.length} in path`,
            `Edge weight: ${edge.weight}`,
        ];
        if (graphEdge?.type) {
            evidence.push(`Relationship type: ${graphEdge.type}`);
        }
        if (graphEdge?.policyLabels && graphEdge.policyLabels.length > 0) {
            evidence.push(`Policy labels: ${graphEdge.policyLabels.join(', ')}`);
        }
        const importanceScore = Math.min(1.0, 1.0 / edge.weight);
        explanations.push({
            elementId: `${edge.source}->${edge.target}`,
            elementType: 'edge',
            importanceScore,
            reasoning: `Critical connection in shortest path from ${edge.source} to ${edge.target}`,
            evidence,
            uncertainty: 0.08,
        });
    }
    return explanations;
}
