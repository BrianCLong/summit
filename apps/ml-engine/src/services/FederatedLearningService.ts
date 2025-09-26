import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';

import { config } from '../config';
import { logger } from '../utils/logger';
import metrics, { recordFederatedTrainingFailure, recordFederatedTrainingSuccess } from '../utils/metrics';

export interface FederatedClientExample {
  features: Record<string, number> | number[];
  label: number | boolean;
  weight?: number;
}

export interface FederatedClientConfig {
  tenantId: string;
  examples: FederatedClientExample[];
}

export interface FederatedTrainingRequest {
  clients: FederatedClientConfig[];
  rounds?: number;
  batchSize?: number;
  learningRate?: number;
  modelType?: string;
}

export interface FederatedTrainingMetrics {
  jobId: string;
  roundsCompleted: number;
  trainingLossHistory: number[];
  globalMetrics: Record<string, number>;
  clientExampleCounts: Record<string, number>;
  timestamp: string;
  modelPath: string;
}

export interface FederatedTrainingJob {
  jobId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt: string;
  completedAt?: string;
  metrics?: FederatedTrainingMetrics;
  error?: string;
}

export class FederatedLearningService {
  private readonly jobs: Map<string, FederatedTrainingJob> = new Map();
  private readonly workspace: string;

  constructor() {
    this.workspace = path.resolve(config.federatedLearning.workspace);
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.workspace, { recursive: true });
  }

  getJob(jobId: string): FederatedTrainingJob | undefined {
    const job = this.jobs.get(jobId);
    return job ? { ...job, metrics: job.metrics ? { ...job.metrics } : undefined } : undefined;
  }

  async trainFederatedModel(request: FederatedTrainingRequest): Promise<FederatedTrainingJob> {
    if (!request.clients || request.clients.length === 0) {
      throw new Error('Federated training requires at least one client');
    }

    const sanitizedClients = request.clients.map((client) => ({
      tenantId: client.tenantId,
      examples: client.examples.filter((example) => example && example.features !== undefined),
    }));

    const exampleCounts = sanitizedClients.map((client) => client.examples.length);
    if (exampleCounts.some((count) => count === 0)) {
      throw new Error('Each federated client must provide at least one example');
    }

    const featureLength = this.getFeatureLength(sanitizedClients[0].examples[0].features);
    this.assertConsistentFeatureShape(sanitizedClients, featureLength);

    const jobId = randomUUID();
    const jobWorkspace = path.join(this.workspace, jobId);
    await fs.mkdir(jobWorkspace, { recursive: true });

    const inputPath = path.join(jobWorkspace, 'config.json');
    const metricsPath = path.join(jobWorkspace, 'metrics.json');
    const modelPath = path.join(jobWorkspace, 'global_model.h5');

    const configPayload = {
      jobId,
      modelType: request.modelType || config.federatedLearning.modelType,
      rounds: request.rounds ?? config.federatedLearning.defaultRounds,
      batchSize: request.batchSize ?? config.federatedLearning.defaultBatchSize,
      learningRate: request.learningRate ?? config.federatedLearning.defaultLearningRate,
      clients: sanitizedClients.map((client) => ({
        tenantId: client.tenantId,
        examples: client.examples.map((example) => ({
          features: this.normalizeFeatures(example.features, featureLength),
          label: this.normalizeLabel(example.label),
          weight: example.weight ?? 1,
        })),
      })),
      output: {
        metricsPath,
        modelPath,
      },
    };

    await fs.writeFile(inputPath, JSON.stringify(configPayload, null, 2));

    const job: FederatedTrainingJob = {
      jobId,
      status: 'RUNNING',
      startedAt: new Date().toISOString(),
    };
    this.jobs.set(jobId, job);

    metrics.federatedTrainingInFlight.inc();
    const startTime = Date.now();

    try {
      const pythonScript = path.join(config.ml.python.scriptPath, 'federated_training.py');
      await this.runPythonScript(pythonScript, [inputPath, metricsPath, modelPath]);

      const metricsContent = await fs.readFile(metricsPath, 'utf-8');
      const parsedMetrics = JSON.parse(metricsContent) as FederatedTrainingMetrics;
      const exampleCount = Object.values(parsedMetrics.clientExampleCounts || {}).reduce(
        (total, value) => total + value,
        0,
      );

      job.status = 'COMPLETED';
      job.completedAt = new Date().toISOString();
      job.metrics = {
        ...parsedMetrics,
        modelPath,
      };
      this.jobs.set(jobId, job);

      recordFederatedTrainingSuccess({
        rounds: parsedMetrics.roundsCompleted,
        exampleCount,
        durationMs: Date.now() - startTime,
      });

      return { ...job, metrics: { ...job.metrics } };
    } catch (error) {
      logger.error('Federated training failed', { error });
      recordFederatedTrainingFailure();
      job.status = 'FAILED';
      job.completedAt = new Date().toISOString();
      job.error = error instanceof Error ? error.message : 'Unknown error';
      this.jobs.set(jobId, job);
      throw error;
    } finally {
      metrics.federatedTrainingInFlight.dec();
    }
  }

  private async runPythonScript(scriptPath: string, args: string[]): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const processArgs = [scriptPath, ...args];
      const pythonProcess = spawn(config.ml.python.pythonExecutable, processArgs, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stderr = '';
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(stderr || `Python process exited with code ${code}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  private getFeatureLength(features: Record<string, number> | number[]): number {
    if (Array.isArray(features)) {
      return features.length;
    }

    const keys = Object.keys(features);
    if (!keys.length) {
      throw new Error('Client example features must not be empty');
    }

    return keys.length;
  }

  private normalizeFeatures(
    features: Record<string, number> | number[],
    expectedLength: number,
  ): number[] {
    if (Array.isArray(features)) {
      if (features.length !== expectedLength) {
        throw new Error('All examples must share the same feature length');
      }
      return features.map((value) => Number(value));
    }

    const orderedKeys = Object.keys(features).sort();
    if (orderedKeys.length !== expectedLength) {
      throw new Error('All examples must share the same feature length');
    }

    return orderedKeys.map((key) => Number(features[key] ?? 0));
  }

  private normalizeLabel(label: number | boolean | undefined): number {
    if (typeof label === 'boolean') {
      return label ? 1 : 0;
    }

    if (label === undefined || label === null) {
      throw new Error('Each example must include a label');
    }

    return Number(label);
  }

  private assertConsistentFeatureShape(
    clients: { examples: FederatedClientExample[] }[],
    expectedLength: number,
  ): void {
    for (const client of clients) {
      for (const example of client.examples) {
        this.normalizeFeatures(example.features, expectedLength);
      }
    }
  }
}

export const federatedLearningService = new FederatedLearningService();
