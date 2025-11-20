/**
 * Training Orchestrator
 * Manages distributed training, experiment tracking, and resource allocation
 */

import { TrainingConfig, TrainingRun, TrainingStatus } from '../types/index.js';
import { EventEmitter } from 'events';

export interface ResourceAllocation {
  nodeId: string;
  gpus: number[];
  cpus: number;
  memory: string;
  allocated: Date;
}

export interface TrainingJob {
  id: string;
  config: TrainingConfig;
  status: TrainingStatus;
  resources?: ResourceAllocation;
  worker?: {
    pid: number;
    host: string;
    port: number;
  };
}

export class TrainingOrchestrator extends EventEmitter {
  private jobs: Map<string, TrainingJob>;
  private runs: Map<string, TrainingRun>;
  private resourcePool: Map<string, ResourceAllocation>;

  constructor() {
    super();
    this.jobs = new Map();
    this.runs = new Map();
    this.resourcePool = new Map();
  }

  /**
   * Submit a training job
   */
  async submitTraining(config: TrainingConfig): Promise<string> {
    const jobId = config.runId;

    const job: TrainingJob = {
      id: jobId,
      config,
      status: 'pending',
    };

    this.jobs.set(jobId, job);

    // Initialize training run
    const run: TrainingRun = {
      id: jobId,
      config,
      status: 'pending',
      metrics: [],
      artifacts: [],
    };

    this.runs.set(jobId, run);

    this.emit('training:submitted', job);

    // Start training asynchronously
    this.startTraining(jobId).catch(error => {
      this.handleTrainingError(jobId, error);
    });

    return jobId;
  }

  /**
   * Start training job
   */
  private async startTraining(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Allocate resources
    const resources = await this.allocateResources(job.config.resources);
    job.resources = resources;

    // Update status
    await this.updateJobStatus(jobId, 'running');

    const run = this.runs.get(jobId);
    if (run) {
      run.startTime = new Date();
      run.status = 'running';
    }

    this.emit('training:started', job);

    // In a real implementation, this would launch the actual training process
    // For now, simulate training
    await this.simulateTraining(jobId);
  }

  /**
   * Simulate training process (placeholder for actual implementation)
   */
  private async simulateTraining(jobId: string): Promise<void> {
    const run = this.runs.get(jobId);
    if (!run) return;

    const epochs = run.config.batchSize || 10;

    for (let epoch = 0; epoch < epochs; epoch++) {
      // Simulate epoch training
      await this.sleep(100);

      // Record metrics
      await this.logMetrics(jobId, {
        epoch,
        step: epoch * 100,
        timestamp: new Date(),
        metrics: {
          loss: Math.random() * 0.5,
          accuracy: 0.5 + Math.random() * 0.5,
          learning_rate: run.config.learningRate,
        },
      });

      // Check if should checkpoint
      if (
        run.config.checkpoint.enabled &&
        epoch % run.config.checkpoint.frequency === 0
      ) {
        await this.createCheckpoint(jobId, epoch);
      }

      // Check early stopping
      if (run.config.earlyStopping?.enabled) {
        const shouldStop = await this.checkEarlyStopping(jobId);
        if (shouldStop) {
          break;
        }
      }
    }

    // Complete training
    await this.completeTraining(jobId);
  }

  /**
   * Log training metrics
   */
  async logMetrics(
    runId: string,
    metrics: {
      epoch: number;
      step: number;
      timestamp: Date;
      metrics: Record<string, number>;
    }
  ): Promise<void> {
    const run = this.runs.get(runId);
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }

    run.metrics.push(metrics);
    this.emit('metrics:logged', { runId, metrics });
  }

  /**
   * Create checkpoint
   */
  async createCheckpoint(runId: string, epoch: number): Promise<void> {
    const run = this.runs.get(runId);
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }

    const checkpoint = {
      name: `checkpoint-epoch-${epoch}`,
      path: `/checkpoints/${runId}/epoch-${epoch}`,
      type: 'checkpoint',
      size: Math.floor(Math.random() * 1000000000), // Random size
    };

    run.artifacts.push(checkpoint);
    this.emit('checkpoint:created', { runId, checkpoint });
  }

  /**
   * Check early stopping conditions
   */
  private async checkEarlyStopping(runId: string): Promise<boolean> {
    const run = this.runs.get(runId);
    if (!run || !run.config.earlyStopping) {
      return false;
    }

    const { metric, patience, minDelta } = run.config.earlyStopping;

    // Get recent metrics
    const recentMetrics = run.metrics
      .slice(-patience)
      .map(m => m.metrics[metric])
      .filter(v => v !== undefined);

    if (recentMetrics.length < patience) {
      return false;
    }

    // Check if improvement is less than minDelta
    const improvements = [];
    for (let i = 1; i < recentMetrics.length; i++) {
      improvements.push(Math.abs(recentMetrics[i] - recentMetrics[i - 1]));
    }

    const avgImprovement =
      improvements.reduce((a, b) => a + b, 0) / improvements.length;

    return avgImprovement < minDelta;
  }

  /**
   * Complete training
   */
  private async completeTraining(jobId: string): Promise<void> {
    const run = this.runs.get(jobId);
    const job = this.jobs.get(jobId);

    if (!run || !job) return;

    run.endTime = new Date();
    run.status = 'completed';

    if (run.startTime) {
      run.duration = (run.endTime.getTime() - run.startTime.getTime()) / 1000;
    }

    // Calculate resource usage
    run.resourceUsage = {
      totalGpuHours: job.resources
        ? (run.duration || 0) * job.resources.gpus.length / 3600
        : 0,
    };

    // Release resources
    if (job.resources) {
      await this.releaseResources(job.resources.nodeId);
    }

    await this.updateJobStatus(jobId, 'completed');
    this.emit('training:completed', { jobId, run });
  }

  /**
   * Handle training error
   */
  private async handleTrainingError(jobId: string, error: Error): Promise<void> {
    const run = this.runs.get(jobId);
    const job = this.jobs.get(jobId);

    if (run) {
      run.status = 'failed';
      run.endTime = new Date();
      run.error = {
        message: error.message,
        stackTrace: error.stack,
        timestamp: new Date(),
      };
    }

    if (job) {
      job.status = 'failed';

      // Release resources
      if (job.resources) {
        await this.releaseResources(job.resources.nodeId);
      }
    }

    this.emit('training:failed', { jobId, error });
  }

  /**
   * Cancel training job
   */
  async cancelTraining(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    const run = this.runs.get(jobId);

    if (!job || !run) {
      throw new Error(`Job ${jobId} not found`);
    }

    run.status = 'cancelled';
    run.endTime = new Date();

    await this.updateJobStatus(jobId, 'cancelled');

    // Release resources
    if (job.resources) {
      await this.releaseResources(job.resources.nodeId);
    }

    this.emit('training:cancelled', { jobId });
  }

  /**
   * Pause training job
   */
  async pauseTraining(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    const run = this.runs.get(jobId);

    if (!job || !run) {
      throw new Error(`Job ${jobId} not found`);
    }

    await this.updateJobStatus(jobId, 'paused');
    run.status = 'paused';

    this.emit('training:paused', { jobId });
  }

  /**
   * Resume training job
   */
  async resumeTraining(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    const run = this.runs.get(jobId);

    if (!job || !run) {
      throw new Error(`Job ${jobId} not found`);
    }

    await this.updateJobStatus(jobId, 'running');
    run.status = 'running';

    this.emit('training:resumed', { jobId });
  }

  /**
   * Get training run
   */
  async getTrainingRun(runId: string): Promise<TrainingRun | null> {
    return this.runs.get(runId) || null;
  }

  /**
   * List training runs
   */
  async listTrainingRuns(filter?: {
    status?: TrainingStatus;
    modelName?: string;
  }): Promise<TrainingRun[]> {
    let runs = Array.from(this.runs.values());

    if (filter?.status) {
      runs = runs.filter(r => r.status === filter.status);
    }

    if (filter?.modelName) {
      runs = runs.filter(r => r.config.modelName === filter.modelName);
    }

    return runs.sort((a, b) => {
      const timeA = a.startTime?.getTime() || 0;
      const timeB = b.startTime?.getTime() || 0;
      return timeB - timeA;
    });
  }

  /**
   * Get training metrics
   */
  async getTrainingMetrics(runId: string): Promise<TrainingRun['metrics']> {
    const run = this.runs.get(runId);
    return run?.metrics || [];
  }

  /**
   * Allocate resources for training
   */
  private async allocateResources(
    requirements: TrainingConfig['resources']
  ): Promise<ResourceAllocation> {
    // In a real implementation, this would interact with a cluster scheduler
    // For now, simulate resource allocation
    const nodeId = `node-${Math.random().toString(36).substr(2, 9)}`;

    const allocation: ResourceAllocation = {
      nodeId,
      gpus: Array.from({ length: requirements.gpus }, (_, i) => i),
      cpus: requirements.cpus,
      memory: requirements.memory,
      allocated: new Date(),
    };

    this.resourcePool.set(nodeId, allocation);

    return allocation;
  }

  /**
   * Release allocated resources
   */
  private async releaseResources(nodeId: string): Promise<void> {
    this.resourcePool.delete(nodeId);
  }

  /**
   * Update job status
   */
  private async updateJobStatus(
    jobId: string,
    status: TrainingStatus
  ): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = status;
      this.emit('job:status-changed', { jobId, status });
    }
  }

  /**
   * Get resource utilization
   */
  async getResourceUtilization(): Promise<{
    totalNodes: number;
    allocatedNodes: number;
    totalGpus: number;
    allocatedGpus: number;
    utilization: number;
  }> {
    const allocatedGpus = Array.from(this.resourcePool.values()).reduce(
      (sum, alloc) => sum + alloc.gpus.length,
      0
    );

    return {
      totalNodes: 100, // Mock value
      allocatedNodes: this.resourcePool.size,
      totalGpus: 400, // Mock value
      allocatedGpus,
      utilization: allocatedGpus / 400,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
