"use strict";
/**
 * KG Explorer Types
 * Type definitions for the Knowledge Graph Explorer component
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LAYOUT_OPTIONS = exports.NODE_TYPE_COLORS = void 0;
exports.transformToGraphNode = transformToGraphNode;
exports.transformToGraphEdge = transformToGraphEdge;
exports.toCytoscapeElements = toCytoscapeElements;
exports.NODE_TYPE_COLORS = {
    PERSON: '#22c55e',
    ORGANIZATION: '#3b82f6',
    LOCATION: '#f59e0b',
    DOCUMENT: '#a855f7',
    EVENT: '#ef4444',
    ASSET: '#06b6d4',
    THREAT: '#dc2626',
    INDICATOR: '#eab308',
    DEFAULT: '#6b7280',
};
exports.LAYOUT_OPTIONS = [
    {
        name: 'fcose',
        label: 'Force-Directed',
        icon: 'scatter',
        description: 'Physics-based layout for organic graph visualization',
    },
    {
        name: 'dagre',
        label: 'Hierarchical',
        icon: 'hierarchy',
        description: 'Top-down tree-like layout for directed graphs',
    },
    {
        name: 'cola',
        label: 'Constraint-Based',
        icon: 'grid',
        description: 'Layout with constraints for clean graph visualization',
    },
    {
        name: 'circle',
        label: 'Circular',
        icon: 'circle',
        description: 'Nodes arranged in a circle',
    },
    {
        name: 'concentric',
        label: 'Concentric',
        icon: 'target',
        description: 'Nodes arranged in concentric circles by centrality',
    },
];
function transformToGraphNode(node) {
    return {
        id: node.id,
        label: node.label,
        type: node.type,
        properties: node.properties,
        confidence: node.confidence ?? undefined,
        description: node.description ?? undefined,
        source: node.source ?? undefined,
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
    };
}
function transformToGraphEdge(edge) {
    return {
        id: edge.id,
        source: edge.fromEntityId,
        target: edge.toEntityId,
        type: edge.type,
        label: edge.label,
        confidence: edge.confidence ?? undefined,
        properties: edge.properties,
    };
}
function toCytoscapeElements(nodes, edges) {
    const cyNodes = nodes.map((node) => ({
        data: {
            id: node.id,
            label: node.label,
            type: node.type,
            confidence: node.confidence,
            description: node.description,
            properties: node.properties,
        },
        classes: node.type.toLowerCase(),
    }));
    const cyEdges = edges.map((edge) => ({
        data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            label: edge.label,
            type: edge.type,
            confidence: edge.confidence,
        },
        classes: edge.type.toLowerCase(),
    }));
    return [...cyNodes, ...cyEdges];
}
