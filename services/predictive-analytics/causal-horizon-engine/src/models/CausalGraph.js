"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CausalGraph = exports.EdgeType = exports.DomainType = exports.NodeType = void 0;
const uuid_1 = require("uuid");
var NodeType;
(function (NodeType) {
    NodeType["OBSERVABLE"] = "OBSERVABLE";
    NodeType["LATENT"] = "LATENT";
    NodeType["INTERVENTION"] = "INTERVENTION";
})(NodeType || (exports.NodeType = NodeType = {}));
var DomainType;
(function (DomainType) {
    DomainType["CONTINUOUS"] = "CONTINUOUS";
    DomainType["DISCRETE"] = "DISCRETE";
    DomainType["BINARY"] = "BINARY";
    DomainType["CATEGORICAL"] = "CATEGORICAL";
})(DomainType || (exports.DomainType = DomainType = {}));
var EdgeType;
(function (EdgeType) {
    EdgeType["DIRECT_CAUSE"] = "DIRECT_CAUSE";
    EdgeType["CONFOUNDER"] = "CONFOUNDER";
    EdgeType["MEDIATOR"] = "MEDIATOR";
    EdgeType["COLLIDER"] = "COLLIDER";
    EdgeType["SELECTION_BIAS"] = "SELECTION_BIAS";
})(EdgeType || (exports.EdgeType = EdgeType = {}));
class CausalGraph {
    id;
    investigationId;
    nodes;
    edges;
    adjacencyList; // outgoing edges
    reverseAdjacencyList; // incoming edges
    metadata;
    createdAt;
    updatedAt;
    constructor(investigationId) {
        this.id = (0, uuid_1.v4)();
        this.investigationId = investigationId;
        this.nodes = new Map();
        this.edges = new Map();
        this.adjacencyList = new Map();
        this.reverseAdjacencyList = new Map();
        this.createdAt = new Date();
        this.updatedAt = new Date();
        this.metadata = {
            nodeCount: 0,
            edgeCount: 0,
            source: 'neo4j',
            confidence: 0,
            isAcyclic: true,
            hasLatentVariables: false,
        };
    }
    /**
     * Add a node to the causal graph
     */
    addNode(node) {
        const id = node.name; // Use name as ID for easy lookup
        const causalNode = {
            id,
            ...node,
        };
        this.nodes.set(id, causalNode);
        this.adjacencyList.set(id, new Set());
        this.reverseAdjacencyList.set(id, new Set());
        if (node.type === NodeType.LATENT) {
            this.metadata.hasLatentVariables = true;
        }
        this.updateMetadata();
        return causalNode;
    }
    /**
     * Add an edge to the causal graph
     */
    addEdge(edge) {
        if (!this.nodes.has(edge.from) || !this.nodes.has(edge.to)) {
            throw new Error(`Cannot add edge: nodes ${edge.from} or ${edge.to} do not exist`);
        }
        const id = `${edge.from}->${edge.to}`;
        const causalEdge = {
            id,
            ...edge,
        };
        this.edges.set(id, causalEdge);
        this.adjacencyList.get(edge.from).add(edge.to);
        this.reverseAdjacencyList.get(edge.to).add(edge.from);
        // Check for cycles
        if (this.hasCycle()) {
            this.metadata.isAcyclic = false;
        }
        this.updateMetadata();
        return causalEdge;
    }
    /**
     * Remove a node from the graph
     */
    removeNode(nodeId) {
        if (!this.nodes.has(nodeId)) {
            return;
        }
        // Remove all edges connected to this node
        const edgesToRemove = [];
        for (const [edgeId, edge] of this.edges) {
            if (edge.from === nodeId || edge.to === nodeId) {
                edgesToRemove.push(edgeId);
            }
        }
        edgesToRemove.forEach((edgeId) => this.removeEdge(edgeId));
        // Remove node
        this.nodes.delete(nodeId);
        this.adjacencyList.delete(nodeId);
        this.reverseAdjacencyList.delete(nodeId);
        this.updateMetadata();
    }
    /**
     * Remove an edge from the graph
     */
    removeEdge(edgeId) {
        const edge = this.edges.get(edgeId);
        if (!edge) {
            return;
        }
        this.edges.delete(edgeId);
        this.adjacencyList.get(edge.from)?.delete(edge.to);
        this.reverseAdjacencyList.get(edge.to)?.delete(edge.from);
        this.updateMetadata();
    }
    /**
     * Get node by ID
     */
    getNode(nodeId) {
        return this.nodes.get(nodeId);
    }
    /**
     * Get edge by ID
     */
    getEdge(edgeId) {
        return this.edges.get(edgeId);
    }
    /**
     * Get all children (direct descendants) of a node
     */
    getChildren(nodeId) {
        return Array.from(this.adjacencyList.get(nodeId) || []);
    }
    /**
     * Get all parents (direct ancestors) of a node
     */
    getParents(nodeId) {
        return Array.from(this.reverseAdjacencyList.get(nodeId) || []);
    }
    /**
     * Get all ancestors of a node (transitive parents)
     */
    getAncestors(nodeId) {
        const ancestors = new Set();
        const queue = [nodeId];
        const visited = new Set();
        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current))
                continue;
            visited.add(current);
            const parents = this.getParents(current);
            for (const parent of parents) {
                if (parent !== nodeId) {
                    ancestors.add(parent);
                    queue.push(parent);
                }
            }
        }
        return ancestors;
    }
    /**
     * Get all descendants of a node (transitive children)
     */
    getDescendants(nodeId) {
        const descendants = new Set();
        const queue = [nodeId];
        const visited = new Set();
        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current))
                continue;
            visited.add(current);
            const children = this.getChildren(current);
            for (const child of children) {
                if (child !== nodeId) {
                    descendants.add(child);
                    queue.push(child);
                }
            }
        }
        return descendants;
    }
    /**
     * Check if there's a directed path from source to target
     */
    hasPath(source, target) {
        if (source === target)
            return true;
        const visited = new Set();
        const queue = [source];
        while (queue.length > 0) {
            const current = queue.shift();
            if (current === target)
                return true;
            if (visited.has(current))
                continue;
            visited.add(current);
            const children = this.getChildren(current);
            queue.push(...children);
        }
        return false;
    }
    /**
     * Find all directed paths from source to target
     */
    findAllPaths(source, target) {
        const paths = [];
        const currentPath = [];
        const dfs = (node) => {
            currentPath.push(node);
            if (node === target) {
                paths.push([...currentPath]);
            }
            else {
                const children = this.getChildren(node);
                for (const child of children) {
                    if (!currentPath.includes(child)) {
                        // Avoid cycles
                        dfs(child);
                    }
                }
            }
            currentPath.pop();
        };
        dfs(source);
        return paths;
    }
    /**
     * Perform graph surgery: remove incoming edges to intervention variables
     * This implements the do-operator
     */
    doIntervention(interventionVariables) {
        const mutilatedGraph = this.clone();
        for (const variable of interventionVariables) {
            const parents = mutilatedGraph.getParents(variable);
            for (const parent of parents) {
                const edgeId = `${parent}->${variable}`;
                mutilatedGraph.removeEdge(edgeId);
            }
        }
        return mutilatedGraph;
    }
    /**
     * Check for cycles in the graph using DFS
     */
    hasCycle() {
        const visited = new Set();
        const recursionStack = new Set();
        const dfs = (node) => {
            visited.add(node);
            recursionStack.add(node);
            const children = this.getChildren(node);
            for (const child of children) {
                if (!visited.has(child)) {
                    if (dfs(child))
                        return true;
                }
                else if (recursionStack.has(child)) {
                    return true; // Cycle detected
                }
            }
            recursionStack.delete(node);
            return false;
        };
        for (const nodeId of this.nodes.keys()) {
            if (!visited.has(nodeId)) {
                if (dfs(nodeId))
                    return true;
            }
        }
        return false;
    }
    /**
     * Perform topological sort
     */
    topologicalSort() {
        const inDegree = new Map();
        const result = [];
        // Initialize in-degrees
        for (const nodeId of this.nodes.keys()) {
            inDegree.set(nodeId, this.getParents(nodeId).length);
        }
        // Find all nodes with in-degree 0
        const queue = [];
        for (const [nodeId, degree] of inDegree) {
            if (degree === 0) {
                queue.push(nodeId);
            }
        }
        // Process queue
        while (queue.length > 0) {
            const node = queue.shift();
            result.push(node);
            const children = this.getChildren(node);
            for (const child of children) {
                const degree = inDegree.get(child) - 1;
                inDegree.set(child, degree);
                if (degree === 0) {
                    queue.push(child);
                }
            }
        }
        if (result.length !== this.nodes.size) {
            throw new Error('Graph contains a cycle, cannot perform topological sort');
        }
        return result;
    }
    /**
     * Clone the graph
     */
    clone() {
        const cloned = new CausalGraph(this.investigationId);
        cloned.id = this.id;
        cloned.createdAt = this.createdAt;
        // Clone nodes
        for (const node of this.nodes.values()) {
            cloned.addNode(node);
        }
        // Clone edges
        for (const edge of this.edges.values()) {
            cloned.addEdge(edge);
        }
        return cloned;
    }
    /**
     * Update metadata after modifications
     */
    updateMetadata() {
        this.metadata.nodeCount = this.nodes.size;
        this.metadata.edgeCount = this.edges.size;
        this.updatedAt = new Date();
        // Update confidence as average of edge confidences
        if (this.edges.size > 0) {
            const totalConfidence = Array.from(this.edges.values()).reduce((sum, edge) => sum + edge.confidence, 0);
            this.metadata.confidence = totalConfidence / this.edges.size;
        }
    }
    /**
     * Serialize graph to JSON
     */
    toJSON() {
        return {
            id: this.id,
            investigationId: this.investigationId,
            nodes: Array.from(this.nodes.values()),
            edges: Array.from(this.edges.values()),
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
    /**
     * Deserialize graph from JSON
     */
    static fromJSON(data) {
        const graph = new CausalGraph(data.investigationId);
        graph.id = data.id;
        graph.createdAt = new Date(data.createdAt);
        graph.updatedAt = new Date(data.updatedAt);
        for (const node of data.nodes) {
            graph.addNode(node);
        }
        for (const edge of data.edges) {
            graph.addEdge(edge);
        }
        return graph;
    }
}
exports.CausalGraph = CausalGraph;
