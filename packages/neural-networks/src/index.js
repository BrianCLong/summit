"use strict";
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * @intelgraph/neural-networks
 * Neural network architecture library and model zoo
 */
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchitectureBenchmark = exports.ModelVersionManager = exports.NeuralArchitectureSearch = exports.ArchitectureSearchConfigSchema = void 0;
exports.createMLP = createMLP;
exports.createResNet = createResNet;
exports.createUNet = createUNet;
const zod_1 = require("zod");
/**
 * Architecture search configuration
 */
exports.ArchitectureSearchConfigSchema = zod_1.z.object({
    searchSpace: zod_1.z.object({
        minLayers: zod_1.z.number().positive(),
        maxLayers: zod_1.z.number().positive(),
        allowedLayerTypes: zod_1.z.array(zod_1.z.string()),
        hiddenUnitsRange: zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()]),
        activations: zod_1.z.array(zod_1.z.string()),
    }),
    strategy: zod_1.z.enum(['random', 'grid', 'bayesian', 'evolutionary', 'reinforcement']),
    budget: zod_1.z.object({
        maxTrials: zod_1.z.number().positive(),
        maxDuration: zod_1.z.number().positive().optional(),
        maxParametersPerModel: zod_1.z.number().positive().optional(),
    }),
    objective: zod_1.z.object({
        metric: zod_1.z.string(),
        direction: zod_1.z.enum(['maximize', 'minimize']),
    }),
});
// ============================================================================
// Pre-built Architectures
// ============================================================================
/**
 * Multi-Layer Perceptron (MLP) architecture
 */
function createMLP(config) {
    const { inputSize, hiddenLayers, outputSize, activation = 'relu', dropout = 0 } = config;
    const layers = [];
    // Input layer
    layers.push({
        type: 'input',
        name: 'input',
        config: { shape: [inputSize] },
    });
    // Hidden layers
    hiddenLayers.forEach((units, index) => {
        layers.push({
            type: 'dense',
            name: `dense_${index}`,
            config: { units, activation },
        });
        if (dropout > 0) {
            layers.push({
                type: 'dropout',
                name: `dropout_${index}`,
                config: { rate: dropout },
            });
        }
    });
    // Output layer
    layers.push({
        type: 'dense',
        name: 'output',
        config: { units: outputSize, activation: 'softmax' },
    });
    return {
        name: 'MLP',
        type: 'feedforward',
        layers,
        inputShape: [inputSize],
        outputShape: [outputSize],
        description: 'Multi-Layer Perceptron',
    };
}
/**
 * Create ResNet architecture
 */
function createResNet(config) {
    const { inputShape, blocks, numClasses } = config;
    const layers = [];
    layers.push({
        type: 'input',
        name: 'input',
        config: { shape: inputShape },
    });
    // Initial convolution
    layers.push({
        type: 'conv2d',
        name: 'conv_init',
        config: {
            filters: 64,
            kernelSize: 7,
            strides: 2,
            padding: 'same',
            activation: 'relu',
        },
    });
    layers.push({
        type: 'max_pooling2d',
        name: 'max_pool_init',
        config: { poolSize: 3, strides: 2 },
    });
    // Residual blocks
    blocks.forEach((block, index) => {
        const blockName = `res_block_${index}`;
        // Main path
        layers.push({
            type: 'conv2d',
            name: `${blockName}_conv1`,
            config: {
                filters: block.filters,
                kernelSize: block.kernelSize,
                strides: block.strides || 1,
                padding: 'same',
            },
        });
        layers.push({
            type: 'batch_normalization',
            name: `${blockName}_bn1`,
            config: {},
        });
        layers.push({
            type: 'activation',
            name: `${blockName}_act1`,
            config: { activation: block.activation || 'relu' },
        });
        layers.push({
            type: 'conv2d',
            name: `${blockName}_conv2`,
            config: {
                filters: block.filters,
                kernelSize: block.kernelSize,
                padding: 'same',
            },
        });
        layers.push({
            type: 'batch_normalization',
            name: `${blockName}_bn2`,
            config: {},
        });
        // Skip connection
        layers.push({
            type: 'add',
            name: `${blockName}_add`,
            config: {},
        });
        layers.push({
            type: 'activation',
            name: `${blockName}_act2`,
            config: { activation: block.activation || 'relu' },
        });
    });
    // Global pooling and classification
    layers.push({
        type: 'global_average_pooling2d',
        name: 'global_pool',
        config: {},
    });
    layers.push({
        type: 'dense',
        name: 'output',
        config: { units: numClasses, activation: 'softmax' },
    });
    return {
        name: 'ResNet',
        type: 'convolutional',
        layers,
        inputShape: inputShape,
        outputShape: [numClasses],
        description: 'Residual Network',
    };
}
/**
 * U-Net architecture for segmentation
 */
function createUNet(config) {
    const { inputShape, numClasses, depth = 4, filters = 64 } = config;
    const layers = [];
    layers.push({
        type: 'input',
        name: 'input',
        config: { shape: inputShape },
    });
    // Encoder (downsampling)
    for (let i = 0; i < depth; i++) {
        const numFilters = filters * Math.pow(2, i);
        layers.push({
            type: 'conv2d',
            name: `encoder_conv_${i}_1`,
            config: { filters: numFilters, kernelSize: 3, padding: 'same', activation: 'relu' },
        });
        layers.push({
            type: 'conv2d',
            name: `encoder_conv_${i}_2`,
            config: { filters: numFilters, kernelSize: 3, padding: 'same', activation: 'relu' },
        });
        if (i < depth - 1) {
            layers.push({
                type: 'max_pooling2d',
                name: `encoder_pool_${i}`,
                config: { poolSize: 2 },
            });
        }
    }
    // Decoder (upsampling)
    for (let i = depth - 2; i >= 0; i--) {
        const numFilters = filters * Math.pow(2, i);
        layers.push({
            type: 'conv2d_transpose',
            name: `decoder_upconv_${i}`,
            config: { filters: numFilters, kernelSize: 2, strides: 2, padding: 'same' },
        });
        layers.push({
            type: 'concatenate',
            name: `decoder_concat_${i}`,
            config: {},
        });
        layers.push({
            type: 'conv2d',
            name: `decoder_conv_${i}_1`,
            config: { filters: numFilters, kernelSize: 3, padding: 'same', activation: 'relu' },
        });
        layers.push({
            type: 'conv2d',
            name: `decoder_conv_${i}_2`,
            config: { filters: numFilters, kernelSize: 3, padding: 'same', activation: 'relu' },
        });
    }
    // Output
    layers.push({
        type: 'conv2d',
        name: 'output',
        config: { filters: numClasses, kernelSize: 1, activation: 'softmax' },
    });
    return {
        name: 'U-Net',
        type: 'convolutional',
        layers,
        inputShape,
        outputShape: [inputShape[0], inputShape[1], numClasses],
        description: 'U-Net for semantic segmentation',
    };
}
// ============================================================================
// Neural Architecture Search (NAS)
// ============================================================================
class NeuralArchitectureSearch {
    config;
    triedArchitectures = new Map();
    constructor(config) {
        this.config = config;
    }
    /**
     * Generate random architecture
     */
    generateRandomArchitecture() {
        const { minLayers, maxLayers, allowedLayerTypes, hiddenUnitsRange, activations } = this.config.searchSpace;
        const numLayers = Math.floor(Math.random() * (maxLayers - minLayers + 1)) + minLayers;
        const layers = [];
        layers.push({
            type: 'input',
            name: 'input',
            config: { shape: [hiddenUnitsRange[0]] },
        });
        for (let i = 0; i < numLayers; i++) {
            const layerType = allowedLayerTypes[Math.floor(Math.random() * allowedLayerTypes.length)];
            const units = Math.floor(Math.random() * (hiddenUnitsRange[1] - hiddenUnitsRange[0] + 1)) +
                hiddenUnitsRange[0];
            const activation = activations[Math.floor(Math.random() * activations.length)];
            layers.push({
                type: layerType,
                name: `layer_${i}`,
                config: { units, activation },
            });
        }
        layers.push({
            type: 'dense',
            name: 'output',
            config: { units: hiddenUnitsRange[0], activation: 'softmax' },
        });
        return {
            name: `nas_arch_${this.triedArchitectures.size}`,
            type: 'feedforward',
            layers,
            inputShape: [hiddenUnitsRange[0]],
            outputShape: [hiddenUnitsRange[0]],
        };
    }
    /**
     * Run architecture search
     */
    async search(evaluationFn) {
        let bestArchitecture = null;
        let bestScore = this.config.objective.direction === 'maximize' ? -Infinity : Infinity;
        for (let trial = 0; trial < this.config.budget.maxTrials; trial++) {
            const architecture = this.generateRandomArchitecture();
            const architectureKey = JSON.stringify(architecture.layers);
            if (this.triedArchitectures.has(architectureKey)) {
                continue;
            }
            const score = await evaluationFn(architecture);
            this.triedArchitectures.set(architectureKey, score);
            const isBetter = this.config.objective.direction === 'maximize'
                ? score > bestScore
                : score < bestScore;
            if (isBetter) {
                bestScore = score;
                bestArchitecture = architecture;
            }
        }
        if (!bestArchitecture) {
            throw new Error('No valid architecture found');
        }
        return { architecture: bestArchitecture, score: bestScore };
    }
}
exports.NeuralArchitectureSearch = NeuralArchitectureSearch;
class ModelVersionManager {
    versions = new Map();
    /**
     * Create new version
     */
    createVersion(modelId, architecture, parentVersion, changes = []) {
        const versions = this.versions.get(modelId) || [];
        const version = `v${versions.length + 1}`;
        const modelVersion = {
            version,
            modelId,
            architecture,
            parentVersion,
            changes,
            createdAt: new Date().toISOString(),
        };
        versions.push(modelVersion);
        this.versions.set(modelId, versions);
        return modelVersion;
    }
    /**
     * Get version history
     */
    getVersionHistory(modelId) {
        return this.versions.get(modelId) || [];
    }
    /**
     * Get specific version
     */
    getVersion(modelId, version) {
        const versions = this.versions.get(modelId) || [];
        return versions.find((v) => v.version === version);
    }
    /**
     * Get lineage (parent chain)
     */
    getLineage(modelId, version) {
        const lineage = [];
        let current = this.getVersion(modelId, version);
        while (current) {
            lineage.unshift(current);
            if (current.parentVersion) {
                current = this.getVersion(modelId, current.parentVersion);
            }
            else {
                break;
            }
        }
        return lineage;
    }
}
exports.ModelVersionManager = ModelVersionManager;
class ArchitectureBenchmark {
    results = [];
    /**
     * Add benchmark result
     */
    addResult(result) {
        this.results.push(result);
    }
    /**
     * Get results for specific architecture
     */
    getResultsForArchitecture(architecture) {
        return this.results.filter((r) => r.architecture === architecture);
    }
    /**
     * Compare architectures
     */
    compareArchitectures(arch1, arch2, metric) {
        const results1 = this.getResultsForArchitecture(arch1);
        const results2 = this.getResultsForArchitecture(arch2);
        const avg1 = results1.reduce((sum, r) => sum + (r.metrics[metric] || 0), 0) / results1.length;
        const avg2 = results2.reduce((sum, r) => sum + (r.metrics[metric] || 0), 0) / results2.length;
        return [
            { architecture: arch1, value: avg1 },
            { architecture: arch2, value: avg2 },
        ];
    }
    /**
     * Get leaderboard
     */
    getLeaderboard(metric, limit = 10) {
        return this.results
            .filter((r) => r.metrics[metric] !== undefined)
            .sort((a, b) => (b.metrics[metric] || 0) - (a.metrics[metric] || 0))
            .slice(0, limit);
    }
}
exports.ArchitectureBenchmark = ArchitectureBenchmark;
// ============================================================================
// Exports
// ============================================================================
__exportStar(require("./architectures"), exports);
__exportStar(require("./model-zoo"), exports);
