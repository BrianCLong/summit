import axios from 'axios';
import { logger } from '../logging';

/**
 * GNN Service
 * Compatibility layer for Advanced ML Service and Legacy Tests
 */
export class GNNService {
    public static mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';

    /**
     * Health check for ML service
     */
    static async healthCheck() {
        try {
            const response = await axios.get(`${this.mlServiceUrl}/health`, {
                timeout: 5000,
            });
            return {
                available: response.status === 200,
                status: response.status === 200 ? 'healthy' : 'degraded',
                message: response.status === 200 ? 'ML Service is up' : 'ML Service returned non-200 status',
            };
        } catch (error: any) {
            return {
                available: false,
                status: 'unreachable',
                message: `ML service unreachable: ${error.message}`,
            };
        }
    }

    /**
     * Converts graph data (nodes/edges) into the format expected by the GNN Models
     */
    static convertGraphData(data: any) {
        if (!data) throw new Error('No data provided for conversion');

        const edges: [string, string][] = [];
        const nodeFeatures: Record<string, number[]> = {};

        // Handle edge list directly
        if (Array.isArray(data)) {
            data.forEach(item => {
                if (Array.isArray(item) && item.length >= 2) {
                    edges.push([String(item[0]), String(item[1])]);
                }
            });
            return { edges };
        }

        // Handle node-edge object
        if (data.nodes && Array.isArray(data.nodes)) {
            data.nodes.forEach((node: any) => {
                const features = this._extractNodeFeatures([node]);
                nodeFeatures[node.id] = features[node.id];
            });
        }

        if (data.edges && Array.isArray(data.edges)) {
            data.edges.forEach((edge: any) => {
                const source = edge.source || edge.from;
                const target = edge.target || edge.to;
                if (source && target) {
                    edges.push([String(source), String(target)]);
                }
            });
        }

        return {
            edges,
            node_features: nodeFeatures,
        };
    }

    /**
     * Extracts numeric features from entities for GNN consumption
     */
    static _extractNodeFeatures(nodes: any[]) {
        const features: Record<string, number[]> = {};
        nodes.forEach(node => {
            const nodeFeatures: number[] = [];
            // Extract all numeric properties as features
            Object.keys(node).forEach(key => {
                if (typeof node[key] === 'number') {
                    nodeFeatures.push(node[key]);
                }
            });

            // Default feature if none found
            if (nodeFeatures.length === 0) {
                nodeFeatures.push(1.0);
            }
            features[node.id] = nodeFeatures;
        });
        return features;
    }
}

export default GNNService;
