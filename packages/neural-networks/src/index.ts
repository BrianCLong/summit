/**
 * @intelgraph/neural-networks
 * Neural network architecture library and model zoo
 */

import { z } from 'zod';
import type { Layer, ModelMetadata } from '@intelgraph/deep-learning-core';

// ============================================================================
// Neural Network Architecture Definitions
// ============================================================================

export interface NeuralNetworkArchitecture {
  name: string;
  type: 'feedforward' | 'convolutional' | 'recurrent' | 'transformer' | 'hybrid';
  layers: Layer[];
  inputShape: number[];
  outputShape: number[];
  parameters?: number;
  description?: string;
}

/**
 * Architecture search configuration
 */
export const ArchitectureSearchConfigSchema = z.object({
  searchSpace: z.object({
    minLayers: z.number().positive(),
    maxLayers: z.number().positive(),
    allowedLayerTypes: z.array(z.string()),
    hiddenUnitsRange: z.tuple([z.number(), z.number()]),
    activations: z.array(z.string()),
  }),
  strategy: z.enum(['random', 'grid', 'bayesian', 'evolutionary', 'reinforcement']),
  budget: z.object({
    maxTrials: z.number().positive(),
    maxDuration: z.number().positive().optional(),
    maxParametersPerModel: z.number().positive().optional(),
  }),
  objective: z.object({
    metric: z.string(),
    direction: z.enum(['maximize', 'minimize']),
  }),
});

export type ArchitectureSearchConfig = z.infer<typeof ArchitectureSearchConfigSchema>;

// ============================================================================
// Pre-built Architectures
// ============================================================================

/**
 * Multi-Layer Perceptron (MLP) architecture
 */
export function createMLP(config: {
  inputSize: number;
  hiddenLayers: number[];
  outputSize: number;
  activation?: string;
  dropout?: number;
}): NeuralNetworkArchitecture {
  const { inputSize, hiddenLayers, outputSize, activation = 'relu', dropout = 0 } = config;

  const layers: Layer[] = [];

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
 * ResNet building block
 */
export interface ResNetBlock {
  filters: number;
  kernelSize: number;
  strides?: number;
  activation?: string;
}

/**
 * Create ResNet architecture
 */
export function createResNet(config: {
  inputShape: [number, number, number];
  blocks: ResNetBlock[];
  numClasses: number;
}): NeuralNetworkArchitecture {
  const { inputShape, blocks, numClasses } = config;

  const layers: Layer[] = [];

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
export function createUNet(config: {
  inputShape: [number, number, number];
  numClasses: number;
  depth?: number;
  filters?: number;
}): NeuralNetworkArchitecture {
  const { inputShape, numClasses, depth = 4, filters = 64 } = config;

  const layers: Layer[] = [];

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

export class NeuralArchitectureSearch {
  private config: ArchitectureSearchConfig;
  private triedArchitectures: Map<string, number> = new Map();

  constructor(config: ArchitectureSearchConfig) {
    this.config = config;
  }

  /**
   * Generate random architecture
   */
  generateRandomArchitecture(): NeuralNetworkArchitecture {
    const { minLayers, maxLayers, allowedLayerTypes, hiddenUnitsRange, activations } =
      this.config.searchSpace;

    const numLayers = Math.floor(Math.random() * (maxLayers - minLayers + 1)) + minLayers;

    const layers: Layer[] = [];

    layers.push({
      type: 'input',
      name: 'input',
      config: { shape: [hiddenUnitsRange[0]] },
    });

    for (let i = 0; i < numLayers; i++) {
      const layerType =
        allowedLayerTypes[Math.floor(Math.random() * allowedLayerTypes.length)];
      const units =
        Math.floor(Math.random() * (hiddenUnitsRange[1] - hiddenUnitsRange[0] + 1)) +
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
  async search(
    evaluationFn: (arch: NeuralNetworkArchitecture) => Promise<number>,
  ): Promise<{ architecture: NeuralNetworkArchitecture; score: number }> {
    let bestArchitecture: NeuralNetworkArchitecture | null = null;
    let bestScore = this.config.objective.direction === 'maximize' ? -Infinity : Infinity;

    for (let trial = 0; trial < this.config.budget.maxTrials; trial++) {
      const architecture = this.generateRandomArchitecture();
      const architectureKey = JSON.stringify(architecture.layers);

      if (this.triedArchitectures.has(architectureKey)) {
        continue;
      }

      const score = await evaluationFn(architecture);
      this.triedArchitectures.set(architectureKey, score);

      const isBetter =
        this.config.objective.direction === 'maximize'
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

// ============================================================================
// Model Versioning and Lineage
// ============================================================================

export interface ModelVersion {
  version: string;
  modelId: string;
  architecture: NeuralNetworkArchitecture;
  parentVersion?: string;
  changes: string[];
  createdAt: string;
  metrics?: Record<string, number>;
}

export class ModelVersionManager {
  private versions: Map<string, ModelVersion[]> = new Map();

  /**
   * Create new version
   */
  createVersion(
    modelId: string,
    architecture: NeuralNetworkArchitecture,
    parentVersion?: string,
    changes: string[] = [],
  ): ModelVersion {
    const versions = this.versions.get(modelId) || [];
    const version = `v${versions.length + 1}`;

    const modelVersion: ModelVersion = {
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
  getVersionHistory(modelId: string): ModelVersion[] {
    return this.versions.get(modelId) || [];
  }

  /**
   * Get specific version
   */
  getVersion(modelId: string, version: string): ModelVersion | undefined {
    const versions = this.versions.get(modelId) || [];
    return versions.find((v) => v.version === version);
  }

  /**
   * Get lineage (parent chain)
   */
  getLineage(modelId: string, version: string): ModelVersion[] {
    const lineage: ModelVersion[] = [];
    let current = this.getVersion(modelId, version);

    while (current) {
      lineage.unshift(current);
      if (current.parentVersion) {
        current = this.getVersion(modelId, current.parentVersion);
      } else {
        break;
      }
    }

    return lineage;
  }
}

// ============================================================================
// Benchmarking
// ============================================================================

export interface BenchmarkResult {
  modelId: string;
  architecture: string;
  dataset: string;
  metrics: Record<string, number>;
  inferenceTime: number;
  throughput: number;
  parameters: number;
  modelSize: number;
  timestamp: string;
}

export class ArchitectureBenchmark {
  private results: BenchmarkResult[] = [];

  /**
   * Add benchmark result
   */
  addResult(result: BenchmarkResult): void {
    this.results.push(result);
  }

  /**
   * Get results for specific architecture
   */
  getResultsForArchitecture(architecture: string): BenchmarkResult[] {
    return this.results.filter((r) => r.architecture === architecture);
  }

  /**
   * Compare architectures
   */
  compareArchitectures(
    arch1: string,
    arch2: string,
    metric: string,
  ): { architecture: string; value: number }[] {
    const results1 = this.getResultsForArchitecture(arch1);
    const results2 = this.getResultsForArchitecture(arch2);

    const avg1 =
      results1.reduce((sum, r) => sum + (r.metrics[metric] || 0), 0) / results1.length;
    const avg2 =
      results2.reduce((sum, r) => sum + (r.metrics[metric] || 0), 0) / results2.length;

    return [
      { architecture: arch1, value: avg1 },
      { architecture: arch2, value: avg2 },
    ];
  }

  /**
   * Get leaderboard
   */
  getLeaderboard(metric: string, limit = 10): BenchmarkResult[] {
    return this.results
      .filter((r) => r.metrics[metric] !== undefined)
      .sort((a, b) => (b.metrics[metric] || 0) - (a.metrics[metric] || 0))
      .slice(0, limit);
  }
}

// ============================================================================
// Exports
// ============================================================================

export * from './architectures';
export * from './model-zoo';
