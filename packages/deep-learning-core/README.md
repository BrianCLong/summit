# @intelgraph/deep-learning-core

Core deep learning infrastructure and utilities for Summit intelligence platform.

## Features

- Model metadata and lifecycle management
- Training configuration schemas
- Inference request/response types
- Deployment configuration
- Model zoo and architecture registry
- Utility functions for model operations

## Installation

```bash
pnpm add @intelgraph/deep-learning-core
```

## Usage

```typescript
import {
  ModelMetadataSchema,
  TrainingConfig,
  InferenceRequest,
  generateModelId,
  formatBytes,
} from '@intelgraph/deep-learning-core';

// Generate model ID
const modelId = generateModelId('classifier');

// Create training configuration
const config: TrainingConfig = {
  modelId,
  batchSize: 32,
  epochs: 50,
  learningRate: 0.001,
  optimizer: 'adam',
  lossFunction: 'categorical_crossentropy',
  metrics: ['accuracy'],
};

// Estimate model size
const size = estimateModelSize(25600000, 'float32');
console.log(formatBytes(size)); // "97.66 MB"
```

## API

See [documentation](../../../docs/deep-learning/GUIDE.md) for complete API reference.
