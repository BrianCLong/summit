"use strict";
/**
 * CascadeMap - Represents a complete cascade of outcomes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CascadeMapBuilder = void 0;
exports.buildCascadeDAG = buildCascadeDAG;
exports.findNodeById = findNodeById;
exports.getNodesByOrder = getNodesByOrder;
exports.getRootNodes = getRootNodes;
exports.getLeafNodes = getLeafNodes;
exports.calculateTotalMagnitude = calculateTotalMagnitude;
exports.calculateAmplification = calculateAmplification;
exports.getAmplificationByOrder = getAmplificationByOrder;
class CascadeMapBuilder {
    cascade;
    constructor(rootEvent, maxOrder) {
        this.cascade = {
            id: this.generateId(),
            rootEvent,
            maxOrder,
            totalNodes: 0,
            criticalPaths: [],
            leveragePoints: [],
            amplificationFactor: 1.0,
            createdAt: new Date(),
            metadata: {},
            nodes: [],
        };
    }
    withNodes(nodes) {
        this.cascade.nodes = nodes;
        this.cascade.totalNodes = nodes.length;
        return this;
    }
    withCriticalPaths(paths) {
        this.cascade.criticalPaths = paths;
        return this;
    }
    withLeveragePoints(points) {
        this.cascade.leveragePoints = points;
        return this;
    }
    withAmplificationFactor(factor) {
        this.cascade.amplificationFactor = factor;
        return this;
    }
    withMetadata(metadata) {
        this.cascade.metadata = { ...this.cascade.metadata, ...metadata };
        return this;
    }
    build() {
        return this.cascade;
    }
    generateId() {
        return `cascade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.CascadeMapBuilder = CascadeMapBuilder;
function buildCascadeDAG(nodes) {
    const edges = [];
    for (const node of nodes) {
        for (const childId of node.childNodes) {
            const child = nodes.find((n) => n.id === childId);
            if (!child)
                continue;
            edges.push({
                parentId: node.id,
                childId,
                strength: child.probability,
                evidenceQuality: child.evidenceStrength,
            });
        }
    }
    return { nodes, edges };
}
function findNodeById(cascade, nodeId) {
    return cascade.nodes.find((n) => n.id === nodeId);
}
function getNodesByOrder(cascade, order) {
    return cascade.nodes.filter((n) => n.order === order);
}
function getRootNodes(cascade) {
    return cascade.nodes.filter((n) => n.order === 1);
}
function getLeafNodes(cascade) {
    return cascade.nodes.filter((n) => n.childNodes.length === 0);
}
function calculateTotalMagnitude(nodes) {
    return nodes.reduce((sum, node) => sum + node.magnitude, 0);
}
function calculateAmplification(nodes, rootNode) {
    const totalMagnitude = calculateTotalMagnitude(nodes);
    const rootMagnitude = rootNode.magnitude;
    return rootMagnitude > 0 ? totalMagnitude / rootMagnitude : 1.0;
}
function getAmplificationByOrder(cascade) {
    const orders = new Map();
    for (const node of cascade.nodes) {
        if (!orders.has(node.order)) {
            orders.set(node.order, []);
        }
        orders.get(node.order).push(node);
    }
    const result = [];
    for (const [order, nodes] of orders.entries()) {
        result.push({
            order,
            nodeCount: nodes.length,
            totalMagnitude: calculateTotalMagnitude(nodes),
            avgProbability: nodes.reduce((sum, n) => sum + n.probability, 0) / nodes.length,
        });
    }
    return result.sort((a, b) => a.order - b.order);
}
