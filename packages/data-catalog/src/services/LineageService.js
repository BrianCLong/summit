"use strict";
/**
 * Lineage Service
 * Service for tracking and analyzing data lineage
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LineageService = void 0;
const lineage_js_1 = require("../types/lineage.js");
class LineageService {
    store;
    constructor(store) {
        this.store = store;
    }
    /**
     * Get lineage graph for an asset
     */
    async getLineage(request) {
        return this.store.getLineage(request);
    }
    /**
     * Get upstream lineage
     */
    async getUpstreamLineage(assetId, depth = 5, level = lineage_js_1.LineageLevel.TABLE) {
        const request = {
            assetId,
            direction: lineage_js_1.LineageDirection.UPSTREAM,
            level,
            depth,
            includeTransformations: true,
        };
        return this.store.getLineage(request);
    }
    /**
     * Get downstream lineage
     */
    async getDownstreamLineage(assetId, depth = 5, level = lineage_js_1.LineageLevel.TABLE) {
        const request = {
            assetId,
            direction: lineage_js_1.LineageDirection.DOWNSTREAM,
            level,
            depth,
            includeTransformations: true,
        };
        return this.store.getLineage(request);
    }
    /**
     * Get end-to-end lineage
     */
    async getEndToEndLineage(assetId, depth = 5, level = lineage_js_1.LineageLevel.TABLE) {
        const request = {
            assetId,
            direction: lineage_js_1.LineageDirection.BOTH,
            level,
            depth,
            includeTransformations: true,
        };
        return this.store.getLineage(request);
    }
    /**
     * Get column-level lineage
     */
    async getColumnLineage(assetId, columnName) {
        return this.store.getColumnLineage(assetId, columnName);
    }
    /**
     * Add lineage relationship
     */
    async addLineage(edge) {
        const newEdge = {
            ...edge,
            id: this.generateLineageId(edge.fromNodeId, edge.toNodeId),
        };
        return this.store.addLineageEdge(newEdge);
    }
    /**
     * Remove lineage relationship
     */
    async removeLineage(edgeId) {
        await this.store.removeLineageEdge(edgeId);
    }
    /**
     * Perform impact analysis
     */
    async analyzeImpact(assetId, depth = 10) {
        const lineage = await this.getDownstreamLineage(assetId, depth);
        const impactedAssets = lineage.nodes
            .filter((node) => node.assetId !== assetId)
            .map((node) => ({
            assetId: node.assetId,
            assetName: node.name,
            assetType: node.type,
            impactLevel: this.calculateImpactLevel(node.level, lineage.edges),
            path: this.findPath(assetId, node.assetId, lineage),
        }));
        const criticalImpacts = impactedAssets.filter((asset) => asset.impactLevel === lineage_js_1.ImpactLevel.CRITICAL || asset.impactLevel === lineage_js_1.ImpactLevel.HIGH).length;
        return {
            assetId,
            impactedAssets,
            totalImpacted: impactedAssets.length,
            criticalImpacts,
        };
    }
    /**
     * Find critical paths in lineage
     */
    async findCriticalPaths(assetId) {
        const lineage = await this.getEndToEndLineage(assetId, 10);
        const sources = lineage.nodes.filter((node) => lineage.edges.every((edge) => edge.toNodeId !== node.id));
        const sinks = lineage.nodes.filter((node) => lineage.edges.every((edge) => edge.fromNodeId !== node.id));
        const criticalPaths = [];
        for (const source of sources) {
            for (const sink of sinks) {
                const path = this.findPath(source.assetId, sink.assetId, lineage);
                if (path.length > 3) {
                    // Consider paths with 3+ hops as critical
                    criticalPaths.push(path);
                }
            }
        }
        return criticalPaths;
    }
    /**
     * Calculate impact level based on distance and criticality
     */
    calculateImpactLevel(distance, edges) {
        if (distance === 1) {
            return lineage_js_1.ImpactLevel.CRITICAL;
        }
        else if (distance === 2) {
            return lineage_js_1.ImpactLevel.HIGH;
        }
        else if (distance === 3) {
            return lineage_js_1.ImpactLevel.MEDIUM;
        }
        else {
            return lineage_js_1.ImpactLevel.LOW;
        }
    }
    /**
     * Find path between two assets
     */
    findPath(fromAssetId, toAssetId, lineage) {
        const visited = new Set();
        const queue = [{ assetId: fromAssetId, path: [fromAssetId] }];
        while (queue.length > 0) {
            const { assetId, path } = queue.shift();
            if (assetId === toAssetId) {
                return path;
            }
            if (visited.has(assetId)) {
                continue;
            }
            visited.add(assetId);
            const node = lineage.nodes.find((n) => n.assetId === assetId);
            if (!node) {
                continue;
            }
            const outgoingEdges = lineage.edges.filter((e) => e.fromNodeId === node.id);
            for (const edge of outgoingEdges) {
                const nextNode = lineage.nodes.find((n) => n.id === edge.toNodeId);
                if (nextNode && !visited.has(nextNode.assetId)) {
                    queue.push({
                        assetId: nextNode.assetId,
                        path: [...path, nextNode.assetId],
                    });
                }
            }
        }
        return [];
    }
    /**
     * Generate lineage ID
     */
    generateLineageId(fromNodeId, toNodeId) {
        return `lineage-${fromNodeId}-${toNodeId}-${Date.now()}`;
    }
}
exports.LineageService = LineageService;
