"use strict";
/**
 * @intelgraph/transformers
 * Transformer and attention mechanism platform
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenEmbeddingOptimizer = exports.AttentionVisualizer = exports.TransformerFineTuning = void 0;
exports.createMultiHeadAttention = createMultiHeadAttention;
exports.createBERT = createBERT;
exports.createGPT = createGPT;
exports.createT5 = createT5;
exports.createLinformer = createLinformer;
exports.createReformer = createReformer;
/**
 * Create multi-head attention layer
 */
function createMultiHeadAttention(config) {
    return {
        type: 'multi_head_attention',
        name: 'mha',
        config,
    };
}
/**
 * BERT architecture
 */
function createBERT(config) {
    const layers = [
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
function createGPT(config) {
    const layers = [
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
function createT5(config) {
    const layers = [
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
function createLinformer(config) {
    const layers = [
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
function createReformer(config) {
    const layers = [
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
class TransformerFineTuning {
    static createFineTuneConfig(config) {
        return {
            baseModelId: config.baseModelId,
            taskType: config.taskType,
            numLabels: config.numLabels || 2,
            learningRate: config.learningRate,
            warmupSteps: config.warmupSteps,
            frozenLayers: config.frozenLayers || [],
        };
    }
    static freezeEmbeddings(architecture) {
        const frozenLayers = architecture.layers.map((layer) => {
            if (layer.type === 'embedding' || layer.type === 'positional_encoding') {
                return { ...layer, config: { ...layer.config, trainable: false } };
            }
            return layer;
        });
        return { ...architecture, layers: frozenLayers };
    }
}
exports.TransformerFineTuning = TransformerFineTuning;
class AttentionVisualizer {
    static generateHeatmap(viz) {
        return {
            data: viz.attentionWeights,
            labels: viz.tokens,
        };
    }
    static extractTopAttentions(viz, topK = 5) {
        const results = [];
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
exports.AttentionVisualizer = AttentionVisualizer;
class TokenEmbeddingOptimizer {
    static optimizeVocabulary(tokens, minFrequency) {
        const tokenCounts = new Map();
        tokens.forEach((token) => {
            tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
        });
        const vocab = new Map();
        let index = 0;
        tokenCounts.forEach((count, token) => {
            if (count >= minFrequency) {
                vocab.set(token, index++);
            }
        });
        return { vocab, unkToken: '<UNK>' };
    }
}
exports.TokenEmbeddingOptimizer = TokenEmbeddingOptimizer;
