"use strict";
/**
 * Network Analyzer
 * Analyzes connections and relationships between terrorist organizations and individuals
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkAnalyzer = void 0;
class NetworkAnalyzer {
    /**
     * Build network graph from organizations
     */
    async buildNetwork(organizations) {
        const nodes = [];
        const edges = [];
        // Create nodes for each organization
        for (const org of organizations) {
            nodes.push({
                id: org.id,
                type: 'ORGANIZATION',
                label: org.name,
                attributes: {
                    type: org.type,
                    ideology: org.ideology,
                    status: org.status,
                    regions: org.operatingRegions
                }
            });
            // Create edges for affiliates
            for (const affiliateId of org.affiliates) {
                edges.push({
                    source: org.id,
                    target: affiliateId,
                    type: 'AFFILIATE',
                    weight: 0.8
                });
            }
            // Create edges for parent organizations
            if (org.parentOrganization) {
                edges.push({
                    source: org.id,
                    target: org.parentOrganization,
                    type: 'PARENT',
                    weight: 0.9
                });
            }
        }
        // Detect communities
        const communities = this.detectCommunities(nodes, edges);
        // Identify central figures (most connected nodes)
        const centralFigures = this.identifyCentralNodes(nodes, edges);
        return {
            nodes,
            edges,
            communities,
            centralFigures
        };
    }
    /**
     * Calculate node centrality metrics
     */
    calculateCentrality(network) {
        const centrality = new Map();
        // Degree centrality - number of connections
        for (const node of network.nodes) {
            const connections = network.edges.filter(e => e.source === node.id || e.target === node.id).length;
            centrality.set(node.id, connections);
        }
        return centrality;
    }
    /**
     * Find shortest path between two nodes
     */
    findShortestPath(network, startId, endId) {
        const adjacency = this.buildAdjacencyList(network);
        const queue = [[startId]];
        const visited = new Set([startId]);
        while (queue.length > 0) {
            const path = queue.shift();
            const node = path[path.length - 1];
            if (node === endId) {
                return path;
            }
            const neighbors = adjacency.get(node) || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push([...path, neighbor]);
                }
            }
        }
        return null;
    }
    /**
     * Identify key nodes (hubs and connectors)
     */
    identifyKeyNodes(network) {
        const centrality = this.calculateCentrality(network);
        const threshold = this.calculateThreshold(Array.from(centrality.values()));
        const hubs = [];
        const connectors = [];
        const isolates = [];
        for (const [nodeId, degree] of centrality) {
            if (degree === 0) {
                isolates.push(nodeId);
            }
            else if (degree >= threshold * 2) {
                hubs.push(nodeId);
            }
            else if (degree >= threshold) {
                connectors.push(nodeId);
            }
        }
        return { hubs, connectors, isolates };
    }
    /**
     * Detect subgraphs and clusters
     */
    detectClusters(network) {
        return this.detectCommunities(network.nodes, network.edges);
    }
    /**
     * Analyze network evolution over time
     */
    analyzeEvolution(previousNetwork, currentNetwork) {
        const prevNodeIds = new Set(previousNetwork.nodes.map(n => n.id));
        const currNodeIds = new Set(currentNetwork.nodes.map(n => n.id));
        const newNodes = currentNetwork.nodes
            .filter(n => !prevNodeIds.has(n.id))
            .map(n => n.id);
        const removedNodes = previousNetwork.nodes
            .filter(n => !currNodeIds.has(n.id))
            .map(n => n.id);
        const prevEdgeKeys = new Set(previousNetwork.edges.map(e => `${e.source}-${e.target}`));
        const currEdgeKeys = new Set(currentNetwork.edges.map(e => `${e.source}-${e.target}`));
        const newEdges = currentNetwork.edges.filter(e => !prevEdgeKeys.has(`${e.source}-${e.target}`));
        const removedEdges = previousNetwork.edges.filter(e => !currEdgeKeys.has(`${e.source}-${e.target}`));
        const growthRate = (currentNetwork.nodes.length - previousNetwork.nodes.length) /
            previousNetwork.nodes.length;
        return {
            newNodes,
            removedNodes,
            newEdges,
            removedEdges,
            growthRate
        };
    }
    /**
     * Calculate network density
     */
    calculateDensity(network) {
        const n = network.nodes.length;
        const e = network.edges.length;
        if (n <= 1) {
            return 0;
        }
        const maxEdges = (n * (n - 1)) / 2;
        return e / maxEdges;
    }
    /**
     * Private helper methods
     */
    detectCommunities(nodes, edges) {
        // Simple community detection using connected components
        const adjacency = new Map();
        for (const edge of edges) {
            if (!adjacency.has(edge.source)) {
                adjacency.set(edge.source, []);
            }
            if (!adjacency.has(edge.target)) {
                adjacency.set(edge.target, []);
            }
            adjacency.get(edge.source).push(edge.target);
            adjacency.get(edge.target).push(edge.source);
        }
        const visited = new Set();
        const communities = [];
        let communityId = 0;
        for (const node of nodes) {
            if (!visited.has(node.id)) {
                const community = this.exploreComponent(node.id, adjacency, visited);
                communities.push({
                    id: `community-${communityId++}`,
                    members: community,
                    cohesion: this.calculateCohesion(community, edges)
                });
            }
        }
        return communities;
    }
    exploreComponent(startId, adjacency, visited) {
        const component = [];
        const queue = [startId];
        visited.add(startId);
        while (queue.length > 0) {
            const nodeId = queue.shift();
            component.push(nodeId);
            const neighbors = adjacency.get(nodeId) || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push(neighbor);
                }
            }
        }
        return component;
    }
    calculateCohesion(members, edges) {
        const memberSet = new Set(members);
        const internalEdges = edges.filter(e => memberSet.has(e.source) && memberSet.has(e.target)).length;
        const maxPossibleEdges = (members.length * (members.length - 1)) / 2;
        return maxPossibleEdges > 0 ? internalEdges / maxPossibleEdges : 0;
    }
    identifyCentralNodes(nodes, edges) {
        const centrality = new Map();
        for (const node of nodes) {
            const connections = edges.filter(e => e.source === node.id || e.target === node.id).length;
            centrality.set(node.id, connections);
        }
        const sorted = Array.from(centrality.entries()).sort((a, b) => b[1] - a[1]);
        // Return top 10% most connected nodes
        const topCount = Math.max(1, Math.ceil(nodes.length * 0.1));
        return sorted.slice(0, topCount).map(([id]) => id);
    }
    buildAdjacencyList(network) {
        const adjacency = new Map();
        for (const edge of network.edges) {
            if (!adjacency.has(edge.source)) {
                adjacency.set(edge.source, []);
            }
            if (!adjacency.has(edge.target)) {
                adjacency.set(edge.target, []);
            }
            adjacency.get(edge.source).push(edge.target);
            adjacency.get(edge.target).push(edge.source);
        }
        return adjacency;
    }
    calculateThreshold(values) {
        if (values.length === 0) {
            return 0;
        }
        const sum = values.reduce((a, b) => a + b, 0);
        return sum / values.length;
    }
}
exports.NetworkAnalyzer = NetworkAnalyzer;
