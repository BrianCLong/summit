# Deep Learning Examples

This directory contains comprehensive examples demonstrating Summit's deep learning platform capabilities.

## Directory Structure

```
examples/deep-learning/
├── basic/              # Basic examples for getting started
├── advanced/           # Advanced techniques and optimization
├── production/         # Production deployment patterns
└── README.md          # This file
```

## Basic Examples

### 1. Image Classification (`basic/image-classification.ts`)

Demonstrates transfer learning with pre-trained ResNet-50:
- Loading models from model zoo
- Fine-tuning for custom datasets
- Distributed training on multiple GPUs
- Monitoring training progress

**Run:**
```bash
tsx examples/deep-learning/basic/image-classification.ts
```

### 2. Object Detection (`basic/object-detection.ts`)

Real-time object detection with YOLOv5:
- Creating detection models
- Training configuration
- Model deployment
- Running inference

**Run:**
```bash
tsx examples/deep-learning/basic/object-detection.ts
```

### 3. Text Generation (`basic/text-generation.ts`)

GPT-based text generation:
- Creating transformer models
- Fine-tuning for domain-specific text
- Text generation with various strategies
- Prompt engineering

**Run:**
```bash
tsx examples/deep-learning/basic/text-generation.ts
```

## Advanced Examples

### 1. Optimization Pipeline (`advanced/optimization-pipeline.ts`)

Complete model optimization workflow:
- Quantization (INT8)
- Pruning (50% sparsity)
- Knowledge distillation
- ONNX export
- TensorRT optimization
- Performance comparison

**Run:**
```bash
tsx examples/deep-learning/advanced/optimization-pipeline.ts
```

**Expected Output:**
```
Model size reduced: 75%
Inference speedup: 3.5x
Accuracy retained: 99.5%
```

### 2. Neural Architecture Search (`advanced/nas-architecture-search.ts`)

Automated architecture discovery:
- Defining search spaces
- Running evolutionary NAS
- Architecture benchmarking
- Pareto front analysis

**Run:**
```bash
tsx examples/deep-learning/advanced/nas-architecture-search.ts
```

## Production Examples

### 1. Complete ML Pipeline (`production/complete-ml-pipeline.ts`)

End-to-end production pipeline:
- Data preprocessing
- Model training with monitoring
- Model evaluation
- Optimization
- Staging deployment
- Integration testing
- Canary deployment (10% traffic)
- Gradual rollout
- Production monitoring

**Run:**
```bash
tsx examples/deep-learning/production/complete-ml-pipeline.ts
```

**Pipeline Stages:**
1. Data Preparation
2. Model Training
3. Model Evaluation
4. Model Optimization
5. Staging Deployment
6. Integration Testing
7. Canary Deployment
8. Monitor Canary
9. Gradual Rollout
10. Production Monitoring

## Prerequisites

### Services Running

Ensure the following services are running:

```bash
# Terminal 1: Training Service
cd services/dl-training-service
pnpm dev

# Terminal 2: Serving Service
cd services/model-serving-service
pnpm dev

# Terminal 3: Registry Service
cd services/model-registry-service
pnpm dev
```

### Dependencies

```bash
# Install all dependencies
pnpm install

# Build packages
pnpm --filter "@intelgraph/*" build
```

## Usage Patterns

### Basic Training

```typescript
import type { TrainingConfig } from '@intelgraph/deep-learning-core';

const config: TrainingConfig = {
  modelId: 'my-model',
  batchSize: 32,
  epochs: 50,
  learningRate: 0.001,
  optimizer: 'adam',
  lossFunction: 'cross_entropy',
  metrics: ['accuracy'],
};

// Start training
const response = await fetch('http://localhost:3001/api/v1/training/start', {
  method: 'POST',
  body: JSON.stringify(config),
});
```

### Model Deployment

```typescript
import type { DeploymentConfig } from '@intelgraph/deep-learning-core';

const deployConfig: DeploymentConfig = {
  modelId: 'my-model',
  version: 'v1.0.0',
  environment: 'production',
  replicas: 3,
  resources: {
    gpu: 1,
    memoryRequest: '4Gi',
  },
  batching: {
    enabled: true,
    maxBatchSize: 32,
    maxWaitTimeMs: 50,
  },
};

await fetch('http://localhost:3002/api/v1/models/deploy', {
  method: 'POST',
  body: JSON.stringify(deployConfig),
});
```

### Running Inference

```typescript
import type { InferenceRequest } from '@intelgraph/deep-learning-core';

const request: InferenceRequest = {
  modelId: 'my-model',
  version: 'v1.0.0',
  inputs: {
    features: [0.1, 0.2, 0.3, /* ... */],
  },
  returnMetadata: true,
};

const response = await fetch('http://localhost:3002/api/v1/predict', {
  method: 'POST',
  body: JSON.stringify(request),
});

const result = await response.json();
console.log('Predictions:', result.predictions);
console.log('Inference time:', result.metadata.inferenceTime, 'ms');
```

## CLI Tool

Use the DL CLI for easier management:

```bash
# Train a model
dl train start -m my-classifier -e 50 -b 32 --gpus 4

# Check training status
dl train status <job-id>

# List models
dl registry list

# Deploy model
dl deploy create -m my-classifier -v v1.0.0 -r 3

# Run inference
dl predict -m my-classifier -i '{"features": [1,2,3]}'

# Check health
dl health
```

## Performance Tips

1. **Use Distributed Training**
   - Set `distributed.numWorkers` to number of available GPUs
   - Use `data_parallel` strategy for most cases

2. **Enable Mixed Precision**
   - Adds `mixedPrecision: { enabled: true, dtype: 'float16' }`
   - 2-3x speedup with minimal accuracy loss

3. **Optimize Models**
   - Quantize to INT8 for 4x size reduction
   - Prune 50% of weights for 2x speedup
   - Use TensorRT for 3-5x inference speedup

4. **Batch Inference**
   - Enable batching in deployment config
   - Increases throughput by 5-10x

## Troubleshooting

### Training Job Not Starting

```bash
# Check training service
curl http://localhost:3001/health

# Check logs
docker logs dl-training-service
```

### Inference Timeouts

- Reduce batch size
- Check GPU utilization
- Enable request batching
- Use model optimization

### Out of Memory

- Reduce batch size
- Enable gradient accumulation
- Use mixed precision training
- Reduce model size

## Next Steps

1. Review [Deep Learning Guide](../../../docs/deep-learning/GUIDE.md)
2. Explore [Architecture Reference](../../../docs/deep-learning/ARCHITECTURES.md)
3. Check [Deployment Guide](../../../docs/deep-learning/DEPLOYMENT.md)
4. Try customizing examples for your use case

## Support

- Documentation: `docs/deep-learning/`
- Issues: GitHub Issues
- Examples: This directory
