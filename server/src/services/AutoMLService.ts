
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';

/**
 * AutoMLService
 * Simulates an MLOps pipeline for model training, versioning, and management.
 * Uses file-based persistence for MVP durability.
 */

interface ModelVersion {
  id: string;
  modelId: string;
  version: string;
  status: 'training' | 'ready' | 'failed' | 'deployed' | 'archived';
  metrics: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1?: number;
    loss?: number;
  };
  hyperparameters: Record<string, any>;
  datasetId: string;
  createdAt: string;
  updatedAt: string;
}

interface ModelDefinition {
  id: string;
  name: string;
  type: 'classification' | 'regression' | 'clustering' | 'anomaly_detection' | 'nlp' | 'vision';
  description: string;
  versions: ModelVersion[];
  defaultVersionId?: string;
  createdAt: string;
}

interface TrainingJob {
  id: string;
  modelId: string;
  datasetId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime: string;
  endTime?: string;
  logs: string[];
}

export class AutoMLService {
  private models: Map<string, ModelDefinition> = new Map();
  private jobs: Map<string, TrainingJob> = new Map();
  private storageDir: string;
  private modelsFile: string;
  private jobsFile: string;

  constructor(storagePath = './data/automl') {
    this.storageDir = path.resolve(storagePath);
    this.modelsFile = path.join(this.storageDir, 'models.json');
    this.jobsFile = path.join(this.storageDir, 'jobs.json');

    this.initializeStorage();
    this.loadState();
  }

  private initializeStorage() {
    if (!fs.existsSync(this.storageDir)) {
      try {
        fs.mkdirSync(this.storageDir, { recursive: true });
      } catch (err) {
        // Fallback for environments where we can't write to ./data
        this.storageDir = '/tmp/automl';
        fs.mkdirSync(this.storageDir, { recursive: true });
      }
    }
  }

  private loadState() {
    try {
      if (fs.existsSync(this.modelsFile)) {
        const data = JSON.parse(fs.readFileSync(this.modelsFile, 'utf-8'));
        this.models = new Map(data.map((m: ModelDefinition) => [m.id, m]));
      } else {
        this.initializeDefaultModels();
      }

      if (fs.existsSync(this.jobsFile)) {
        const data = JSON.parse(fs.readFileSync(this.jobsFile, 'utf-8'));
        this.jobs = new Map(data.map((j: TrainingJob) => [j.id, j]));
      }
    } catch (error) {
      console.error('Failed to load AutoML state:', error);
      this.initializeDefaultModels();
    }
  }

  private saveState() {
    try {
      fs.writeFileSync(this.modelsFile, JSON.stringify(Array.from(this.models.values()), null, 2));
      fs.writeFileSync(this.jobsFile, JSON.stringify(Array.from(this.jobs.values()), null, 2));
    } catch (error) {
      console.error('Failed to save AutoML state:', error);
    }
  }

  private initializeDefaultModels() {
    if (this.models.size === 0) {
      this.createModel({
        name: 'Entity Classifier',
        type: 'classification',
        description: 'Classifies entities into person, organization, location, etc.',
      });
      this.createModel({
        name: 'Threat Level Predictor',
        type: 'regression',
        description: 'Predicts the threat level (0-1) of a given entity.',
      });
    }
  }

  /**
   * Register a new model definition
   */
  createModel(params: { name: string; type: ModelDefinition['type']; description: string }): ModelDefinition {
    const id = uuidv4();
    const model: ModelDefinition = {
      id,
      name: params.name,
      type: params.type,
      description: params.description,
      versions: [],
      createdAt: new Date().toISOString(),
    };
    this.models.set(id, model);
    this.saveState();
    return model;
  }

  /**
   * Get a model by ID
   */
  getModel(id: string): ModelDefinition | undefined {
    return this.models.get(id);
  }

  /**
   * List all models
   */
  listModels(): ModelDefinition[] {
    return Array.from(this.models.values());
  }

  /**
   * Start a training job for a model
   */
  async startTraining(modelId: string, datasetId: string, hyperparameters: Record<string, any> = {}): Promise<TrainingJob> {
    const model = this.models.get(modelId);
    if (!model) throw new Error(`Model ${modelId} not found`);

    const jobId = uuidv4();
    const job: TrainingJob = {
      id: jobId,
      modelId,
      datasetId,
      status: 'pending',
      progress: 0,
      startTime: new Date().toISOString(),
      logs: ['Job initialized'],
    };
    this.jobs.set(jobId, job);
    this.saveState();

    // Simulate async training process
    this.runTrainingSimulation(jobId, hyperparameters);

    return job;
  }

  private async runTrainingSimulation(jobId: string, hyperparameters: Record<string, any>) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'running';
    job.logs.push('Starting training...');
    this.saveState();

    // Simulate steps
    const steps = 5;
    for (let i = 1; i <= steps; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s per step
      job.progress = (i / steps) * 100;
      job.logs.push(`Epoch ${i}/${steps} completed. Loss: ${(1 / i).toFixed(4)}`);
      this.saveState();
    }

    job.status = 'completed';
    job.endTime = new Date().toISOString();
    job.logs.push('Training completed successfully.');

    // Create a new model version
    const model = this.models.get(job.modelId);
    if (model) {
      const versionId = uuidv4();
      const version: ModelVersion = {
        id: versionId,
        modelId: job.modelId,
        version: `v${model.versions.length + 1}.0.0`,
        status: 'ready',
        metrics: {
          accuracy: 0.8 + Math.random() * 0.15,
          precision: 0.8 + Math.random() * 0.15,
          recall: 0.8 + Math.random() * 0.15,
          f1: 0.8 + Math.random() * 0.15,
          loss: 0.2 * Math.random(),
        },
        hyperparameters,
        datasetId: job.datasetId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      model.versions.push(version);

      // Auto-deploy if it's the best model (heuristic)
      if (!model.defaultVersionId || (version.metrics.f1 || 0) > (this.getVersion(model.id, model.defaultVersionId)?.metrics.f1 || 0)) {
        model.defaultVersionId = versionId;
        version.status = 'deployed';
        job.logs.push(`New version ${version.version} deployed as default.`);
      }
      this.saveState();
    }
  }

  getVersion(modelId: string, versionId: string): ModelVersion | undefined {
    const model = this.models.get(modelId);
    return model?.versions.find(v => v.id === versionId);
  }

  /**
   * Get job status
   */
  getJob(jobId: string): TrainingJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Run A/B test between two model versions
   */
  async runABTest(modelId: string, versionAId: string, versionBId: string, durationSeconds: number = 5): Promise<any> {
     // Simulate A/B test results
     const model = this.models.get(modelId);
     if (!model) throw new Error('Model not found');

     const verA = model.versions.find(v => v.id === versionAId);
     const verB = model.versions.find(v => v.id === versionBId);

     if (!verA || !verB) throw new Error('Versions not found');

     return {
       experimentId: uuidv4(),
       status: 'completed',
       results: {
         versionA: {
            id: versionAId,
            version: verA.version,
            requests: 1000,
            avgLatency: 50 + Math.random() * 20,
            errorRate: Math.random() * 0.01,
         },
         versionB: {
            id: versionBId,
            version: verB.version,
            requests: 1000,
            avgLatency: 45 + Math.random() * 20, // Maybe newer is faster?
            errorRate: Math.random() * 0.01,
         },
         winner: Math.random() > 0.5 ? 'versionA' : 'versionB',
       }
     }
  }
}

export const autoMLService = new AutoMLService();
