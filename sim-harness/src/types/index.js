"use strict";
/**
 * Core types for the simulation harness
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GRAPH_SIZE_CONFIGS = void 0;
exports.GRAPH_SIZE_CONFIGS = {
    small: { entities: 20, relationshipDensity: 0.2, clusterCount: 2 },
    medium: { entities: 50, relationshipDensity: 0.3, clusterCount: 3 },
    large: { entities: 100, relationshipDensity: 0.25, clusterCount: 5 },
    xlarge: { entities: 200, relationshipDensity: 0.2, clusterCount: 8 },
};
