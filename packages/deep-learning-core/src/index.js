"use strict";
/**
 * @intelgraph/deep-learning-core
 * Core deep learning infrastructure and utilities for Summit intelligence platform
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORTED_ACTIVATIONS = exports.SUPPORTED_OPTIMIZERS = exports.SUPPORTED_FRAMEWORKS = exports.MODEL_ZOO = exports.DeploymentConfigSchema = exports.InferenceResponseSchema = exports.InferenceRequestSchema = exports.TrainingStatusSchema = exports.TrainingConfigSchema = exports.ModelMetadataSchema = void 0;
exports.generateModelId = generateModelId;
exports.estimateModelSize = estimateModelSize;
exports.formatBytes = formatBytes;
exports.validateInputShape = validateInputShape;
const zod_1 = require("zod");
// ============================================================================
// Core Types and Schemas
// ============================================================================
/**
 * Model metadata schema
 */
exports.ModelMetadataSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    version: zod_1.z.string(),
    architecture: zod_1.z.string(),
    framework: zod_1.z.enum(['tensorflow', 'pytorch', 'onnx', 'custom']),
    description: zod_1.z.string().optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    author: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    metrics: zod_1.z.record(zod_1.z.string(), zod_1.z.number()).optional(),
    parameters: zod_1.z.number().optional(),
    inputShape: zod_1.z.array(zod_1.z.number()).optional(),
    outputShape: zod_1.z.array(zod_1.z.number()).optional(),
});
/**
 * Training configuration schema
 */
exports.TrainingConfigSchema = zod_1.z.object({
    modelId: zod_1.z.string(),
    batchSize: zod_1.z.number().positive(),
    epochs: zod_1.z.number().positive(),
    learningRate: zod_1.z.number().positive(),
    optimizer: zod_1.z.enum(['adam', 'sgd', 'rmsprop', 'adamw', 'adagrad']),
    lossFunction: zod_1.z.string(),
    metrics: zod_1.z.array(zod_1.z.string()),
    validationSplit: zod_1.z.number().min(0).max(1).optional(),
    earlyStopping: zod_1.z
        .object({
        monitor: zod_1.z.string(),
        patience: zod_1.z.number().positive(),
        minDelta: zod_1.z.number().optional(),
    })
        .optional(),
    checkpointing: zod_1.z
        .object({
        frequency: zod_1.z.number().positive(),
        saveWeightsOnly: zod_1.z.boolean().optional(),
    })
        .optional(),
    distributed: zod_1.z
        .object({
        strategy: zod_1.z.enum(['data_parallel', 'model_parallel', 'pipeline']),
        numWorkers: zod_1.z.number().positive(),
    })
        .optional(),
});
/**
 * Training status schema
 */
exports.TrainingStatusSchema = zod_1.z.object({
    jobId: zod_1.z.string(),
    modelId: zod_1.z.string(),
    status: zod_1.z.enum(['pending', 'running', 'completed', 'failed', 'stopped']),
    currentEpoch: zod_1.z.number(),
    totalEpochs: zod_1.z.number(),
    currentBatch: zod_1.z.number().optional(),
    totalBatches: zod_1.z.number().optional(),
    metrics: zod_1.z.record(zod_1.z.string(), zod_1.z.number()).optional(),
    startedAt: zod_1.z.string().datetime().optional(),
    completedAt: zod_1.z.string().datetime().optional(),
    error: zod_1.z.string().optional(),
});
/**
 * Inference request schema
 */
exports.InferenceRequestSchema = zod_1.z.object({
    modelId: zod_1.z.string(),
    version: zod_1.z.string().optional(),
    inputs: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
    batchSize: zod_1.z.number().positive().optional(),
    returnMetadata: zod_1.z.boolean().optional(),
});
/**
 * Inference response schema
 */
exports.InferenceResponseSchema = zod_1.z.object({
    predictions: zod_1.z.array(zod_1.z.any()),
    confidences: zod_1.z.array(zod_1.z.number()).optional(),
    metadata: zod_1.z
        .object({
        modelId: zod_1.z.string(),
        version: zod_1.z.string(),
        inferenceTime: zod_1.z.number(),
        batchSize: zod_1.z.number(),
    })
        .optional(),
});
/**
 * Model deployment configuration
 */
exports.DeploymentConfigSchema = zod_1.z.object({
    modelId: zod_1.z.string(),
    version: zod_1.z.string(),
    environment: zod_1.z.enum(['dev', 'staging', 'production']),
    replicas: zod_1.z.number().positive().optional(),
    resources: zod_1.z
        .object({
        cpuRequest: zod_1.z.string().optional(),
        cpuLimit: zod_1.z.string().optional(),
        memoryRequest: zod_1.z.string().optional(),
        memoryLimit: zod_1.z.string().optional(),
        gpu: zod_1.z.number().optional(),
    })
        .optional(),
    autoScaling: zod_1.z
        .object({
        enabled: zod_1.z.boolean(),
        minReplicas: zod_1.z.number().positive(),
        maxReplicas: zod_1.z.number().positive(),
        targetCpuUtilization: zod_1.z.number().min(0).max(100),
    })
        .optional(),
    batching: zod_1.z
        .object({
        enabled: zod_1.z.boolean(),
        maxBatchSize: zod_1.z.number().positive(),
        maxWaitTimeMs: zod_1.z.number().positive(),
    })
        .optional(),
});
exports.MODEL_ZOO = {
    'resnet50-imagenet': {
        id: 'resnet50-imagenet',
        name: 'ResNet-50',
        architecture: 'ResNet',
        pretrainedWeights: 'imagenet',
        taskType: 'classification',
        domain: 'vision',
        description: 'Deep residual network with 50 layers trained on ImageNet',
        paperUrl: 'https://arxiv.org/abs/1512.03385',
    },
    'bert-base-uncased': {
        id: 'bert-base-uncased',
        name: 'BERT Base Uncased',
        architecture: 'BERT',
        pretrainedWeights: 'google',
        taskType: 'classification',
        domain: 'nlp',
        description: 'Bidirectional Encoder Representations from Transformers',
        paperUrl: 'https://arxiv.org/abs/1810.04805',
    },
    'gpt2-medium': {
        id: 'gpt2-medium',
        name: 'GPT-2 Medium',
        architecture: 'GPT',
        pretrainedWeights: 'openai',
        taskType: 'generation',
        domain: 'nlp',
        description: 'Generative Pre-trained Transformer 2',
        paperUrl: 'https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf',
    },
    't5-base': {
        id: 't5-base',
        name: 'T5 Base',
        architecture: 'T5',
        pretrainedWeights: 'google',
        taskType: 'generation',
        domain: 'nlp',
        description: 'Text-to-Text Transfer Transformer',
        paperUrl: 'https://arxiv.org/abs/1910.10683',
    },
};
// ============================================================================
// Utilities
// ============================================================================
/**
 * Generate a unique model ID
 */
function generateModelId(prefix = 'model') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `${prefix}-${timestamp}-${random}`;
}
/**
 * Calculate model size from parameters
 */
function estimateModelSize(parameters, dtype = 'float32') {
    const bytesPerParam = dtype === 'float32' ? 4 : dtype === 'float16' ? 2 : 1;
    return parameters * bytesPerParam;
}
/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;
    let size = bytes;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
}
/**
 * Validate model inputs against expected shape
 */
function validateInputShape(input, expectedShape) {
    if (input.length !== expectedShape.length) {
        return {
            valid: false,
            error: `Input dimension mismatch: expected ${expectedShape.length}, got ${input.length}`,
        };
    }
    for (let i = 0; i < input.length; i++) {
        if (expectedShape[i] !== -1 && input[i] !== expectedShape[i]) {
            return {
                valid: false,
                error: `Shape mismatch at dimension ${i}: expected ${expectedShape[i]}, got ${input[i]}`,
            };
        }
    }
    return { valid: true };
}
// ============================================================================
// Constants
// ============================================================================
exports.SUPPORTED_FRAMEWORKS = ['tensorflow', 'pytorch', 'onnx', 'custom'];
exports.SUPPORTED_OPTIMIZERS = ['adam', 'sgd', 'rmsprop', 'adamw', 'adagrad'];
exports.SUPPORTED_ACTIVATIONS = [
    'relu',
    'sigmoid',
    'tanh',
    'softmax',
    'leaky_relu',
    'elu',
    'selu',
    'gelu',
];
