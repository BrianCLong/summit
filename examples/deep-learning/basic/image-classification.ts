/**
 * Example: Image Classification with Transfer Learning
 *
 * This example demonstrates:
 * - Loading a pre-trained ResNet-50 model
 * - Fine-tuning for a custom dataset
 * - Training with distributed GPUs
 * - Model evaluation and deployment
 */

import { modelZoo } from '@intelgraph/neural-networks';
import { TransferLearning } from '@intelgraph/neural-networks';
import type { TrainingConfig } from '@intelgraph/deep-learning-core';

async function main() {
  console.log('=== Image Classification with Transfer Learning ===\n');

  // 1. Load pre-trained model from model zoo
  console.log('Step 1: Loading pre-trained ResNet-50...');
  const baseModel = modelZoo.getModel('resnet50-imagenet');

  if (!baseModel) {
    throw new Error('ResNet-50 not found in model zoo');
  }

  console.log(`✓ Loaded ${baseModel.name}`);
  console.log(`  - Parameters: ${baseModel.metrics.top1_accuracy}`);
  console.log(`  - Top-1 Accuracy: ${(baseModel.metrics.top1_accuracy * 100).toFixed(1)}%`);
  console.log(`  - Top-5 Accuracy: ${(baseModel.metrics.top5_accuracy * 100).toFixed(1)}%\n`);

  // 2. Adapt for custom classification task (10 classes)
  console.log('Step 2: Adapting model for custom task (10 classes)...');
  const numClasses = 10;
  let customModel = TransferLearning.replaceHead(baseModel.architecture, numClasses);

  // Freeze early layers
  customModel = TransferLearning.freezeLayers(customModel, 40);
  console.log(`✓ Model adapted with ${numClasses} output classes`);
  console.log(`✓ Frozen first 40 layers for transfer learning\n`);

  // 3. Configure training
  console.log('Step 3: Configuring training...');
  const trainingConfig: TrainingConfig = {
    modelId: 'custom-classifier',
    batchSize: 64,
    epochs: 20,
    learningRate: 0.0001, // Lower LR for fine-tuning
    optimizer: 'adamw',
    lossFunction: 'categorical_crossentropy',
    metrics: ['accuracy', 'f1_score'],

    // Distributed training on 4 GPUs
    distributed: {
      strategy: 'data_parallel',
      numWorkers: 4,
    },

    // Early stopping
    earlyStopping: {
      monitor: 'val_loss',
      patience: 5,
      minDelta: 0.001,
    },

    // Checkpointing
    checkpointing: {
      frequency: 2,
      saveWeightsOnly: false,
    },
  };

  console.log('Training Configuration:');
  console.log(`  - Batch size: ${trainingConfig.batchSize}`);
  console.log(`  - Epochs: ${trainingConfig.epochs}`);
  console.log(`  - Learning rate: ${trainingConfig.learningRate}`);
  console.log(`  - Optimizer: ${trainingConfig.optimizer}`);
  console.log(`  - GPUs: ${trainingConfig.distributed?.numWorkers}\n`);

  // 4. Start training
  console.log('Step 4: Starting training job...');
  const response = await fetch('http://localhost:3001/api/v1/training/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(trainingConfig),
  });

  const { jobId } = await response.json();
  console.log(`✓ Training job started: ${jobId}\n`);

  // 5. Monitor training progress
  console.log('Step 5: Monitoring training progress...\n');
  await monitorTraining(jobId);

  // 6. Evaluate model
  console.log('\nStep 6: Evaluating trained model...');
  const metrics = await evaluateModel(jobId);
  console.log('Final Metrics:');
  console.log(`  - Accuracy: ${(metrics.accuracy * 100).toFixed(2)}%`);
  console.log(`  - Loss: ${metrics.loss.toFixed(4)}\n`);

  console.log('✓ Training complete!');
}

async function monitorTraining(jobId: string) {
  return new Promise<void>((resolve) => {
    const interval = setInterval(async () => {
      const response = await fetch(`http://localhost:3001/api/v1/training/${jobId}`);
      const status = await response.json();

      process.stdout.write(`\r  Epoch ${status.currentEpoch}/${status.totalEpochs} | ` +
        `Loss: ${status.metrics?.loss?.toFixed(4) || 'N/A'} | ` +
        `Acc: ${((status.metrics?.accuracy || 0) * 100).toFixed(2)}%`);

      if (status.status === 'completed' || status.status === 'failed') {
        console.log(); // New line
        clearInterval(interval);
        resolve();
      }
    }, 1000);
  });
}

async function evaluateModel(jobId: string): Promise<any> {
  const response = await fetch(`http://localhost:3001/api/v1/training/${jobId}/metrics`);
  return await response.json();
}

// Run example
main().catch(console.error);
