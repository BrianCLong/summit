"use strict";
/**
 * Amplification network identification
 * Detects coordinated amplification and influence networks
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmplificationDetector = void 0;
class AmplificationDetector {
    async detectAmplificationNetworks(nodes) {
        const networks = [];
        // Build adjacency graph
        const graph = this.buildGraph(nodes);
        // Identify central nodes (potential influencers)
        const centralNodes = this.identifyCentralNodes(nodes, graph);
        // For each central node, find its amplification network
        for (const centralId of centralNodes) {
            const network = this.traceAmplificationNetwork(centralId, nodes, graph);
            if (network.amplifiers.length >= 3) {
                networks.push(network);
            }
        }
        return networks;
    }
    async analyzeAmplificationChains(network, nodes) {
        const chains = [];
        for (const centralId of network.centralNodes) {
            const chain = this.traceChain(centralId, nodes);
            chains.push(chain);
        }
        return chains;
    }
    buildGraph(nodes) {
        const graph = new Map();
        for (const node of nodes) {
            if (!graph.has(node.nodeId)) {
                graph.set(node.nodeId, new Set());
            }
            for (const connection of node.connections) {
                graph.get(node.nodeId).add(connection);
            }
        }
        return graph;
    }
    identifyCentralNodes(nodes, graph) {
        const centralNodes = [];
        // Calculate centrality metrics
        const centralities = new Map();
        for (const node of nodes) {
            const centrality = this.calculateCentrality(node.nodeId, graph);
            centralities.set(node.nodeId, centrality);
        }
        // Get top 20% as central nodes
        const sortedNodes = Array.from(centralities.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, Math.ceil(nodes.length * 0.2));
        for (const [nodeId] of sortedNodes) {
            centralNodes.push(nodeId);
        }
        return centralNodes;
    }
    calculateCentrality(nodeId, graph) {
        // Simple degree centrality (number of connections)
        const connections = graph.get(nodeId) || new Set();
        return connections.size;
    }
    traceAmplificationNetwork(centralId, nodes, graph) {
        const amplifiers = [];
        const targets = new Set();
        const visited = new Set();
        // BFS to find amplification network
        const queue = [centralId];
        visited.add(centralId);
        while (queue.length > 0) {
            const currentId = queue.shift();
            const connections = graph.get(currentId) || new Set();
            for (const connectedId of connections) {
                if (visited.has(connectedId))
                    continue;
                visited.add(connectedId);
                const node = nodes.find(n => n.nodeId === connectedId);
                if (!node)
                    continue;
                // Classify node
                if (this.isAmplifier(node)) {
                    amplifiers.push(connectedId);
                    queue.push(connectedId); // Continue tracing from amplifiers
                }
                else {
                    targets.add(connectedId);
                }
            }
        }
        const amplificationFactor = this.calculateAmplificationFactor(centralId, amplifiers, nodes);
        const reach = this.calculateReach(centralId, amplifiers, nodes);
        const coordination = this.calculateCoordination([centralId, ...amplifiers], graph);
        return {
            networkId: this.generateNetworkId(centralId),
            centralNodes: [centralId],
            amplifiers,
            targets: Array.from(targets),
            amplificationFactor,
            reach,
            coordination,
        };
    }
    isAmplifier(node) {
        // Amplifiers have high share/repost activity relative to original posts
        const shareRatio = node.activity.shares / Math.max(node.activity.posts, 1);
        return shareRatio > 2;
    }
    calculateAmplificationFactor(centralId, amplifiers, nodes) {
        const centralNode = nodes.find(n => n.nodeId === centralId);
        if (!centralNode)
            return 0;
        let totalAmplification = 0;
        for (const amplifierId of amplifiers) {
            const amplifier = nodes.find(n => n.nodeId === amplifierId);
            if (amplifier) {
                totalAmplification += amplifier.activity.followers;
            }
        }
        const originalReach = centralNode.activity.followers;
        return totalAmplification / Math.max(originalReach, 1);
    }
    calculateReach(centralId, amplifiers, nodes) {
        const centralNode = nodes.find(n => n.nodeId === centralId);
        let totalReach = centralNode?.activity.followers || 0;
        for (const amplifierId of amplifiers) {
            const amplifier = nodes.find(n => n.nodeId === amplifierId);
            if (amplifier) {
                totalReach += amplifier.activity.followers;
            }
        }
        return totalReach;
    }
    calculateCoordination(nodeIds, graph) {
        if (nodeIds.length < 2)
            return 0;
        let connections = 0;
        const maxPossible = (nodeIds.length * (nodeIds.length - 1)) / 2;
        for (let i = 0; i < nodeIds.length; i++) {
            const nodeConnections = graph.get(nodeIds[i]) || new Set();
            for (let j = i + 1; j < nodeIds.length; j++) {
                if (nodeConnections.has(nodeIds[j])) {
                    connections++;
                }
            }
        }
        return connections / maxPossible;
    }
    traceChain(centralId, nodes) {
        // Simplified chain tracing
        const chain = [];
        const centralNode = nodes.find(n => n.nodeId === centralId);
        if (centralNode) {
            chain.push({
                nodeId: centralId,
                level: 0,
                reach: centralNode.activity.followers,
                engagement: centralNode.activity.engagement,
            });
            // Add first-level amplifiers
            for (const connection of centralNode.connections) {
                const amplifier = nodes.find(n => n.nodeId === connection);
                if (amplifier && this.isAmplifier(amplifier)) {
                    chain.push({
                        nodeId: connection,
                        level: 1,
                        reach: amplifier.activity.followers,
                        engagement: amplifier.activity.engagement,
                    });
                }
            }
        }
        return {
            chainId: this.generateChainId(centralId),
            origin: centralId,
            links: chain,
            totalReach: chain.reduce((sum, link) => sum + link.reach, 0),
            depth: Math.max(...chain.map(link => link.level)) + 1,
        };
    }
    generateNetworkId(centralId) {
        return `ampnet_${centralId}_${Date.now().toString(36)}`;
    }
    generateChainId(centralId) {
        return `chain_${centralId}_${Date.now().toString(36)}`;
    }
}
exports.AmplificationDetector = AmplificationDetector;
