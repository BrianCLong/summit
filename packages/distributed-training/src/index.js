"use strict";
/**
 * @intelgraph/distributed-training
 * Distributed training and optimization infrastructure
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckpointManager = exports.LearningRateScheduler = exports.GradientAccumulator = exports.DistributedTrainingOrchestrator = exports.DistributedConfigSchema = void 0;
const zod_1 = require("zod");
// Distributed training configuration
exports.DistributedConfigSchema = zod_1.z.object({
    strategy: zod_1.z.enum(['data_parallel', 'model_parallel', 'pipeline_parallel', 'hybrid']),
    numWorkers: zod_1.z.number().positive(),
    backend: zod_1.z.enum(['nccl', 'gloo', 'mpi']),
    mixedPrecision: zod_1.z.object({
        enabled: zod_1.z.boolean(),
        dtype: zod_1.z.enum(['float16', 'bfloat16']),
        lossScale: zod_1.z.enum(['dynamic', 'static']),
    }).optional(),
    gradientAccumulation: zod_1.z.object({
        steps: zod_1.z.number().positive(),
    }).optional(),
});
// Training orchestrator
class DistributedTrainingOrchestrator {
    config;
    constructor(config) {
        this.config = config;
    }
    async initializeWorkers() {
        console.log(`Initializing ${this.config.numWorkers} workers with ${this.config.strategy} strategy`);
    }
    async distributeModel(modelId) {
        console.log(`Distributing model ${modelId} across workers`);
    }
    async synchronizeGradients() {
        console.log('Synchronizing gradients across workers');
    }
}
exports.DistributedTrainingOrchestrator = DistributedTrainingOrchestrator;
// Gradient accumulation
class GradientAccumulator {
    steps;
    currentStep = 0;
    constructor(steps) {
        this.steps = steps;
    }
    shouldUpdate() {
        this.currentStep = (this.currentStep + 1) % this.steps;
        return this.currentStep === 0;
    }
    reset() {
        this.currentStep = 0;
    }
}
exports.GradientAccumulator = GradientAccumulator;
class LearningRateScheduler {
    config;
    currentStep = 0;
    constructor(config) {
        this.config = config;
    }
    getLearningRate() {
        const { type, baseLR, warmupSteps = 0, decaySteps = 1000, minLR = 0 } = this.config;
        // Warmup
        if (this.currentStep < warmupSteps) {
            return (baseLR * this.currentStep) / warmupSteps;
        }
        const step = this.currentStep - warmupSteps;
        switch (type) {
            case 'constant':
                return baseLR;
            case 'step':
                return baseLR * Math.pow(0.1, Math.floor(step / decaySteps));
            case 'exponential':
                return baseLR * Math.exp(-step / decaySteps);
            case 'cosine':
                return minLR + (baseLR - minLR) * 0.5 * (1 + Math.cos((Math.PI * step) / decaySteps));
            case 'polynomial':
                return Math.max(minLR, baseLR * Math.pow(1 - step / decaySteps, 2));
            default:
                return baseLR;
        }
    }
    step() {
        this.currentStep++;
    }
}
exports.LearningRateScheduler = LearningRateScheduler;
class CheckpointManager {
    config;
    checkpoints = [];
    constructor(config) {
        this.config = config;
    }
    async saveCheckpoint(epoch, modelState) {
        const checkpointPath = `${this.config.directory}/checkpoint_epoch_${epoch}.ckpt`;
        this.checkpoints.push(checkpointPath);
        // Keep only the last maxToKeep checkpoints
        if (this.checkpoints.length > this.config.maxToKeep) {
            const toRemove = this.checkpoints.shift();
            console.log(`Removing old checkpoint: ${toRemove}`);
        }
        console.log(`Saved checkpoint: ${checkpointPath}`);
        return checkpointPath;
    }
    getLatestCheckpoint() {
        return this.checkpoints[this.checkpoints.length - 1];
    }
}
exports.CheckpointManager = CheckpointManager;
