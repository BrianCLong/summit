/**
 * Deep Learning Training Service
 * Distributed training orchestration and management
 */

import express from 'express';
import type { TrainingConfig, TrainingStatus } from '@intelgraph/deep-learning-core';
import { DistributedTrainingOrchestrator } from '@intelgraph/distributed-training';

const app = express();
app.use(express.json());

// Training job registry
const trainingJobs = new Map<string, TrainingStatus>();

// Start training job
app.post('/api/v1/training/start', async (req, res) => {
  try {
    const config: TrainingConfig = req.body;

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const status: TrainingStatus = {
      jobId,
      modelId: config.modelId,
      status: 'pending',
      currentEpoch: 0,
      totalEpochs: config.epochs,
      startedAt: new Date().toISOString(),
    };

    trainingJobs.set(jobId, status);

    // Start training asynchronously
    startTraining(jobId, config).catch(console.error);

    res.json({ jobId, status });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get training status
app.get('/api/v1/training/:jobId', (req, res) => {
  const { jobId } = req.params;
  const status = trainingJobs.get(jobId);

  if (!status) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json(status);
});

// List all training jobs
app.get('/api/v1/training', (req, res) => {
  const jobs = Array.from(trainingJobs.values());
  res.json({ jobs, total: jobs.length });
});

// Stop training job
app.post('/api/v1/training/:jobId/stop', (req, res) => {
  const { jobId } = req.params;
  const status = trainingJobs.get(jobId);

  if (!status) {
    return res.status(404).json({ error: 'Job not found' });
  }

  status.status = 'stopped';
  trainingJobs.set(jobId, status);

  res.json({ message: 'Training job stopped', status });
});

// Get training metrics
app.get('/api/v1/training/:jobId/metrics', (req, res) => {
  const { jobId } = req.params;
  const status = trainingJobs.get(jobId);

  if (!status) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({
    jobId,
    metrics: status.metrics || {},
    currentEpoch: status.currentEpoch,
    totalEpochs: status.totalEpochs,
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'dl-training-service', timestamp: new Date().toISOString() });
});

async function startTraining(jobId: string, config: TrainingConfig): Promise<void> {
  const status = trainingJobs.get(jobId)!;
  status.status = 'running';
  trainingJobs.set(jobId, status);

  try {
    // Initialize distributed training if configured
    if (config.distributed) {
      const orchestrator = new DistributedTrainingOrchestrator({
        strategy: config.distributed.strategy,
        numWorkers: config.distributed.numWorkers,
        backend: 'nccl',
      });
      await orchestrator.initializeWorkers();
      await orchestrator.distributeModel(config.modelId);
    }

    // Simulate training loop
    for (let epoch = 0; epoch < config.epochs; epoch++) {
      status.currentEpoch = epoch + 1;
      status.metrics = {
        loss: 1.0 / (epoch + 1),
        accuracy: 0.5 + (epoch / config.epochs) * 0.4,
      };
      trainingJobs.set(jobId, status);

      // Simulate epoch duration
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (status.status === 'stopped') {
        break;
      }
    }

    status.status = 'completed';
    status.completedAt = new Date().toISOString();
  } catch (error: any) {
    status.status = 'failed';
    status.error = error.message;
  }

  trainingJobs.set(jobId, status);
}

const PORT = process.env.DL_TRAINING_PORT || 3001;

app.listen(PORT, () => {
  console.log(`DL Training Service listening on port ${PORT}`);
});

export default app;
