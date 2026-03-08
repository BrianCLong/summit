"use strict";
/**
 * Communications Mapper - Social network analysis from communications
 * TRAINING/SIMULATION ONLY
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunicationsMapper = void 0;
const uuid_1 = require("uuid");
class CommunicationsMapper {
    nodes = new Map();
    edges = new Map();
    adjacencyList = new Map();
    /**
     * Add a communication event to the graph
     */
    addCommunication(event) {
        // Ensure nodes exist
        this.ensureNode(event.source, event.sourceType);
        this.ensureNode(event.target, event.targetType);
        // Update or create edge
        const edgeKey = this.getEdgeKey(event.source, event.target);
        let edge = this.edges.get(edgeKey);
        if (!edge) {
            edge = {
                id: (0, uuid_1.v4)(),
                source: event.source,
                target: event.target,
                weight: 0,
                firstContact: event.timestamp,
                lastContact: event.timestamp,
                totalCount: 0,
                totalDuration: 0,
                types: [],
                direction: 'source_to_target',
                isSimulated: true
            };
            this.edges.set(edgeKey, edge);
            // Update adjacency list
            if (!this.adjacencyList.has(event.source)) {
                this.adjacencyList.set(event.source, new Set());
            }
            if (!this.adjacencyList.has(event.target)) {
                this.adjacencyList.set(event.target, new Set());
            }
            this.adjacencyList.get(event.source).add(event.target);
            this.adjacencyList.get(event.target).add(event.source);
        }
        // Update edge metrics
        edge.lastContact = event.timestamp;
        edge.totalCount++;
        edge.weight = Math.log(edge.totalCount + 1);
        if (event.duration)
            edge.totalDuration += event.duration;
        if (!edge.types.includes(event.type))
            edge.types.push(event.type);
        // Update node metrics
        const sourceNode = this.nodes.get(event.source);
        const targetNode = this.nodes.get(event.target);
        sourceNode.outDegree++;
        sourceNode.communicationCount++;
        sourceNode.lastSeen = event.timestamp;
        targetNode.inDegree++;
        targetNode.communicationCount++;
        targetNode.lastSeen = event.timestamp;
    }
    ensureNode(identifier, identifierType) {
        if (!this.nodes.has(identifier)) {
            this.nodes.set(identifier, {
                id: (0, uuid_1.v4)(),
                identifier,
                identifierType,
                aliases: [],
                degree: 0,
                inDegree: 0,
                outDegree: 0,
                betweenness: 0,
                pageRank: 1 / (this.nodes.size + 1),
                firstSeen: new Date(),
                lastSeen: new Date(),
                communicationCount: 0,
                attributes: {},
                isSimulated: true
            });
        }
    }
    getEdgeKey(source, target) {
        return [source, target].sort().join('::');
    }
    /**
     * Find contact chain from a root node
     */
    findContactChain(rootId, maxHops = 3) {
        const node = this.nodes.get(rootId);
        if (!node)
            return null;
        const visitedNodes = new Map();
        const chainEdges = [];
        const queue = [{ id: rootId, hop: 0 }];
        while (queue.length > 0) {
            const { id, hop } = queue.shift();
            if (visitedNodes.has(id) || hop > maxHops)
                continue;
            const currentNode = this.nodes.get(id);
            if (currentNode) {
                visitedNodes.set(id, currentNode);
                if (hop < maxHops) {
                    const neighbors = this.adjacencyList.get(id) || new Set();
                    for (const neighborId of neighbors) {
                        if (!visitedNodes.has(neighborId)) {
                            queue.push({ id: neighborId, hop: hop + 1 });
                            const edgeKey = this.getEdgeKey(id, neighborId);
                            const edge = this.edges.get(edgeKey);
                            if (edge && !chainEdges.find(e => e.id === edge.id)) {
                                chainEdges.push(edge);
                            }
                        }
                    }
                }
            }
        }
        return {
            rootNode: rootId,
            hops: maxHops,
            nodes: Array.from(visitedNodes.values()),
            edges: chainEdges,
            chainScore: this.calculateChainScore(Array.from(visitedNodes.keys()))
        };
    }
    /**
     * Calculate network metrics
     */
    calculateMetrics() {
        const nodeCount = this.nodes.size;
        const edgeCount = this.edges.size;
        // Density
        const maxEdges = nodeCount * (nodeCount - 1) / 2;
        const density = maxEdges > 0 ? edgeCount / maxEdges : 0;
        // Average degree
        let totalDegree = 0;
        for (const node of this.nodes.values()) {
            const neighbors = this.adjacencyList.get(node.identifier);
            node.degree = neighbors?.size || 0;
            totalDegree += node.degree;
        }
        const averageDegree = nodeCount > 0 ? totalDegree / nodeCount : 0;
        // Connected components (simplified)
        const components = this.countComponents();
        return {
            nodeCount,
            edgeCount,
            density,
            averageDegree,
            clusteringCoefficient: this.calculateClusteringCoefficient(),
            components,
            diameter: this.estimateDiameter()
        };
    }
    /**
     * Calculate PageRank for all nodes
     */
    calculatePageRank(iterations = 20, damping = 0.85) {
        const nodeCount = this.nodes.size;
        if (nodeCount === 0)
            return;
        // Initialize
        for (const node of this.nodes.values()) {
            node.pageRank = 1 / nodeCount;
        }
        // Iterate
        for (let i = 0; i < iterations; i++) {
            const newRanks = new Map();
            for (const node of this.nodes.values()) {
                let rank = (1 - damping) / nodeCount;
                const neighbors = this.adjacencyList.get(node.identifier) || new Set();
                for (const neighborId of neighbors) {
                    const neighbor = this.nodes.get(neighborId);
                    if (neighbor) {
                        const neighborDegree = this.adjacencyList.get(neighborId)?.size || 1;
                        rank += damping * (neighbor.pageRank / neighborDegree);
                    }
                }
                newRanks.set(node.identifier, rank);
            }
            // Update ranks
            for (const [id, rank] of newRanks) {
                const node = this.nodes.get(id);
                if (node)
                    node.pageRank = rank;
            }
        }
    }
    /**
     * Find key communicators (high centrality nodes)
     */
    findKeyCommunicators(limit = 10) {
        this.calculatePageRank();
        return Array.from(this.nodes.values())
            .sort((a, b) => b.pageRank - a.pageRank)
            .slice(0, limit);
    }
    /**
     * Detect communities using label propagation
     */
    detectCommunities() {
        const labels = new Map();
        // Initialize each node with its own label
        for (const id of this.nodes.keys()) {
            labels.set(id, id);
        }
        // Iterate until convergence
        let changed = true;
        let iterations = 0;
        const maxIterations = 50;
        while (changed && iterations < maxIterations) {
            changed = false;
            iterations++;
            for (const [id] of this.nodes) {
                const neighbors = this.adjacencyList.get(id) || new Set();
                if (neighbors.size === 0)
                    continue;
                // Count neighbor labels
                const labelCounts = new Map();
                for (const neighborId of neighbors) {
                    const label = labels.get(neighborId);
                    labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
                }
                // Find most frequent label
                let maxCount = 0;
                let maxLabel = labels.get(id);
                for (const [label, count] of labelCounts) {
                    if (count > maxCount) {
                        maxCount = count;
                        maxLabel = label;
                    }
                }
                if (maxLabel !== labels.get(id)) {
                    labels.set(id, maxLabel);
                    changed = true;
                }
            }
        }
        // Group by community
        const communities = new Map();
        for (const [id, label] of labels) {
            if (!communities.has(label)) {
                communities.set(label, []);
            }
            communities.get(label).push(id);
        }
        return communities;
    }
    countComponents() {
        const visited = new Set();
        let components = 0;
        for (const id of this.nodes.keys()) {
            if (!visited.has(id)) {
                components++;
                this.dfs(id, visited);
            }
        }
        return components;
    }
    dfs(start, visited) {
        const stack = [start];
        while (stack.length > 0) {
            const id = stack.pop();
            if (visited.has(id))
                continue;
            visited.add(id);
            const neighbors = this.adjacencyList.get(id) || new Set();
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    stack.push(neighbor);
                }
            }
        }
    }
    calculateClusteringCoefficient() {
        let totalCoeff = 0;
        let count = 0;
        for (const [id] of this.nodes) {
            const neighbors = Array.from(this.adjacencyList.get(id) || []);
            const k = neighbors.length;
            if (k < 2)
                continue;
            let triangles = 0;
            for (let i = 0; i < k; i++) {
                for (let j = i + 1; j < k; j++) {
                    if (this.adjacencyList.get(neighbors[i])?.has(neighbors[j])) {
                        triangles++;
                    }
                }
            }
            const possibleTriangles = k * (k - 1) / 2;
            totalCoeff += triangles / possibleTriangles;
            count++;
        }
        return count > 0 ? totalCoeff / count : 0;
    }
    estimateDiameter() {
        // Simplified: sample a few BFS traversals
        let maxDistance = 0;
        const sampleNodes = Array.from(this.nodes.keys()).slice(0, 5);
        for (const start of sampleNodes) {
            const distances = this.bfsDistances(start);
            for (const d of distances.values()) {
                if (d > maxDistance && d < Infinity) {
                    maxDistance = d;
                }
            }
        }
        return maxDistance;
    }
    bfsDistances(start) {
        const distances = new Map();
        const queue = [{ id: start, dist: 0 }];
        while (queue.length > 0) {
            const { id, dist } = queue.shift();
            if (distances.has(id))
                continue;
            distances.set(id, dist);
            const neighbors = this.adjacencyList.get(id) || new Set();
            for (const neighbor of neighbors) {
                if (!distances.has(neighbor)) {
                    queue.push({ id: neighbor, dist: dist + 1 });
                }
            }
        }
        return distances;
    }
    calculateChainScore(nodeIds) {
        let score = 0;
        for (const id of nodeIds) {
            const node = this.nodes.get(id);
            if (node) {
                score += node.pageRank + node.communicationCount * 0.01;
            }
        }
        return score;
    }
    getNodes() {
        return Array.from(this.nodes.values());
    }
    getEdges() {
        return Array.from(this.edges.values());
    }
    getNode(identifier) {
        return this.nodes.get(identifier);
    }
    clear() {
        this.nodes.clear();
        this.edges.clear();
        this.adjacencyList.clear();
    }
}
exports.CommunicationsMapper = CommunicationsMapper;
