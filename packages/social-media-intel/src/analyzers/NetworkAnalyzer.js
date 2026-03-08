"use strict";
/**
 * Network Analyzer - Analyzes social network structures and relationships
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkAnalyzer = void 0;
class NetworkAnalyzer {
    /**
     * Build social network from posts and profiles
     */
    buildNetwork(profiles, relationships) {
        const nodes = profiles.map(profile => ({
            id: `${profile.platform}:${profile.username}`,
            username: profile.username,
            platform: profile.platform,
            type: 'user'
        }));
        const edges = relationships.map(rel => ({
            source: rel.from,
            target: rel.to,
            type: rel.type,
            weight: 1
        }));
        const metrics = this.calculateMetrics({ nodes, edges });
        return {
            nodes,
            edges,
            metrics
        };
    }
    /**
     * Calculate network metrics
     */
    calculateMetrics(network) {
        const nodeCount = network.nodes.length;
        const edgeCount = network.edges.length;
        // Network density
        const maxEdges = (nodeCount * (nodeCount - 1)) / 2;
        const density = maxEdges > 0 ? edgeCount / maxEdges : 0;
        // Average degree
        const degrees = this.calculateDegrees(network);
        const avgDegree = degrees.size > 0
            ? Array.from(degrees.values()).reduce((a, b) => a + b, 0) / degrees.size
            : 0;
        // Clustering coefficient (simplified)
        const clustering = this.calculateClustering(network);
        // Identify influencers
        const influencers = this.identifyInfluencers(network);
        return {
            nodeCount,
            edgeCount,
            density,
            averageDegree: avgDegree,
            clustering,
            influencers
        };
    }
    /**
     * Calculate node degrees
     */
    calculateDegrees(network) {
        const degrees = new Map();
        // Initialize
        network.nodes.forEach(node => degrees.set(node.id, 0));
        // Count edges
        network.edges.forEach(edge => {
            degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
            degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
        });
        return degrees;
    }
    /**
     * Calculate clustering coefficient
     */
    calculateClustering(network) {
        // Simplified clustering calculation
        // In production, would use proper graph algorithms
        const degrees = this.calculateDegrees(network);
        const avgDegree = degrees.size > 0
            ? Array.from(degrees.values()).reduce((a, b) => a + b, 0) / degrees.size
            : 0;
        // Approximate clustering based on average degree
        return Math.min(1, avgDegree / network.nodes.length);
    }
    /**
     * Identify influential nodes (PageRank-like algorithm)
     */
    identifyInfluencers(network) {
        const degrees = this.calculateDegrees(network);
        // Simple influence score based on degree and edge weights
        const scores = new Map();
        network.nodes.forEach(node => {
            const degree = degrees.get(node.id) || 0;
            const incomingEdges = network.edges.filter(e => e.target === node.id);
            const weightedDegree = incomingEdges.reduce((sum, edge) => sum + (edge.weight || 1), 0);
            scores.set(node.id, degree + weightedDegree * 2);
        });
        // Sort by score
        const sorted = Array.from(scores.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10) // Top 10
            .map(([nodeId, score], index) => ({
            nodeId,
            score,
            rank: index + 1
        }));
        return sorted;
    }
    /**
     * Detect communities (simplified Louvain algorithm)
     */
    detectCommunities(network) {
        // Simplified community detection
        // In production, would use proper graph clustering algorithms
        const communities = new Map();
        let communityId = 0;
        // Start each node in its own community
        network.nodes.forEach(node => {
            communities.set(`community-${communityId++}`, new Set([node.id]));
        });
        // Merge communities based on edges
        network.edges.forEach(edge => {
            const sourceCommunity = this.findCommunity(edge.source, communities);
            const targetCommunity = this.findCommunity(edge.target, communities);
            if (sourceCommunity && targetCommunity && sourceCommunity !== targetCommunity) {
                // Merge smaller into larger
                const sourceSet = communities.get(sourceCommunity);
                const targetSet = communities.get(targetCommunity);
                if (sourceSet.size < targetSet.size) {
                    sourceSet.forEach(node => targetSet.add(node));
                    communities.delete(sourceCommunity);
                }
                else {
                    targetSet.forEach(node => sourceSet.add(node));
                    communities.delete(targetCommunity);
                }
            }
        });
        // Convert to community array
        network.communities = Array.from(communities.entries()).map(([id, nodes], index) => {
            const nodeArray = Array.from(nodes);
            return {
                id: `community-${index}`,
                nodes: nodeArray,
                size: nodeArray.length,
                density: this.calculateCommunityDensity(nodeArray, network.edges)
            };
        });
        return network;
    }
    /**
     * Find which community a node belongs to
     */
    findCommunity(nodeId, communities) {
        for (const [communityId, nodes] of communities.entries()) {
            if (nodes.has(nodeId)) {
                return communityId;
            }
        }
        return null;
    }
    /**
     * Calculate community density
     */
    calculateCommunityDensity(nodeIds, edges) {
        const communityEdges = edges.filter(edge => nodeIds.includes(edge.source) && nodeIds.includes(edge.target));
        const n = nodeIds.length;
        const maxEdges = (n * (n - 1)) / 2;
        return maxEdges > 0 ? communityEdges.length / maxEdges : 0;
    }
}
exports.NetworkAnalyzer = NetworkAnalyzer;
