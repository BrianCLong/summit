/**
 * Example: Object Detection with YOLO
 *
 * This example demonstrates:
 * - Creating a YOLOv5 model
 * - Training for custom object detection
 * - Real-time inference
 * - Visualization of results
 */

import { createYOLOv5 } from '@intelgraph/cnn-framework';
import type { TrainingConfig, InferenceRequest } from '@intelgraph/deep-learning-core';

async function main() {
  console.log('=== Object Detection with YOLOv5 ===\n');

  // 1. Create YOLOv5 model
  console.log('Step 1: Creating YOLOv5 model...');
  const yoloModel = createYOLOv5([640, 640, 3], 80); // 80 COCO classes

  console.log(`✓ Created ${yoloModel.name}`);
  console.log(`  - Input shape: ${yoloModel.inputShape.join('x')}`);
  console.log(`  - Classes: 80 (COCO dataset)\n`);

  // 2. Configure training
  console.log('Step 2: Configuring training...');
  const trainingConfig: TrainingConfig = {
    modelId: 'yolov5-detector',
    batchSize: 16, // Lower batch size for object detection
    epochs: 100,
    learningRate: 0.001,
    optimizer: 'sgd',
    lossFunction: 'yolo_loss',
    metrics: ['map', 'map50', 'map75'],

    distributed: {
      strategy: 'data_parallel',
      numWorkers: 2,
    },
  };

  console.log('✓ Training configured for object detection\n');

  // 3. Start training
  console.log('Step 3: Starting training...');
  const trainResponse = await fetch('http://localhost:3001/api/v1/training/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(trainingConfig),
  });

  const { jobId } = await trainResponse.json();
  console.log(`✓ Training job: ${jobId}\n`);

  // 4. Deploy model for inference
  console.log('Step 4: Deploying model for inference...');
  const deployConfig = {
    modelId: 'yolov5-detector',
    version: 'v1.0.0',
    environment: 'production',
    replicas: 2,
    resources: {
      gpu: 1,
      memoryRequest: '4Gi',
    },
    batching: {
      enabled: true,
      maxBatchSize: 8,
      maxWaitTimeMs: 30,
    },
  };

  await fetch('http://localhost:3002/api/v1/models/deploy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(deployConfig),
  });

  console.log('✓ Model deployed\n');

  // 5. Run inference on test image
  console.log('Step 5: Running inference...');
  const testImage = generateTestImage();

  const inferenceRequest: InferenceRequest = {
    modelId: 'yolov5-detector',
    version: 'v1.0.0',
    inputs: {
      image: testImage,
    },
    returnMetadata: true,
  };

  const inferenceResponse = await fetch('http://localhost:3002/api/v1/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inferenceRequest),
  });

  const result = await inferenceResponse.json();

  console.log('Detection Results:');
  result.predictions.forEach((detection: any, i: number) => {
    console.log(`  Object ${i + 1}:`);
    console.log(`    - Class: ${detection.class}`);
    console.log(`    - Confidence: ${(detection.confidence * 100).toFixed(1)}%`);
    console.log(`    - Bbox: [${detection.bbox.join(', ')}]`);
  });

  console.log(`\n✓ Inference time: ${result.metadata?.inferenceTime}ms`);
}

function generateTestImage(): number[] {
  // Generate dummy image data (640x640x3)
  return Array(640 * 640 * 3).fill(0).map(() => Math.random());
}

main().catch(console.error);
