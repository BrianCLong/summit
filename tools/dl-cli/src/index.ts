#!/usr/bin/env node

/**
 * Deep Learning CLI Tool
 * Command-line interface for managing models, training, and deployment
 */

import { Command } from 'commander';
import axios from 'axios';

const program = new Command();

// Configuration
const TRAINING_SERVICE = process.env.DL_TRAINING_URL || 'http://localhost:3001';
const SERVING_SERVICE = process.env.DL_SERVING_URL || 'http://localhost:3002';
const REGISTRY_SERVICE = process.env.DL_REGISTRY_URL || 'http://localhost:3003';

program
  .name('dl')
  .description('Deep Learning CLI for Summit platform')
  .version('1.0.0');

// ============================================================================
// Training Commands
// ============================================================================

const train = program.command('train').description('Training operations');

train
  .command('start')
  .description('Start a training job')
  .requiredOption('-m, --model-id <id>', 'Model ID')
  .option('-b, --batch-size <size>', 'Batch size', '32')
  .option('-e, --epochs <count>', 'Number of epochs', '50')
  .option('-lr, --learning-rate <rate>', 'Learning rate', '0.001')
  .option('-o, --optimizer <name>', 'Optimizer', 'adam')
  .option('--gpus <count>', 'Number of GPUs', '1')
  .action(async (options) => {
    try {
      console.log('Starting training job...');

      const config = {
        modelId: options.modelId,
        batchSize: parseInt(options.batchSize),
        epochs: parseInt(options.epochs),
        learningRate: parseFloat(options.learningRate),
        optimizer: options.optimizer,
        lossFunction: 'categorical_crossentropy',
        metrics: ['accuracy'],
        distributed: {
          strategy: 'data_parallel',
          numWorkers: parseInt(options.gpus),
        },
      };

      const response = await axios.post(
        `${TRAINING_SERVICE}/api/v1/training/start`,
        config
      );

      console.log(`✓ Training job started: ${response.data.jobId}`);
      console.log(`  Monitor with: dl train status ${response.data.jobId}`);
    } catch (error: any) {
      console.error('Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

train
  .command('status <jobId>')
  .description('Check training job status')
  .action(async (jobId) => {
    try {
      const response = await axios.get(
        `${TRAINING_SERVICE}/api/v1/training/${jobId}`
      );

      const status = response.data;
      console.log(`\nTraining Job: ${jobId}`);
      console.log(`Status: ${status.status}`);
      console.log(`Progress: ${status.currentEpoch}/${status.totalEpochs} epochs`);

      if (status.metrics) {
        console.log('\nMetrics:');
        Object.entries(status.metrics).forEach(([key, value]: [string, any]) => {
          console.log(`  ${key}: ${typeof value === 'number' ? value.toFixed(4) : value}`);
        });
      }
    } catch (error: any) {
      console.error('Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

train
  .command('list')
  .description('List all training jobs')
  .action(async () => {
    try {
      const response = await axios.get(`${TRAINING_SERVICE}/api/v1/training`);
      const jobs = response.data.jobs;

      if (jobs.length === 0) {
        console.log('No training jobs found');
        return;
      }

      console.log('\nTraining Jobs:');
      console.log('─'.repeat(80));

      jobs.forEach((job: any) => {
        console.log(`${job.jobId}`);
        console.log(`  Model: ${job.modelId}`);
        console.log(`  Status: ${job.status}`);
        console.log(`  Progress: ${job.currentEpoch}/${job.totalEpochs}`);
        console.log();
      });
    } catch (error: any) {
      console.error('Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

// ============================================================================
// Model Registry Commands
// ============================================================================

const registry = program.command('registry').description('Model registry operations');

registry
  .command('list')
  .description('List registered models')
  .option('--stage <stage>', 'Filter by stage')
  .option('--task <type>', 'Filter by task type')
  .action(async (options) => {
    try {
      const params = new URLSearchParams();
      if (options.stage) params.append('stage', options.stage);
      if (options.task) params.append('taskType', options.task);

      const response = await axios.get(
        `${REGISTRY_SERVICE}/api/v1/registry/models?${params}`
      );

      const models = response.data.models;

      if (models.length === 0) {
        console.log('No models found');
        return;
      }

      console.log('\nRegistered Models:');
      console.log('─'.repeat(80));

      models.forEach((model: any) => {
        console.log(`${model.modelId} (${model.name})`);
        console.log(`  Latest: ${model.latestVersion}`);
        console.log(`  Task: ${model.taskType}`);
        console.log(`  Stage: ${model.stage}`);
        console.log(`  Framework: ${model.framework}`);
        console.log();
      });

      console.log(`Total: ${models.length} models`);
    } catch (error: any) {
      console.error('Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

registry
  .command('info <modelId>')
  .description('Get model information')
  .action(async (modelId) => {
    try {
      const response = await axios.get(
        `${REGISTRY_SERVICE}/api/v1/registry/models/${modelId}`
      );

      const model = response.data;

      console.log(`\nModel: ${model.name}`);
      console.log(`ID: ${model.modelId}`);
      console.log(`Latest Version: ${model.version}`);
      console.log(`Framework: ${model.framework}`);
      console.log(`Task Type: ${model.taskType}`);
      console.log(`Stage: ${model.stage}`);

      if (model.metrics) {
        console.log('\nMetrics:');
        Object.entries(model.metrics).forEach(([key, value]: [string, any]) => {
          console.log(`  ${key}: ${typeof value === 'number' ? value.toFixed(4) : value}`);
        });
      }

      console.log('\nVersions:');
      model.versions.forEach((v: any) => {
        console.log(`  ${v.version} (${v.stage}) - ${v.createdAt}`);
      });
    } catch (error: any) {
      console.error('Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

registry
  .command('promote <modelId> <version> <stage>')
  .description('Promote model to stage (development, staging, production)')
  .action(async (modelId, version, stage) => {
    try {
      await axios.patch(
        `${REGISTRY_SERVICE}/api/v1/registry/models/${modelId}/versions/${version}/stage`,
        { stage }
      );

      console.log(`✓ Model ${modelId} v${version} promoted to ${stage}`);
    } catch (error: any) {
      console.error('Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

// ============================================================================
// Deployment Commands
// ============================================================================

const deploy = program.command('deploy').description('Deployment operations');

deploy
  .command('create')
  .description('Deploy a model')
  .requiredOption('-m, --model-id <id>', 'Model ID')
  .requiredOption('-v, --version <version>', 'Model version')
  .option('-e, --env <environment>', 'Environment', 'production')
  .option('-r, --replicas <count>', 'Number of replicas', '3')
  .action(async (options) => {
    try {
      console.log('Deploying model...');

      const config = {
        modelId: options.modelId,
        version: options.version,
        environment: options.env,
        replicas: parseInt(options.replicas),
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

      await axios.post(`${SERVING_SERVICE}/api/v1/models/deploy`, config);

      console.log(`✓ Model deployed successfully`);
      console.log(`  Model: ${options.modelId}`);
      console.log(`  Version: ${options.version}`);
      console.log(`  Environment: ${options.env}`);
      console.log(`  Replicas: ${options.replicas}`);
    } catch (error: any) {
      console.error('Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

deploy
  .command('list')
  .description('List deployed models')
  .action(async () => {
    try {
      const response = await axios.get(`${SERVING_SERVICE}/api/v1/models`);
      const models = response.data.models;

      if (models.length === 0) {
        console.log('No deployed models found');
        return;
      }

      console.log('\nDeployed Models:');
      console.log('─'.repeat(80));

      models.forEach((model: any) => {
        console.log(`${model.modelId} v${model.version}`);
        console.log(`  Environment: ${model.environment}`);
        console.log(`  Replicas: ${model.replicas}`);
        console.log();
      });
    } catch (error: any) {
      console.error('Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

// ============================================================================
// Inference Commands
// ============================================================================

program
  .command('predict')
  .description('Run inference on deployed model')
  .requiredOption('-m, --model-id <id>', 'Model ID')
  .option('-v, --version <version>', 'Model version', 'latest')
  .requiredOption('-i, --input <json>', 'Input data (JSON)')
  .action(async (options) => {
    try {
      const request = {
        modelId: options.modelId,
        version: options.version,
        inputs: JSON.parse(options.input),
        returnMetadata: true,
      };

      const response = await axios.post(
        `${SERVING_SERVICE}/api/v1/predict`,
        request
      );

      console.log('\nPredictions:');
      console.log(JSON.stringify(response.data.predictions, null, 2));

      if (response.data.metadata) {
        console.log(`\nInference time: ${response.data.metadata.inferenceTime}ms`);
      }
    } catch (error: any) {
      console.error('Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

// ============================================================================
// Utility Commands
// ============================================================================

program
  .command('health')
  .description('Check service health')
  .action(async () => {
    const services = [
      { name: 'Training Service', url: `${TRAINING_SERVICE}/health` },
      { name: 'Serving Service', url: `${SERVING_SERVICE}/health` },
      { name: 'Registry Service', url: `${REGISTRY_SERVICE}/health` },
    ];

    console.log('\nService Health:');
    console.log('─'.repeat(80));

    for (const service of services) {
      try {
        const response = await axios.get(service.url, { timeout: 2000 });
        console.log(`✓ ${service.name}: ${response.data.status}`);
      } catch (error) {
        console.log(`✗ ${service.name}: Unreachable`);
      }
    }
  });

program.parse();
