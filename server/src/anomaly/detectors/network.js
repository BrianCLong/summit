"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkDetector = void 0;
const types_js_1 = require("../types.js");
const forest_js_1 = require("../forest.js");
class NetworkDetector {
    type = types_js_1.AnomalyType.NETWORK;
    async detect(context) {
        const data = context.data;
        const { graph, targetNodeId } = data;
        // Run existing isolation forest implementation
        const result = forest_js_1.isolationForest.fit_transform((await Promise.resolve().then(() => __importStar(require('../forest.js')))).features(graph));
        // If looking for a specific node's anomaly status
        if (targetNodeId) {
            const nodeResult = result.nodes.find((n) => n.id === targetNodeId);
            if (nodeResult) {
                return this.mapToResult(context, nodeResult);
            }
            else {
                // Node not found in graph analysis
                return this.createResult(context, false, 0, types_js_1.Severity.LOW);
            }
        }
        // If general graph analysis, check if we have any high confidence anomalies
        const criticalAnomalies = result.nodes.filter(n => n.score > 0.8);
        const isAnomaly = criticalAnomalies.length > 0;
        const maxScore = isAnomaly ? Math.max(...criticalAnomalies.map(n => n.score)) : 0;
        return this.createResult(context, isAnomaly, maxScore, isAnomaly ? types_js_1.Severity.HIGH : types_js_1.Severity.LOW, isAnomaly ? {
            description: `Detected ${criticalAnomalies.length} network anomalies in graph`,
            contributingFactors: criticalAnomalies.slice(0, 5).map(n => ({
                factor: `Node ${n.id} anomaly`,
                weight: n.score,
                value: n.reason
            }))
        } : undefined);
    }
    mapToResult(context, node) {
        let severity = types_js_1.Severity.LOW;
        if (node.score > 0.9)
            severity = types_js_1.Severity.CRITICAL;
        else if (node.score > 0.75)
            severity = types_js_1.Severity.HIGH;
        else if (node.score > 0.5)
            severity = types_js_1.Severity.MEDIUM;
        return {
            isAnomaly: node.isAnomaly,
            score: node.score,
            severity,
            type: this.type,
            entityId: context.entityId,
            timestamp: context.timestamp,
            explanation: node.isAnomaly ? {
                description: `Network anomaly detected: ${node.reason}`,
                contributingFactors: Object.entries(node.metrics).map(([key, value]) => ({
                    factor: key,
                    weight: 1.0, // Simplification
                    value
                }))
            } : undefined
        };
    }
    createResult(context, isAnomaly, score, severity, explanation) {
        return {
            isAnomaly,
            score,
            severity,
            type: this.type,
            entityId: context.entityId,
            timestamp: context.timestamp,
            explanation,
        };
    }
}
exports.NetworkDetector = NetworkDetector;
