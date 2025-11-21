/**
 * @intelgraph/transformers
 * Transformer and attention mechanism platform
 */

import { z } from 'zod';
import type { Layer, NeuralNetworkArchitecture } from '@intelgraph/neural-networks';

// ============================================================================
// Attention Mechanisms
// ============================================================================

export interface AttentionConfig {
  numHeads: number;
  headDim: number;
  dropout?: number;
  useBias?: boolean;
  attentionType: 'standard' | 'sparse' | 'local' | 'global';
}

export interface MultiHeadAttentionLayer extends Layer {
  type: 'multi_head_attention';
  config: AttentionConfig;
}

/**
 * Create multi-head attention layer
 */
export function createMultiHeadAttention(config: AttentionConfig): MultiHeadAttentionLayer {
  return {
    type: 'multi_head_attention',
    name: 'mha',
    config,
  };
}

/**
 * Positional encoding strategies
 */
export type PositionalEncodingType = 'sinusoidal' | 'learned' | 'relative' | 'rotary';

export interface PositionalEncodingConfig {
  type: PositionalEncodingType;
  maxLength: number;
  embeddingDim: number;
}

// ============================================================================
// Transformer Architectures
// ============================================================================

export interface TransformerConfig {
  numLayers: number;
  dModel: number;
  numHeads: number;
  dff: number;
  vocabSize: number;
  maxLength: number;
  dropout?: number;
}

/**
 * BERT architecture
 */
export function createBERT(config: TransformerConfig): NeuralNetworkArchitecture {
  const layers: Layer[] = [
    { type: 'input', name: 'input_ids', config: { shape: [config.maxLength] } },
    { type: 'embedding', name: 'token_embedding', config: { vocabSize: config.vocabSize, embeddingDim: config.dModel } },
    { type: 'positional_encoding', name: 'pos_encoding', config: { maxLength: config.maxLength, embeddingDim: config.dModel } },
  ];

  // Transformer encoder layers
  for (let i = 0; i < config.numLayers; i++) {
    layers.push({
      type: 'transformer_encoder',
      name: `encoder_${i}`,
      config: {
        dModel: config.dModel,
        numHeads: config.numHeads,
        dff: config.dff,
        dropout: config.dropout || 0.1,
      },
    });
  }

  layers.push({ type: 'dense', name: 'output', config: { units: config.vocabSize, activation: 'softmax' } });

  return {
    name: 'BERT',
    type: 'transformer',
    layers,
    inputShape: [config.maxLength],
    outputShape: [config.maxLength, config.vocabSize],
    description: 'Bidirectional Encoder Representations from Transformers',
  };
}

/**
 * GPT architecture
 */
export function createGPT(config: TransformerConfig): NeuralNetworkArchitecture {
  const layers: Layer[] = [
    { type: 'input', name: 'input_ids', config: { shape: [config.maxLength] } },
    { type: 'embedding', name: 'token_embedding', config: { vocabSize: config.vocabSize, embeddingDim: config.dModel } },
    { type: 'positional_encoding', name: 'pos_encoding', config: { maxLength: config.maxLength, embeddingDim: config.dModel } },
  ];

  // Transformer decoder layers with causal masking
  for (let i = 0; i < config.numLayers; i++) {
    layers.push({
      type: 'transformer_decoder',
      name: `decoder_${i}`,
      config: {
        dModel: config.dModel,
        numHeads: config.numHeads,
        dff: config.dff,
        dropout: config.dropout || 0.1,
        causalMask: true,
      },
    });
  }

  layers.push({ type: 'layer_normalization', name: 'final_norm', config: {} });
  layers.push({ type: 'dense', name: 'output', config: { units: config.vocabSize } });

  return {
    name: 'GPT',
    type: 'transformer',
    layers,
    inputShape: [config.maxLength],
    outputShape: [config.maxLength, config.vocabSize],
    description: 'Generative Pre-trained Transformer',
  };
}

/**
 * T5 architecture
 */
export function createT5(config: TransformerConfig & { numDecoderLayers?: number }): NeuralNetworkArchitecture {
  const layers: Layer[] = [
    { type: 'input', name: 'encoder_input', config: { shape: [config.maxLength] } },
    { type: 'embedding', name: 'shared_embedding', config: { vocabSize: config.vocabSize, embeddingDim: config.dModel } },
  ];

  // Encoder
  for (let i = 0; i < config.numLayers; i++) {
    layers.push({
      type: 'transformer_encoder',
      name: `encoder_${i}`,
      config: { dModel: config.dModel, numHeads: config.numHeads, dff: config.dff, dropout: config.dropout || 0.1 },
    });
  }

  // Decoder
  const numDecoderLayers = config.numDecoderLayers || config.numLayers;
  for (let i = 0; i < numDecoderLayers; i++) {
    layers.push({
      type: 'transformer_decoder',
      name: `decoder_${i}`,
      config: { dModel: config.dModel, numHeads: config.numHeads, dff: config.dff, dropout: config.dropout || 0.1 },
    });
  }

  layers.push({ type: 'dense', name: 'output', config: { units: config.vocabSize } });

  return {
    name: 'T5',
    type: 'transformer',
    layers,
    inputShape: [config.maxLength],
    outputShape: [config.maxLength, config.vocabSize],
    description: 'Text-to-Text Transfer Transformer',
  };
}

// ============================================================================
// Efficient Transformer Variants
// ============================================================================

/**
 * Linformer - Linear complexity attention
 */
export function createLinformer(config: TransformerConfig & { projectionDim: number }): NeuralNetworkArchitecture {
  const layers: Layer[] = [
    { type: 'input', name: 'input', config: { shape: [config.maxLength] } },
    { type: 'embedding', name: 'embedding', config: { vocabSize: config.vocabSize, embeddingDim: config.dModel } },
  ];

  for (let i = 0; i < config.numLayers; i++) {
    layers.push({
      type: 'linformer_layer',
      name: `linformer_${i}`,
      config: {
        dModel: config.dModel,
        numHeads: config.numHeads,
        projectionDim: config.projectionDim,
        dff: config.dff,
      },
    });
  }

  layers.push({ type: 'dense', name: 'output', config: { units: config.vocabSize } });

  return {
    name: 'Linformer',
    type: 'transformer',
    layers,
    inputShape: [config.maxLength],
    outputShape: [config.maxLength, config.vocabSize],
    description: 'Self-Attention with Linear Complexity',
  };
}

/**
 * Reformer - Efficient transformer with locality-sensitive hashing
 */
export function createReformer(config: TransformerConfig & { numHashes: number; bucketSize: number }): NeuralNetworkArchitecture {
  const layers: Layer[] = [
    { type: 'input', name: 'input', config: { shape: [config.maxLength] } },
    { type: 'embedding', name: 'embedding', config: { vocabSize: config.vocabSize, embeddingDim: config.dModel } },
  ];

  for (let i = 0; i < config.numLayers; i++) {
    layers.push({
      type: 'reformer_layer',
      name: `reformer_${i}`,
      config: {
        dModel: config.dModel,
        numHeads: config.numHeads,
        numHashes: config.numHashes,
        bucketSize: config.bucketSize,
        dff: config.dff,
      },
    });
  }

  layers.push({ type: 'dense', name: 'output', config: { units: config.vocabSize } });

  return {
    name: 'Reformer',
    type: 'transformer',
    layers,
    inputShape: [config.maxLength],
    outputShape: [config.maxLength, config.vocabSize],
    description: 'Efficient Transformer with LSH attention',
  };
}

// ============================================================================
// Fine-tuning Utilities
// ============================================================================

export interface FineTuningConfig {
  baseModelId: string;
  taskType: 'classification' | 'sequence_labeling' | 'question_answering' | 'generation';
  numLabels?: number;
  learningRate: number;
  warmupSteps: number;
  frozenLayers?: number[];
}

export class TransformerFineTuning {
  static createFineTuneConfig(config: FineTuningConfig): FineTuningConfig {
    return {
      baseModelId: config.baseModelId,
      taskType: config.taskType,
      numLabels: config.numLabels || 2,
      learningRate: config.learningRate,
      warmupSteps: config.warmupSteps,
      frozenLayers: config.frozenLayers || [],
    };
  }

  static freezeEmbeddings(architecture: NeuralNetworkArchitecture): NeuralNetworkArchitecture {
    const frozenLayers = architecture.layers.map((layer) => {
      if (layer.type === 'embedding' || layer.type === 'positional_encoding') {
        return { ...layer, config: { ...layer.config, trainable: false } };
      }
      return layer;
    });

    return { ...architecture, layers: frozenLayers };
  }
}

// ============================================================================
// Attention Visualization
// ============================================================================

export interface AttentionVisualization {
  layer: number;
  head: number;
  attentionWeights: number[][];
  tokens: string[];
}

export class AttentionVisualizer {
  static generateHeatmap(viz: AttentionVisualization): { data: number[][]; labels: string[] } {
    return {
      data: viz.attentionWeights,
      labels: viz.tokens,
    };
  }

  static extractTopAttentions(viz: AttentionVisualization, topK = 5): Array<{ from: string; to: string; weight: number }> {
    const results: Array<{ from: string; to: string; weight: number }> = [];

    for (let i = 0; i < viz.attentionWeights.length; i++) {
      for (let j = 0; j < viz.attentionWeights[i].length; j++) {
        results.push({
          from: viz.tokens[i],
          to: viz.tokens[j],
          weight: viz.attentionWeights[i][j],
        });
      }
    }

    return results.sort((a, b) => b.weight - a.weight).slice(0, topK);
  }
}

// ============================================================================
// Token Embedding Optimization
// ============================================================================

export interface TokenEmbeddingConfig {
  vocabSize: number;
  embeddingDim: number;
  initializationStrategy: 'random' | 'pretrained' | 'word2vec' | 'glove';
  pretrainedPath?: string;
}

export class TokenEmbeddingOptimizer {
  static optimizeVocabulary(tokens: string[], minFrequency: number): { vocab: Map<string, number>; unkToken: string } {
    const tokenCounts = new Map<string, number>();

    tokens.forEach((token) => {
      tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
    });

    const vocab = new Map<string, number>();
    let index = 0;

    tokenCounts.forEach((count, token) => {
      if (count >= minFrequency) {
        vocab.set(token, index++);
      }
    });

    return { vocab, unkToken: '<UNK>' };
  }
}
