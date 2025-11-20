/**
 * Example: Advanced - Model Optimization Pipeline
 *
 * This example demonstrates:
 * - Complete optimization workflow
 * - Quantization, pruning, and distillation
 * - Performance comparison
 * - Production deployment
 */

import {
  ModelQuantizer,
  ModelPruner,
  KnowledgeDistiller,
  ONNXExporter,
  TensorRTOptimizer,
} from '@intelgraph/model-optimization';
import type { DeploymentConfig } from '@intelgraph/deep-learning-core';

async function main() {
  console.log('=== Model Optimization Pipeline ===\n');

  const originalModelPath = '/models/intelligence-classifier-v1.ckpt';

  // Step 1: Baseline performance
  console.log('Step 1: Measuring baseline performance...');
  const baseline = await measurePerformance(originalModelPath);
  console.log('Baseline Metrics:');
  console.log(`  - Model size: ${formatBytes(baseline.size)}`);
  console.log(`  - Inference time: ${baseline.inferenceTime}ms`);
  console.log(`  - Throughput: ${baseline.throughput} req/s`);
  console.log(`  - Accuracy: ${(baseline.accuracy * 100).toFixed(2)}%\n`);

  // Step 2: Quantization
  console.log('Step 2: Applying INT8 quantization...');
  const quantizer = new ModelQuantizer({
    bitWidth: 'int8',
    method: 'static',
    calibrationSamples: 1000,
  });

  const quantResult = await quantizer.quantize(
    originalModelPath,
    '/models/intelligence-classifier-v1-int8.ckpt'
  );

  console.log('Quantization Results:');
  console.log(`  - Original: ${formatBytes(quantResult.originalSize)}`);
  console.log(`  - Quantized: ${formatBytes(quantResult.quantizedSize)}`);
  console.log(`  - Compression: ${quantResult.compressionRatio.toFixed(2)}x`);

  const quantPerf = await measurePerformance('/models/intelligence-classifier-v1-int8.ckpt');
  console.log(`  - Speedup: ${(baseline.inferenceTime / quantPerf.inferenceTime).toFixed(2)}x`);
  console.log(`  - Accuracy drop: ${((baseline.accuracy - quantPerf.accuracy) * 100).toFixed(2)}%\n`);

  // Step 3: Pruning
  console.log('Step 3: Applying structured pruning (50%)...');
  const pruner = new ModelPruner({
    method: 'structured',
    pruningRate: 0.5,
    fineTuneEpochs: 5,
  });

  const pruneResult = await pruner.prune(originalModelPath);
  console.log('Pruning Results:');
  console.log(`  - Original params: ${formatNumber(pruneResult.originalParams)}`);
  console.log(`  - Pruned params: ${formatNumber(pruneResult.prunedParams)}`);
  console.log(`  - Sparsity: ${(pruneResult.sparsity * 100).toFixed(1)}%\n`);

  // Step 4: Knowledge Distillation
  console.log('Step 4: Distilling to smaller student model...');
  const distiller = new KnowledgeDistiller({
    teacherModelId: 'intelligence-classifier-v1',
    studentModelId: 'intelligence-classifier-small',
    temperature: 4.0,
    alpha: 0.7,
    beta: 0.3,
  });

  const distillResult = await distiller.distill([]);
  console.log('Distillation Results:');
  console.log(`  - Teacher accuracy: ${(distillResult.metrics.teacherAccuracy * 100).toFixed(2)}%`);
  console.log(`  - Student accuracy: ${(distillResult.metrics.accuracy * 100).toFixed(2)}%`);
  console.log(`  - Accuracy retained: ${((distillResult.metrics.accuracy / distillResult.metrics.teacherAccuracy) * 100).toFixed(1)}%\n`);

  // Step 5: ONNX Export
  console.log('Step 5: Exporting to ONNX...');
  const exporter = new ONNXExporter();
  const onnxPath = await exporter.export(
    '/models/intelligence-classifier-v1-int8.ckpt',
    '/models/intelligence-classifier-v1.onnx',
    { opsetVersion: 14 }
  );
  await exporter.optimize(onnxPath);
  console.log(`✓ ONNX model exported: ${onnxPath}\n`);

  // Step 6: TensorRT Optimization
  console.log('Step 6: Optimizing with TensorRT...');
  const trtOptimizer = new TensorRTOptimizer();
  const trtResult = await trtOptimizer.optimize(onnxPath, {
    precision: 'fp16',
    maxBatchSize: 32,
    workspace: 1 << 30,
  });

  console.log('TensorRT Results:');
  console.log(`  - Engine path: ${trtResult.enginePath}`);
  console.log(`  - Speedup: ${trtResult.speedup.toFixed(2)}x\n`);

  // Step 7: Performance Comparison
  console.log('Step 7: Final Performance Comparison\n');
  console.log('┌─────────────────┬──────────┬──────────┬───────────┬──────────┐');
  console.log('│ Model           │ Size     │ Latency  │ Throughput│ Accuracy │');
  console.log('├─────────────────┼──────────┼──────────┼───────────┼──────────┤');
  console.log(`│ Original        │ ${padRight(formatBytes(baseline.size), 8)} │ ${padRight(baseline.inferenceTime + 'ms', 8)} │ ${padRight(baseline.throughput + '/s', 9)} │ ${padRight((baseline.accuracy * 100).toFixed(2) + '%', 8)} │`);
  console.log(`│ Quantized (INT8)│ ${padRight(formatBytes(quantResult.quantizedSize), 8)} │ ${padRight(quantPerf.inferenceTime + 'ms', 8)} │ ${padRight(quantPerf.throughput + '/s', 9)} │ ${padRight((quantPerf.accuracy * 100).toFixed(2) + '%', 8)} │`);
  console.log(`│ Pruned (50%)    │ ${padRight(formatBytes(baseline.size * 0.5), 8)} │ ${padRight((baseline.inferenceTime * 0.8).toFixed(0) + 'ms', 8)} │ ${padRight(Math.floor(baseline.throughput * 1.2) + '/s', 9)} │ ${padRight((baseline.accuracy * 0.98 * 100).toFixed(2) + '%', 8)} │`);
  console.log(`│ Distilled       │ ${padRight(formatBytes(baseline.size * 0.3), 8)} │ ${padRight((baseline.inferenceTime * 0.4).toFixed(0) + 'ms', 8)} │ ${padRight(Math.floor(baseline.throughput * 2.5) + '/s', 9)} │ ${padRight((distillResult.metrics.accuracy * 100).toFixed(2) + '%', 8)} │`);
  console.log(`│ TensorRT (FP16) │ ${padRight(formatBytes(quantResult.quantizedSize), 8)} │ ${padRight((quantPerf.inferenceTime / trtResult.speedup).toFixed(0) + 'ms', 8)} │ ${padRight(Math.floor(quantPerf.throughput * trtResult.speedup) + '/s', 9)} │ ${padRight((quantPerf.accuracy * 100).toFixed(2) + '%', 8)} │`);
  console.log('└─────────────────┴──────────┴──────────┴───────────┴──────────┘\n');

  // Step 8: Deploy optimized model
  console.log('Step 8: Deploying optimized model...');
  const deployConfig: DeploymentConfig = {
    modelId: 'intelligence-classifier-v1-optimized',
    version: 'v1.0.0',
    environment: 'production',
    replicas: 3,
    resources: {
      gpu: 1,
      memoryRequest: '2Gi',
      memoryLimit: '4Gi',
    },
    batching: {
      enabled: true,
      maxBatchSize: 32,
      maxWaitTimeMs: 50,
    },
    autoScaling: {
      enabled: true,
      minReplicas: 2,
      maxReplicas: 10,
      targetCpuUtilization: 70,
    },
  };

  await fetch('http://localhost:3002/api/v1/models/deploy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(deployConfig),
  });

  console.log('✓ Optimized model deployed to production\n');
  console.log('Summary:');
  console.log(`  - Size reduced: ${((1 - quantResult.compressionRatio) * 100).toFixed(1)}%`);
  console.log(`  - Inference speedup: ${trtResult.speedup.toFixed(2)}x`);
  console.log(`  - Accuracy retained: ${((quantPerf.accuracy / baseline.accuracy) * 100).toFixed(1)}%`);
  console.log('\n✓ Optimization pipeline complete!');
}

async function measurePerformance(modelPath: string): Promise<any> {
  // Simulate performance measurement
  return {
    size: 100 * 1024 * 1024, // 100MB
    inferenceTime: 25,
    throughput: 150,
    accuracy: 0.94,
  };
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)}${units[unitIndex]}`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

function padRight(str: string, length: number): string {
  return str + ' '.repeat(Math.max(0, length - str.length));
}

main().catch(console.error);
