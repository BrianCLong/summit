/**
 * Example: Production - Complete ML Pipeline
 *
 * This example demonstrates a complete production pipeline:
 * - Data preprocessing
 * - Model training with monitoring
 * - Model optimization
 * - A/B testing deployment
 * - Performance monitoring
 */

import type {
  TrainingConfig,
  DeploymentConfig,
  InferenceRequest,
} from '@intelgraph/deep-learning-core';
import { ModelQuantizer } from '@intelgraph/model-optimization';

async function main() {
  console.log('=== Complete Production ML Pipeline ===\n');

  // Phase 1: Data Preparation
  console.log('Phase 1: Data Preparation');
  console.log('─'.repeat(50));
  await prepareData();

  // Phase 2: Model Training
  console.log('\nPhase 2: Model Training');
  console.log('─'.repeat(50));
  const modelId = await trainModel();

  // Phase 3: Model Evaluation
  console.log('\nPhase 3: Model Evaluation');
  console.log('─'.repeat(50));
  const evaluation = await evaluateModel(modelId);

  if (evaluation.accuracy < 0.9) {
    console.log('⚠ Model accuracy below threshold. Retraining recommended.');
    return;
  }

  // Phase 4: Model Optimization
  console.log('\nPhase 4: Model Optimization');
  console.log('─'.repeat(50));
  const optimizedModelId = await optimizeModel(modelId);

  // Phase 5: Staging Deployment
  console.log('\nPhase 5: Staging Deployment');
  console.log('─'.repeat(50));
  await deployStagingModel(optimizedModelId);

  // Phase 6: Integration Testing
  console.log('\nPhase 6: Integration Testing');
  console.log('─'.repeat(50));
  const testResults = await runIntegrationTests(optimizedModelId);

  if (!testResults.passed) {
    console.log('⚠ Integration tests failed. Deployment aborted.');
    return;
  }

  // Phase 7: Canary Deployment (10% traffic)
  console.log('\nPhase 7: Canary Deployment (10% traffic)');
  console.log('─'.repeat(50));
  await deployCanary(optimizedModelId, 0.1);

  // Phase 8: Monitor Canary
  console.log('\nPhase 8: Monitoring Canary...');
  console.log('─'.repeat(50));
  const canaryMetrics = await monitorCanary(optimizedModelId, 300); // 5 minutes

  if (canaryMetrics.errorRate > 0.01) {
    console.log('⚠ Canary showing elevated error rate. Rolling back...');
    await rollback(optimizedModelId);
    return;
  }

  // Phase 9: Gradual Rollout
  console.log('\nPhase 9: Gradual Rollout');
  console.log('─'.repeat(50));
  await gradualRollout(optimizedModelId);

  // Phase 10: Production Monitoring
  console.log('\nPhase 10: Production Monitoring');
  console.log('─'.repeat(50));
  await setupMonitoring(optimizedModelId);

  console.log('\n✓ Complete ML pipeline executed successfully!');
  console.log('\nPipeline Summary:');
  console.log(`  - Model ID: ${optimizedModelId}`);
  console.log(`  - Accuracy: ${(evaluation.accuracy * 100).toFixed(2)}%`);
  console.log(`  - Error Rate: ${(canaryMetrics.errorRate * 100).toFixed(3)}%`);
  console.log(`  - P95 Latency: ${canaryMetrics.p95Latency}ms`);
  console.log(`  - Throughput: ${canaryMetrics.throughput} req/s`);
}

async function prepareData(): Promise<void> {
  console.log('  ✓ Loading raw data...');
  console.log('  ✓ Cleaning and normalizing...');
  console.log('  ✓ Feature engineering...');
  console.log('  ✓ Train/val/test split (70/15/15)');
  console.log('  ✓ Data augmentation applied');
  await new Promise((resolve) => setTimeout(resolve, 100));
}

async function trainModel(): Promise<string> {
  const modelId = 'intel-classifier-v2';

  const config: TrainingConfig = {
    modelId,
    batchSize: 128,
    epochs: 50,
    learningRate: 0.001,
    optimizer: 'adamw',
    lossFunction: 'cross_entropy',
    metrics: ['accuracy', 'f1_score', 'precision', 'recall'],

    distributed: {
      strategy: 'data_parallel',
      numWorkers: 4,
    },

    earlyStopping: {
      monitor: 'val_loss',
      patience: 7,
      minDelta: 0.0001,
    },

    checkpointing: {
      frequency: 5,
      saveWeightsOnly: false,
    },
  };

  console.log('  ✓ Starting distributed training (4 GPUs)...');

  const response = await fetch('http://localhost:3001/api/v1/training/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });

  const { jobId } = await response.json();
  console.log(`  ✓ Training job: ${jobId}`);

  // Simulate monitoring
  await new Promise((resolve) => setTimeout(resolve, 200));
  console.log('  ✓ Training complete (early stopped at epoch 43)');

  return modelId;
}

async function evaluateModel(modelId: string): Promise<any> {
  console.log('  ✓ Running evaluation on test set...');
  await new Promise((resolve) => setTimeout(resolve, 100));

  const results = {
    accuracy: 0.945,
    precision: 0.938,
    recall: 0.952,
    f1Score: 0.945,
    confusionMatrix: [
      [450, 10],
      [15, 525],
    ],
  };

  console.log('  Evaluation Results:');
  console.log(`    - Accuracy: ${(results.accuracy * 100).toFixed(2)}%`);
  console.log(`    - Precision: ${(results.precision * 100).toFixed(2)}%`);
  console.log(`    - Recall: ${(results.recall * 100).toFixed(2)}%`);
  console.log(`    - F1 Score: ${(results.f1Score * 100).toFixed(2)}%`);

  return results;
}

async function optimizeModel(modelId: string): Promise<string> {
  console.log('  ✓ Applying INT8 quantization...');

  const quantizer = new ModelQuantizer({
    bitWidth: 'int8',
    method: 'static',
    calibrationSamples: 1000,
  });

  await quantizer.quantize(
    `/models/${modelId}.ckpt`,
    `/models/${modelId}-optimized.ckpt`
  );

  console.log('  ✓ Optimization complete (4x size reduction)');

  return `${modelId}-optimized`;
}

async function deployStagingModel(modelId: string): Promise<void> {
  const config: DeploymentConfig = {
    modelId,
    version: 'v2.0.0-staging',
    environment: 'staging',
    replicas: 1,
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });

  console.log('  ✓ Model deployed to staging');
}

async function runIntegrationTests(modelId: string): Promise<any> {
  console.log('  Running integration tests...');

  const tests = [
    { name: 'Latency test', passed: true },
    { name: 'Load test (100 req/s)', passed: true },
    { name: 'Edge case handling', passed: true },
    { name: 'Backward compatibility', passed: true },
  ];

  for (const test of tests) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    console.log(`    ${test.passed ? '✓' : '✗'} ${test.name}`);
  }

  return {
    passed: tests.every((t) => t.passed),
    results: tests,
  };
}

async function deployCanary(modelId: string, trafficPercent: number): Promise<void> {
  console.log(`  ✓ Deploying canary with ${trafficPercent * 100}% traffic...`);
  await new Promise((resolve) => setTimeout(resolve, 100));
  console.log('  ✓ Canary deployed');
}

async function monitorCanary(modelId: string, durationSeconds: number): Promise<any> {
  console.log(`  Monitoring for ${durationSeconds}s...`);

  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    process.stdout.write('.');
  }

  console.log('\n  Canary Metrics:');
  const metrics = {
    errorRate: 0.002,
    p95Latency: 28,
    p99Latency: 45,
    throughput: 180,
  };

  console.log(`    - Error rate: ${(metrics.errorRate * 100).toFixed(3)}%`);
  console.log(`    - P95 latency: ${metrics.p95Latency}ms`);
  console.log(`    - P99 latency: ${metrics.p99Latency}ms`);
  console.log(`    - Throughput: ${metrics.throughput} req/s`);

  return metrics;
}

async function gradualRollout(modelId: string): Promise<void> {
  const stages = [25, 50, 75, 100];

  for (const percent of stages) {
    console.log(`  ✓ Rolling out to ${percent}% of traffic...`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log('  ✓ Full rollout complete');
}

async function setupMonitoring(modelId: string): Promise<void> {
  console.log('  ✓ Setting up Prometheus metrics...');
  console.log('  ✓ Configuring Grafana dashboards...');
  console.log('  ✓ Setting up alerting rules...');
  console.log('  ✓ Enabling request tracing...');
  await new Promise((resolve) => setTimeout(resolve, 100));
}

async function rollback(modelId: string): Promise<void> {
  console.log('  Rolling back to previous version...');
  await new Promise((resolve) => setTimeout(resolve, 100));
  console.log('  ✓ Rollback complete');
}

main().catch(console.error);
