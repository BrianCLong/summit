"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkAnalyzer = void 0;
/**
 * Analyzes supply chain network topology and structure
 */
class NetworkAnalyzer {
    /**
     * Analyze network topology
     */
    analyzeTopology(nodes, relationships) {
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        const adjacencyList = new Map();
        // Build adjacency list
        for (const rel of relationships) {
            if (!rel.isActive) {
                continue;
            }
            if (!adjacencyList.has(rel.sourceNodeId)) {
                adjacencyList.set(rel.sourceNodeId, []);
            }
            adjacencyList.get(rel.sourceNodeId).push(rel.targetNodeId);
            if (!adjacencyList.has(rel.targetNodeId)) {
                adjacencyList.set(rel.targetNodeId, []);
            }
            adjacencyList.get(rel.targetNodeId).push(rel.sourceNodeId);
        }
        // Calculate degree statistics
        const degrees = Array.from(adjacencyList.values()).map(neighbors => neighbors.length);
        const totalDegree = degrees.reduce((sum, d) => sum + d, 0);
        const avgDegree = degrees.length > 0 ? totalDegree / degrees.length : 0;
        const maxDegree = degrees.length > 0 ? Math.max(...degrees) : 0;
        // Network density
        const maxPossibleEdges = nodes.length * (nodes.length - 1) / 2;
        const networkDensity = maxPossibleEdges > 0 ? relationships.length / maxPossibleEdges : 0;
        // Clustering coefficient
        const clusteringCoefficient = this.calculateClusteringCoefficient(adjacencyList);
        // Average path length and diameter
        const { avgPathLength, diameter } = this.calculatePathMetrics(nodes, adjacencyList);
        // Tier distribution
        const tiers = new Map();
        for (const node of nodes) {
            tiers.set(node.tier, (tiers.get(node.tier) || 0) + 1);
        }
        return {
            totalNodes: nodes.length,
            totalRelationships: relationships.filter(r => r.isActive).length,
            averageDegree: avgDegree,
            maxDegree,
            networkDensity,
            clusteringCoefficient,
            averagePathLength: avgPathLength,
            diameter,
            tiers,
        };
    }
    /**
     * Find critical paths between nodes
     */
    findCriticalPaths(sourceNodeId, targetNodeId, nodes, relationships) {
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        const relMap = new Map();
        // Build relationship map
        for (const rel of relationships) {
            if (!rel.isActive) {
                continue;
            }
            if (!relMap.has(rel.sourceNodeId)) {
                relMap.set(rel.sourceNodeId, []);
            }
            relMap.get(rel.sourceNodeId).push(rel);
        }
        // Find shortest path using Dijkstra's algorithm
        const distances = new Map();
        const previous = new Map();
        const unvisited = new Set(nodes.map(n => n.id));
        distances.set(sourceNodeId, 0);
        while (unvisited.size > 0) {
            // Find unvisited node with minimum distance
            let current = null;
            let minDist = Infinity;
            for (const nodeId of unvisited) {
                const dist = distances.get(nodeId) ?? Infinity;
                if (dist < minDist) {
                    minDist = dist;
                    current = nodeId;
                }
            }
            if (!current || minDist === Infinity) {
                break;
            }
            unvisited.delete(current);
            const neighbors = relMap.get(current) || [];
            for (const rel of neighbors) {
                const alt = minDist + (rel.leadTimeDays || 1);
                if (alt < (distances.get(rel.targetNodeId) ?? Infinity)) {
                    distances.set(rel.targetNodeId, alt);
                    previous.set(rel.targetNodeId, current);
                }
            }
        }
        // Reconstruct path
        const path = [];
        let current = targetNodeId;
        while (current) {
            path.unshift(current);
            current = previous.get(current);
        }
        // Calculate metrics
        let totalLeadTime = 0;
        let totalCost = 0;
        for (let i = 0; i < path.length - 1; i++) {
            const rels = relMap.get(path[i]) || [];
            const rel = rels.find(r => r.targetNodeId === path[i + 1]);
            if (rel) {
                totalLeadTime += rel.leadTimeDays || 0;
                totalCost += rel.cost || 0;
            }
        }
        // Identify bottlenecks and single points of failure
        const bottlenecks = this.identifyBottlenecks(path, nodes, relationships);
        const singlePointsOfFailure = this.identifySinglePointsOfFailure(path, nodes, relationships);
        // Find alternative paths
        const alternativePaths = this.findAlternativePaths(sourceNodeId, targetNodeId, path, nodes, relationships);
        return {
            path,
            totalLeadTime,
            totalCost,
            bottlenecks,
            singlePointsOfFailure,
            alternativePaths,
        };
    }
    /**
     * Analyze dependencies for a node
     */
    analyzeDependencies(nodeId, nodes, relationships) {
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        const node = nodeMap.get(nodeId);
        if (!node) {
            throw new Error(`Node ${nodeId} not found`);
        }
        // Build directed graph
        const upstream = new Map();
        const downstream = new Map();
        for (const rel of relationships) {
            if (!rel.isActive) {
                continue;
            }
            if (!upstream.has(rel.targetNodeId)) {
                upstream.set(rel.targetNodeId, []);
            }
            upstream.get(rel.targetNodeId).push(rel);
            if (!downstream.has(rel.sourceNodeId)) {
                downstream.set(rel.sourceNodeId, []);
            }
            downstream.get(rel.sourceNodeId).push(rel);
        }
        // Traverse upstream
        const upstreamDeps = this.traverseDependencies(nodeId, upstream, nodeMap, 'upstream');
        const downstreamDeps = this.traverseDependencies(nodeId, downstream, nodeMap, 'downstream');
        // Calculate impact score
        const impactScore = this.calculateImpactScore(node, upstreamDeps.length, downstreamDeps.length);
        return {
            nodeId,
            upstreamDependencies: upstreamDeps,
            downstreamDependents: downstreamDeps,
            totalDependencies: upstreamDeps.length,
            totalDependents: downstreamDeps.length,
            impactScore,
        };
    }
    /**
     * Analyze supplier diversification for components
     */
    analyzeDiversification(componentId, nodes, relationships) {
        // Find all suppliers for this component
        const suppliers = relationships
            .filter(r => r.isActive && r.materialFlow?.includes(componentId))
            .map(r => r.sourceNodeId)
            .filter((id, index, self) => self.indexOf(id) === index);
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        const supplierNodes = suppliers.map(id => nodeMap.get(id)).filter(Boolean);
        // Calculate market shares (simplified - based on relationship volume)
        const totalVolume = relationships
            .filter(r => r.isActive && r.materialFlow?.includes(componentId))
            .reduce((sum, r) => sum + (r.volume || 0), 0);
        const supplierData = supplierNodes.map(supplier => {
            const volume = relationships
                .filter(r => r.sourceNodeId === supplier.id && r.materialFlow?.includes(componentId))
                .reduce((sum, r) => sum + (r.volume || 0), 0);
            return {
                nodeId: supplier.id,
                marketShare: totalVolume > 0 ? volume / totalVolume : 1 / suppliers.length,
                location: supplier.location?.country || 'Unknown',
                tier: supplier.tier,
            };
        });
        // Calculate Herfindahl-Hirschman Index (HHI)
        const hhi = supplierData.reduce((sum, s) => sum + Math.pow(s.marketShare, 2), 0);
        // Geographic diversification
        const uniqueLocations = new Set(supplierData.map(s => s.location)).size;
        const geoDiversification = supplierNodes.length > 0
            ? uniqueLocations / supplierNodes.length
            : 0;
        // Concentration risk (inverse of diversification)
        const concentrationRisk = hhi;
        // Recommendations
        const recommendations = [];
        if (suppliers.length < 2) {
            recommendations.push('Add alternative suppliers to reduce single-source dependency');
        }
        if (hhi > 0.5) {
            recommendations.push('High market concentration - diversify supplier base');
        }
        if (geoDiversification < 0.5) {
            recommendations.push('Low geographic diversification - consider suppliers in different regions');
        }
        return {
            componentId,
            supplierCount: suppliers.length,
            geographicDiversification: geoDiversification,
            concentrationRisk,
            herfindahlIndex: hhi,
            suppliers: supplierData,
            recommendations,
        };
    }
    // Private helper methods
    calculateClusteringCoefficient(adjacencyList) {
        let totalCoefficient = 0;
        let nodeCount = 0;
        for (const [nodeId, neighbors] of adjacencyList) {
            if (neighbors.length < 2) {
                continue;
            }
            let edges = 0;
            for (let i = 0; i < neighbors.length; i++) {
                for (let j = i + 1; j < neighbors.length; j++) {
                    const neighborNeighbors = adjacencyList.get(neighbors[i]) || [];
                    if (neighborNeighbors.includes(neighbors[j])) {
                        edges++;
                    }
                }
            }
            const maxEdges = (neighbors.length * (neighbors.length - 1)) / 2;
            totalCoefficient += maxEdges > 0 ? edges / maxEdges : 0;
            nodeCount++;
        }
        return nodeCount > 0 ? totalCoefficient / nodeCount : 0;
    }
    calculatePathMetrics(nodes, adjacencyList) {
        let totalPathLength = 0;
        let pathCount = 0;
        let diameter = 0;
        // Sample a subset for large networks
        const sampleSize = Math.min(nodes.length, 100);
        const sampledNodes = nodes.slice(0, sampleSize);
        for (const source of sampledNodes) {
            const distances = this.bfs(source.id, adjacencyList);
            for (const dist of distances.values()) {
                if (dist > 0 && dist < Infinity) {
                    totalPathLength += dist;
                    pathCount++;
                    diameter = Math.max(diameter, dist);
                }
            }
        }
        return {
            avgPathLength: pathCount > 0 ? totalPathLength / pathCount : 0,
            diameter,
        };
    }
    bfs(startNodeId, adjacencyList) {
        const distances = new Map();
        const queue = [startNodeId];
        distances.set(startNodeId, 0);
        while (queue.length > 0) {
            const current = queue.shift();
            const currentDist = distances.get(current);
            const neighbors = adjacencyList.get(current) || [];
            for (const neighbor of neighbors) {
                if (!distances.has(neighbor)) {
                    distances.set(neighbor, currentDist + 1);
                    queue.push(neighbor);
                }
            }
        }
        return distances;
    }
    identifyBottlenecks(path, nodes, relationships) {
        const bottlenecks = [];
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        for (const nodeId of path) {
            const node = nodeMap.get(nodeId);
            if (!node) {
                continue;
            }
            // Check for high criticality
            if (node.criticality === 'critical') {
                bottlenecks.push({
                    nodeId,
                    reason: 'Critical node in supply chain',
                    impact: 'critical',
                });
            }
            // Check for long lead times
            const incomingRels = relationships.filter(r => r.targetNodeId === nodeId);
            const maxLeadTime = Math.max(...incomingRels.map(r => r.leadTimeDays || 0));
            if (maxLeadTime > 30) {
                bottlenecks.push({
                    nodeId,
                    reason: `Long lead time: ${maxLeadTime} days`,
                    impact: maxLeadTime > 60 ? 'high' : 'medium',
                });
            }
        }
        return bottlenecks;
    }
    identifySinglePointsOfFailure(path, nodes, relationships) {
        const spof = [];
        const relMap = new Map();
        for (const rel of relationships) {
            if (!rel.isActive) {
                continue;
            }
            if (!relMap.has(rel.sourceNodeId)) {
                relMap.set(rel.sourceNodeId, []);
            }
            relMap.get(rel.sourceNodeId).push(rel);
        }
        for (let i = 0; i < path.length - 1; i++) {
            const currentNodeId = path[i];
            const nextNodeId = path[i + 1];
            const alternatives = relMap.get(currentNodeId)?.filter(r => r.targetNodeId !== nextNodeId) || [];
            if (alternatives.length === 0) {
                spof.push(currentNodeId);
            }
        }
        return spof;
    }
    findAlternativePaths(sourceNodeId, targetNodeId, primaryPath, nodes, relationships) {
        // Simplified alternative path finding
        // In production, use k-shortest paths algorithm
        return [];
    }
    traverseDependencies(nodeId, graph, nodeMap, direction) {
        const visited = new Set();
        const queue = [{ nodeId, distance: 0 }];
        const dependencies = [];
        while (queue.length > 0) {
            const { nodeId: current, distance } = queue.shift();
            if (visited.has(current)) {
                continue;
            }
            visited.add(current);
            if (current !== nodeId) {
                const node = nodeMap.get(current);
                if (node) {
                    dependencies.push({
                        nodeId: current,
                        tier: node.tier,
                        criticality: node.criticality,
                        distance,
                    });
                }
            }
            const rels = graph.get(current) || [];
            for (const rel of rels) {
                const nextNodeId = direction === 'upstream' ? rel.sourceNodeId : rel.targetNodeId;
                if (!visited.has(nextNodeId)) {
                    queue.push({ nodeId: nextNodeId, distance: distance + 1 });
                }
            }
        }
        return dependencies;
    }
    calculateImpactScore(node, upstreamCount, downstreamCount) {
        let score = 0;
        // Base score from criticality
        const criticalityScores = {
            low: 10,
            medium: 30,
            high: 60,
            critical: 100,
        };
        score += criticalityScores[node.criticality];
        // Adjust for upstream dependencies
        score += Math.min(upstreamCount * 2, 30);
        // Adjust for downstream dependents
        score += Math.min(downstreamCount * 3, 40);
        return Math.min(score, 100);
    }
}
exports.NetworkAnalyzer = NetworkAnalyzer;
