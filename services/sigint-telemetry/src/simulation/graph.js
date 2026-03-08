"use strict";
/**
 * Infrastructure Graph Model
 *
 * Models synthetic infrastructure as a graph for attack path simulation.
 * Nodes represent assets, identities, and services.
 * Edges represent trust, reachability, and permissions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InfrastructureGraph = void 0;
exports.createSampleInfrastructure = createSampleInfrastructure;
const uuid_1 = require("uuid");
/** Infrastructure graph */
class InfrastructureGraph {
    nodes = new Map();
    edges = new Map();
    adjacencyList = new Map();
    /** Add a node to the graph */
    addNode(node) {
        const fullNode = {
            ...node,
            id: (0, uuid_1.v4)(),
            compromised: false,
        };
        this.nodes.set(fullNode.id, fullNode);
        this.adjacencyList.set(fullNode.id, new Set());
        return fullNode;
    }
    /** Add an edge between nodes */
    addEdge(edge) {
        if (!this.nodes.has(edge.sourceId) || !this.nodes.has(edge.targetId)) {
            throw new Error('Source or target node not found');
        }
        const fullEdge = {
            ...edge,
            id: (0, uuid_1.v4)(),
        };
        this.edges.set(fullEdge.id, fullEdge);
        this.adjacencyList.get(edge.sourceId)?.add(edge.targetId);
        return fullEdge;
    }
    /** Get a node by ID */
    getNode(id) {
        return this.nodes.get(id);
    }
    /** Get all nodes */
    getNodes() {
        return Array.from(this.nodes.values());
    }
    /** Get nodes by type */
    getNodesByType(type) {
        return this.getNodes().filter((n) => n.type === type);
    }
    /** Get edges from a node */
    getOutgoingEdges(nodeId) {
        return Array.from(this.edges.values()).filter((e) => e.sourceId === nodeId);
    }
    /** Get edges to a node */
    getIncomingEdges(nodeId) {
        return Array.from(this.edges.values()).filter((e) => e.targetId === nodeId);
    }
    /** Find neighbors of a node */
    getNeighbors(nodeId) {
        const neighborIds = this.adjacencyList.get(nodeId) ?? new Set();
        return Array.from(neighborIds)
            .map((id) => this.nodes.get(id))
            .filter((n) => n !== undefined);
    }
    /** Mark a node as compromised */
    compromiseNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (node) {
            node.compromised = true;
        }
    }
    /** Reset compromise state */
    resetCompromise() {
        for (const node of this.nodes.values()) {
            node.compromised = false;
        }
    }
    /** Find shortest path between nodes using BFS */
    findPath(sourceId, targetId) {
        if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
            return null;
        }
        const visited = new Set();
        const parent = new Map();
        const queue = [sourceId];
        visited.add(sourceId);
        while (queue.length > 0) {
            const current = queue.shift();
            if (current === targetId) {
                // Reconstruct path
                const path = [];
                let node = targetId;
                while (node !== undefined) {
                    path.unshift(this.nodes.get(node));
                    node = parent.get(node);
                }
                return path;
            }
            for (const neighborId of this.adjacencyList.get(current) ?? []) {
                if (!visited.has(neighborId)) {
                    visited.add(neighborId);
                    parent.set(neighborId, current);
                    queue.push(neighborId);
                }
            }
        }
        return null;
    }
    /** Find all attack paths from compromised nodes to target */
    findAttackPaths(targetId) {
        const compromisedNodes = this.getNodes().filter((n) => n.compromised);
        const paths = [];
        for (const node of compromisedNodes) {
            const path = this.findPath(node.id, targetId);
            if (path) {
                paths.push(path);
            }
        }
        return paths;
    }
    /** Calculate blast radius from a compromised node */
    calculateBlastRadius(nodeId) {
        const visited = new Set();
        const queue = [nodeId];
        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current)) {
                continue;
            }
            visited.add(current);
            for (const neighborId of this.adjacencyList.get(current) ?? []) {
                if (!visited.has(neighborId)) {
                    queue.push(neighborId);
                }
            }
        }
        return visited;
    }
    /** Get graph statistics */
    getStats() {
        const nodesByType = {};
        let compromisedCount = 0;
        for (const node of this.nodes.values()) {
            nodesByType[node.type] = (nodesByType[node.type] ?? 0) + 1;
            if (node.compromised) {
                compromisedCount++;
            }
        }
        return {
            nodeCount: this.nodes.size,
            edgeCount: this.edges.size,
            nodesByType,
            compromisedCount,
        };
    }
}
exports.InfrastructureGraph = InfrastructureGraph;
/** Create a sample synthetic infrastructure graph */
function createSampleInfrastructure() {
    const graph = new InfrastructureGraph();
    // Create identities
    const admin = graph.addNode({
        type: 'identity',
        name: 'admin@synthetic.example',
        properties: { role: 'admin', mfa: true },
        controls: ['mfa', 'conditional_access'],
    });
    const user = graph.addNode({
        type: 'identity',
        name: 'user@synthetic.example',
        properties: { role: 'user', mfa: true },
        controls: ['mfa'],
    });
    // Create endpoints
    const workstation = graph.addNode({
        type: 'endpoint',
        name: 'WS-001',
        properties: { os: 'Windows 11', managed: true },
        controls: ['edr', 'disk_encryption'],
    });
    // Create servers
    const webServer = graph.addNode({
        type: 'server',
        name: 'web-prod-01',
        properties: { os: 'Linux', service: 'nginx' },
        controls: ['hids', 'patching'],
    });
    const dbServer = graph.addNode({
        type: 'database',
        name: 'db-prod-01',
        properties: { engine: 'PostgreSQL', encrypted: true },
        controls: ['encryption', 'access_control'],
    });
    // Create cloud resources
    const cloudAccount = graph.addNode({
        type: 'cloud_account',
        name: 'prod-account',
        properties: { provider: 'aws', mfa: true },
        controls: ['cloudtrail', 'guardduty'],
    });
    const storage = graph.addNode({
        type: 'storage',
        name: 's3-data-bucket',
        properties: { encrypted: true, versioned: true },
        controls: ['encryption', 'access_logging'],
    });
    // Create edges (relationships)
    graph.addEdge({
        type: 'can_authenticate',
        sourceId: admin.id,
        targetId: workstation.id,
        properties: {},
        weight: 1,
    });
    graph.addEdge({
        type: 'can_access',
        sourceId: workstation.id,
        targetId: webServer.id,
        properties: { protocol: 'ssh' },
        weight: 1,
    });
    graph.addEdge({
        type: 'network_reachable',
        sourceId: webServer.id,
        targetId: dbServer.id,
        properties: { port: 5432 },
        weight: 1,
    });
    graph.addEdge({
        type: 'has_permission',
        sourceId: admin.id,
        targetId: cloudAccount.id,
        properties: { role: 'admin' },
        weight: 1,
    });
    graph.addEdge({
        type: 'can_access',
        sourceId: cloudAccount.id,
        targetId: storage.id,
        properties: {},
        weight: 1,
    });
    return graph;
}
