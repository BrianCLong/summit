/**
 * MLOps Service
 * REST API for comprehensive MLOps platform
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import {
  ModelRegistry,
  TrainingOrchestrator,
  FeatureStore,
  type ModelRegistryConfig,
  type FeatureStoreConfig,
} from '@intelgraph/mlops-platform';
import { ModelServer } from '@intelgraph/model-serving';
import { DriftDetector } from '@intelgraph/model-monitoring';
import { ExplainabilityEngine } from '@intelgraph/model-explainability';
import { AutoMLEngine } from '@intelgraph/training-orchestration';

const app = express();
const PORT = process.env.MLOPS_SERVICE_PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// Initialize core components
const modelRegistryConfig: ModelRegistryConfig = {
  backend: 'postgresql',
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/mlops',
  artifactStore: {
    type: 's3',
    bucket: process.env.MODEL_ARTIFACTS_BUCKET || 'mlops-models',
  },
};

const featureStoreConfig: FeatureStoreConfig = {
  online: {
    enabled: true,
    backend: 'redis',
    ttl: 3600,
    config: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
    },
  },
  offline: {
    enabled: true,
    backend: 's3',
    config: {
      bucket: process.env.FEATURE_STORE_BUCKET || 'mlops-features',
    },
  },
};

const modelRegistry = new ModelRegistry(modelRegistryConfig);
const trainingOrchestrator = new TrainingOrchestrator();
const featureStore = new FeatureStore(featureStoreConfig);
const modelServer = new ModelServer();
const explainabilityEngine = new ExplainabilityEngine();

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'mlops',
    timestamp: new Date().toISOString(),
  });
});

// Model Registry API
app.post('/api/v1/models', async (req, res) => {
  try {
    const model = await modelRegistry.registerModel(req.body);
    res.status(201).json(model);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/v1/models', async (req, res) => {
  try {
    const models = await modelRegistry.searchModels(req.query);
    res.json(models);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/v1/models/:id', async (req, res) => {
  try {
    const model = await modelRegistry.getModel(req.params.id);
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }
    res.json(model);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Training API
app.post('/api/v1/training/submit', async (req, res) => {
  try {
    const jobId = await trainingOrchestrator.submitTraining(req.body);
    res.status(201).json({ jobId });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/v1/training/:runId', async (req, res) => {
  try {
    const run = await trainingOrchestrator.getTrainingRun(req.params.runId);
    if (!run) {
      return res.status(404).json({ error: 'Training run not found' });
    }
    res.json(run);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/v1/training/:runId/cancel', async (req, res) => {
  try {
    await trainingOrchestrator.cancelTraining(req.params.runId);
    res.json({ status: 'cancelled' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Feature Store API
app.post('/api/v1/features', async (req, res) => {
  try {
    const feature = await featureStore.registerFeature(req.body);
    res.status(201).json(feature);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/v1/features/write', async (req, res) => {
  try {
    await featureStore.batchWrite(req.body.writes);
    res.json({ status: 'success' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/v1/features/read', async (req, res) => {
  try {
    const { entityIds, featureIds } = req.body;
    const vectors = await featureStore.batchRead(entityIds, featureIds);
    res.json(vectors);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Model Serving API
app.post('/api/v1/deployments', async (req, res) => {
  try {
    const deployment = await modelServer.deploy(req.body);
    res.status(201).json(deployment);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/v1/predict', async (req, res) => {
  try {
    const prediction = await modelServer.predict(req.body);
    res.json(prediction);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/v1/deployments/:id/scale', async (req, res) => {
  try {
    await modelServer.scale(req.params.id, req.body.replicas);
    res.json({ status: 'scaling' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Explainability API
app.post('/api/v1/explain', async (req, res) => {
  try {
    const explanation = await explainabilityEngine.explain(req.body);
    res.json(explanation);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/v1/models/:id/global-explanation', async (req, res) => {
  try {
    const explanation = await explainabilityEngine.getGlobalExplanation(req.params.id);
    res.json(explanation);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Metrics and Monitoring
app.get('/api/v1/metrics', (req, res) => {
  res.json({
    models: {
      total: 0,
      production: 0,
      staging: 0,
    },
    training: {
      active: 0,
      completed: 0,
      failed: 0,
    },
    deployments: {
      active: 0,
      healthy: 0,
      degraded: 0,
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`MLOps Service listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export default app;
