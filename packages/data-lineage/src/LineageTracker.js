"use strict";
/**
 * Data lineage and provenance tracking system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LineageTracker = void 0;
class LineageTracker {
    logger;
    lineageGraph;
    constructor(logger) {
        this.logger = logger;
        this.lineageGraph = {
            nodes: [],
            edges: []
        };
    }
    /**
     * Track data source
     */
    trackSource(sourceId, sourceName, metadata) {
        const node = {
            id: sourceId,
            type: 'source',
            name: sourceName,
            metadata,
            timestamp: new Date()
        };
        this.lineageGraph.nodes.push(node);
        this.logger.debug(`Tracked data source: ${sourceName}`);
    }
    /**
     * Track transformation
     */
    trackTransformation(transformationId, transformationName, sourceId, metadata) {
        const node = {
            id: transformationId,
            type: 'transformation',
            name: transformationName,
            metadata,
            timestamp: new Date()
        };
        const edge = {
            from: sourceId,
            to: transformationId,
            transformationType: transformationName,
            metadata,
            timestamp: new Date()
        };
        this.lineageGraph.nodes.push(node);
        this.lineageGraph.edges.push(edge);
        this.logger.debug(`Tracked transformation: ${transformationName}`);
    }
    /**
     * Track target
     */
    trackTarget(targetId, targetName, sourceId, metadata) {
        const node = {
            id: targetId,
            type: 'target',
            name: targetName,
            metadata,
            timestamp: new Date()
        };
        const edge = {
            from: sourceId,
            to: targetId,
            transformationType: 'load',
            metadata,
            timestamp: new Date()
        };
        this.lineageGraph.nodes.push(node);
        this.lineageGraph.edges.push(edge);
        this.logger.debug(`Tracked target: ${targetName}`);
    }
    /**
     * Track column-level lineage
     */
    trackColumnLineage(columnLineage) {
        this.logger.debug(`Tracked column lineage: ${columnLineage.sourceTable}.${columnLineage.sourceColumn} -> ${columnLineage.targetTable}.${columnLineage.targetColumn}`);
    }
    /**
     * Get lineage graph
     */
    getLineageGraph() {
        return { ...this.lineageGraph };
    }
    /**
     * Get upstream lineage (sources)
     */
    getUpstreamLineage(nodeId) {
        const upstream = [];
        const visited = new Set();
        const traverse = (currentId) => {
            if (visited.has(currentId)) {
                return;
            }
            visited.add(currentId);
            const incomingEdges = this.lineageGraph.edges.filter(edge => edge.to === currentId);
            for (const edge of incomingEdges) {
                const node = this.lineageGraph.nodes.find(n => n.id === edge.from);
                if (node) {
                    upstream.push(node);
                    traverse(edge.from);
                }
            }
        };
        traverse(nodeId);
        return upstream;
    }
    /**
     * Get downstream lineage (targets)
     */
    getDownstreamLineage(nodeId) {
        const downstream = [];
        const visited = new Set();
        const traverse = (currentId) => {
            if (visited.has(currentId)) {
                return;
            }
            visited.add(currentId);
            const outgoingEdges = this.lineageGraph.edges.filter(edge => edge.from === currentId);
            for (const edge of outgoingEdges) {
                const node = this.lineageGraph.nodes.find(n => n.id === edge.to);
                if (node) {
                    downstream.push(node);
                    traverse(edge.to);
                }
            }
        };
        traverse(nodeId);
        return downstream;
    }
    /**
     * Get impact analysis - what would be affected if this node changes
     */
    getImpactAnalysis(nodeId) {
        const downstream = this.getDownstreamLineage(nodeId);
        return {
            affectedNodes: downstream,
            affectedCount: downstream.length
        };
    }
    /**
     * Persist lineage to database (Neo4j or PostgreSQL)
     */
    async persistLineage() {
        // Would implement persistence to graph database (Neo4j) or relational database
        this.logger.info('Lineage persistence not yet implemented');
    }
    /**
     * Clear lineage graph
     */
    clear() {
        this.lineageGraph = {
            nodes: [],
            edges: []
        };
    }
}
exports.LineageTracker = LineageTracker;
