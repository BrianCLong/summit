# Deep Learning Model Deployment Guide

This guide covers deploying deep learning models to production using Summit's model serving infrastructure.

## Table of Contents

- [Deployment Overview](#deployment-overview)
- [Training Pipeline](#training-pipeline)
- [Model Optimization](#model-optimization)
- [Production Serving](#production-serving)
- [Monitoring and Operations](#monitoring-and-operations)
- [Scaling and Performance](#scaling-and-performance)

## Deployment Overview

### Deployment Workflow

```
Training → Validation → Optimization → Staging → Production
    ↓          ↓            ↓            ↓          ↓
  Metrics   Testing    Compression   A/B Test  Monitoring
```

### Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Training  │─────▶│     Model    │─────▶│   Serving   │
│   Service   │      │  Optimization│      │   Service   │
└─────────────┘      └──────────────┘      └─────────────┘
       │                     │                     │
       ▼                     ▼                     ▼
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│  Checkpoint │      │  Optimized   │      │ Production  │
│   Storage   │      │    Model     │      │   Metrics   │
└─────────────┘      └──────────────┘      └─────────────┘
```

## Training Pipeline

### 1. Distributed Training

```typescript
import type { TrainingConfig } from '@intelgraph/deep-learning-core';
import { DistributedTrainingOrchestrator } from '@intelgraph/distributed-training';

// Configure distributed training
const trainingConfig: TrainingConfig = {
  modelId: 'intelligence-classifier-v1',
  batchSize: 256, // Per GPU
  epochs: 100,
  learningRate: 0.001,
  optimizer: 'adamw',
  lossFunction: 'cross_entropy',
  metrics: ['accuracy', 'f1_score', 'precision', 'recall'],

  // Distributed configuration
  distributed: {
    strategy: 'data_parallel',
    numWorkers: 8,
  },

  // Mixed precision for faster training
  mixedPrecision: {
    enabled: true,
    dtype: 'float16',
    lossScale: 'dynamic',
  },

  // Gradient accumulation for larger effective batch size
  gradientAccumulation: {
    steps: 4, // Effective batch size: 256 * 8 * 4 = 8192
  },

  // Early stopping
  earlyStopping: {
    monitor: 'val_loss',
    patience: 10,
    minDelta: 0.001,
  },

  // Checkpointing
  checkpointing: {
    frequency: 5, // Every 5 epochs
    saveWeightsOnly: false,
  },
};

// Initialize orchestrator
const orchestrator = new DistributedTrainingOrchestrator({
  strategy: 'data_parallel',
  numWorkers: 8,
  backend: 'nccl',
  mixedPrecision: {
    enabled: true,
    dtype: 'float16',
    lossScale: 'dynamic',
  },
  gradientAccumulation: {
    steps: 4,
  },
});

// Start training
await orchestrator.initializeWorkers();
await orchestrator.distributeModel(trainingConfig.modelId);

// Submit training job
const response = await fetch('http://localhost:3001/api/v1/training/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(trainingConfig),
});

const { jobId } = await response.json();
console.log(`Training job started: ${jobId}`);

// Monitor training progress
const checkStatus = setInterval(async () => {
  const statusResponse = await fetch(`http://localhost:3001/api/v1/training/${jobId}`);
  const status = await statusResponse.json();

  console.log(`Epoch ${status.currentEpoch}/${status.totalEpochs}`);
  console.log(`Loss: ${status.metrics.loss}, Accuracy: ${status.metrics.accuracy}`);

  if (status.status === 'completed' || status.status === 'failed') {
    clearInterval(checkStatus);
  }
}, 5000);
```

### 2. Learning Rate Scheduling

```typescript
import { LearningRateScheduler } from '@intelgraph/distributed-training';

const scheduler = new LearningRateScheduler({
  type: 'cosine',
  baseLR: 0.001,
  warmupSteps: 1000,
  decaySteps: 10000,
  minLR: 0.00001,
});

// Get learning rate for each step
for (let step = 0; step < 10000; step++) {
  const lr = scheduler.getLearningRate();
  // Use lr for optimizer
  scheduler.step();
}
```

### 3. Checkpointing

```typescript
import { CheckpointManager } from '@intelgraph/distributed-training';

const checkpointManager = new CheckpointManager({
  directory: '/models/checkpoints',
  frequency: 5,
  maxToKeep: 5,
  saveWeightsOnly: false,
});

// Save checkpoint after each epoch
for (let epoch = 0; epoch < 100; epoch++) {
  // Training loop...

  if ((epoch + 1) % 5 === 0) {
    await checkpointManager.saveCheckpoint(epoch, modelState);
  }
}

// Load latest checkpoint
const latestCheckpoint = checkpointManager.getLatestCheckpoint();
```

## Model Optimization

### 1. Quantization

Convert model to lower precision for faster inference:

```typescript
import { ModelQuantizer } from '@intelgraph/model-optimization';

// INT8 quantization
const quantizer = new ModelQuantizer({
  bitWidth: 'int8',
  method: 'static',
  calibrationSamples: 1000,
});

const result = await quantizer.quantize(
  '/models/intelligence-classifier-v1.ckpt',
  '/models/intelligence-classifier-v1-int8.ckpt'
);

console.log(`Original size: ${result.originalSize / (1024 * 1024)} MB`);
console.log(`Quantized size: ${result.quantizedSize / (1024 * 1024)} MB`);
console.log(`Compression ratio: ${result.compressionRatio}x`);
```

### 2. Pruning

Remove unnecessary weights:

```typescript
import { ModelPruner } from '@intelgraph/model-optimization';

const pruner = new ModelPruner({
  method: 'magnitude',
  pruningRate: 0.5, // Remove 50% of weights
  fineTuneEpochs: 10,
});

const result = await pruner.prune('/models/intelligence-classifier-v1.ckpt');

console.log(`Original parameters: ${result.originalParams}`);
console.log(`Pruned parameters: ${result.prunedParams}`);
console.log(`Sparsity: ${result.sparsity * 100}%`);
```

### 3. Knowledge Distillation

Train smaller student model from teacher:

```typescript
import { KnowledgeDistiller } from '@intelgraph/model-optimization';

const distiller = new KnowledgeDistiller({
  teacherModelId: 'bert-large',
  studentModelId: 'bert-small',
  temperature: 4.0,
  alpha: 0.7, // Weight for distillation loss
  beta: 0.3,  // Weight for student loss
});

const result = await distiller.distill(trainingData);

console.log(`Student model saved to: ${result.studentModelPath}`);
console.log(`Student accuracy: ${result.metrics.accuracy}`);
console.log(`Teacher accuracy: ${result.metrics.teacherAccuracy}`);
```

### 4. ONNX Export

Export for cross-platform deployment:

```typescript
import { ONNXExporter } from '@intelgraph/model-optimization';

const exporter = new ONNXExporter();

// Export to ONNX
const onnxPath = await exporter.export(
  '/models/intelligence-classifier-v1.ckpt',
  '/models/intelligence-classifier-v1.onnx',
  {
    opsetVersion: 14,
    dynamicAxes: {
      input: [0], // Batch dimension
      output: [0],
    },
  }
);

// Optimize ONNX model
await exporter.optimize(onnxPath);
```

### 5. TensorRT Optimization

Optimize for NVIDIA GPUs:

```typescript
import { TensorRTOptimizer } from '@intelgraph/model-optimization';

const trtOptimizer = new TensorRTOptimizer();

const result = await trtOptimizer.optimize(
  '/models/intelligence-classifier-v1.onnx',
  {
    precision: 'fp16',
    maxBatchSize: 32,
    workspace: 1 << 30, // 1GB
  }
);

console.log(`TensorRT engine: ${result.enginePath}`);
console.log(`Speedup: ${result.speedup}x`);
```

## Production Serving

### 1. Model Deployment

```typescript
import type { DeploymentConfig } from '@intelgraph/deep-learning-core';

const deployConfig: DeploymentConfig = {
  modelId: 'intelligence-classifier-v1',
  version: 'v1.0.0',
  environment: 'production',

  // Resource allocation
  replicas: 3,
  resources: {
    cpuRequest: '4',
    cpuLimit: '8',
    memoryRequest: '8Gi',
    memoryLimit: '16Gi',
    gpu: 1,
  },

  // Auto-scaling
  autoScaling: {
    enabled: true,
    minReplicas: 2,
    maxReplicas: 10,
    targetCpuUtilization: 70,
  },

  // Request batching
  batching: {
    enabled: true,
    maxBatchSize: 32,
    maxWaitTimeMs: 50,
  },
};

// Deploy model
const response = await fetch('http://localhost:3002/api/v1/models/deploy', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(deployConfig),
});

const result = await response.json();
console.log(`Model deployed: ${result.modelId} v${result.version}`);
```

### 2. Inference API

```typescript
import type { InferenceRequest } from '@intelgraph/deep-learning-core';

// Synchronous inference
async function predict(input: any) {
  const request: InferenceRequest = {
    modelId: 'intelligence-classifier-v1',
    version: 'v1.0.0',
    inputs: {
      features: input,
    },
    batchSize: 1,
    returnMetadata: true,
  };

  const response = await fetch('http://localhost:3002/api/v1/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  return await response.json();
}

// Use prediction
const result = await predict([0.1, 0.2, 0.3, /* ... */]);
console.log('Predictions:', result.predictions);
console.log('Confidences:', result.confidences);
console.log('Inference time:', result.metadata.inferenceTime, 'ms');
```

### 3. Batch Inference

For high-throughput scenarios:

```typescript
async function batchPredict(inputs: any[]) {
  const requests = inputs.map((input) => ({
    modelId: 'intelligence-classifier-v1',
    inputs: { features: input },
  }));

  const promises = requests.map((request) =>
    fetch('http://localhost:3002/api/v1/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }).then((res) => res.json())
  );

  return await Promise.all(promises);
}

// Process 1000 samples
const inputs = generateInputs(1000);
const results = await batchPredict(inputs);
```

### 4. A/B Testing

Deploy multiple model versions:

```typescript
// Deploy version A
await deployModel({ ...config, version: 'v1.0.0' });

// Deploy version B
await deployModel({ ...config, version: 'v1.1.0' });

// Route 90% to v1.0.0, 10% to v1.1.0
async function predictWithABTest(input: any) {
  const version = Math.random() < 0.9 ? 'v1.0.0' : 'v1.1.0';

  return await predict({
    ...input,
    version,
  });
}
```

## Monitoring and Operations

### 1. Performance Metrics

```typescript
// Get model metrics
const response = await fetch(
  'http://localhost:3002/api/v1/models/intelligence-classifier-v1/metrics'
);

const metrics = await response.json();

console.log('Metrics:', {
  requestsPerSecond: metrics.requestsPerSecond,
  averageLatency: metrics.averageLatency,
  p95Latency: metrics.p95Latency,
  p99Latency: metrics.p99Latency,
  errorRate: metrics.errorRate,
});
```

### 2. Health Checks

```typescript
// Check service health
const healthResponse = await fetch('http://localhost:3002/health');
const health = await healthResponse.json();

console.log('Service Status:', health.status);
console.log('Deployed Models:', health.deployedModels);
```

### 3. Logging

```typescript
// Configure logging
const logger = {
  logPrediction: (input: any, output: any, latency: number) => {
    console.log({
      timestamp: new Date().toISOString(),
      input,
      output,
      latency,
      modelId: 'intelligence-classifier-v1',
      version: 'v1.0.0',
    });
  },
};
```

## Scaling and Performance

### Performance Optimization Checklist

- [ ] Enable request batching
- [ ] Use appropriate hardware (GPU for large models)
- [ ] Implement model caching
- [ ] Apply quantization/pruning
- [ ] Use TensorRT for NVIDIA GPUs
- [ ] Enable auto-scaling
- [ ] Monitor and optimize inference time
- [ ] Implement circuit breakers
- [ ] Use CDN for model artifacts
- [ ] Cache frequent predictions

### Expected Performance

| Model Size | Hardware | Batch Size | Throughput | Latency (p95) |
|-----------|----------|------------|------------|---------------|
| Small (< 100MB) | CPU | 1 | 100 req/s | 15ms |
| Small (< 100MB) | GPU | 32 | 500 req/s | 80ms |
| Medium (100MB-1GB) | CPU | 1 | 20 req/s | 60ms |
| Medium (100MB-1GB) | GPU | 32 | 200 req/s | 180ms |
| Large (> 1GB) | GPU | 32 | 50 req/s | 700ms |

### Cost Optimization

1. **Use smaller models where possible**
   - Distillation
   - Pruning
   - Quantization

2. **Right-size infrastructure**
   - Monitor GPU utilization
   - Use auto-scaling
   - Spot instances for training

3. **Optimize inference**
   - Batch requests
   - Cache predictions
   - Use efficient frameworks

4. **Multi-tenancy**
   - Share GPU across models
   - Dynamic batching
   - Model multiplexing

## Troubleshooting

### High Latency

1. Check batch size configuration
2. Verify GPU utilization
3. Profile model layers
4. Consider model optimization
5. Check network latency

### Low Throughput

1. Enable batching
2. Increase replicas
3. Use more GPUs
4. Optimize model
5. Check resource allocation

### Memory Issues

1. Reduce batch size
2. Use gradient checkpointing
3. Enable mixed precision
4. Prune model
5. Increase memory allocation

### Model Accuracy Degradation

1. Monitor data drift
2. Check quantization settings
3. Verify preprocessing
4. Compare with baseline
5. Retrain if necessary

## Best Practices

1. **Always validate in staging before production**
2. **Implement gradual rollouts (canary/blue-green)**
3. **Monitor model performance continuously**
4. **Set up alerts for anomalies**
5. **Version all models and configurations**
6. **Document deployment procedures**
7. **Test disaster recovery procedures**
8. **Implement circuit breakers**
9. **Use feature flags for experiments**
10. **Maintain model registry**

## Next Steps

- See [GUIDE.md](./GUIDE.md) for usage examples
- See [ARCHITECTURES.md](./ARCHITECTURES.md) for architecture details
- Check Summit documentation for platform integration
