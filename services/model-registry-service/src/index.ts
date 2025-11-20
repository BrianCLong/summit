/**
 * Model Registry Service
 * Central registry for managing ML models, versions, and metadata
 */

import express from 'express';
import { z } from 'zod';
import type { ModelMetadata } from '@intelgraph/deep-learning-core';

const app = express();
app.use(express.json());

// Model registry schema
const ModelRegistryEntrySchema = z.object({
  modelId: z.string(),
  version: z.string(),
  name: z.string(),
  description: z.string().optional(),
  framework: z.enum(['tensorflow', 'pytorch', 'onnx', 'custom']),
  architecture: z.string(),
  taskType: z.enum(['classification', 'regression', 'detection', 'segmentation', 'generation']),
  metrics: z.record(z.string(), z.number()).optional(),
  artifactUrl: z.string(),
  checksum: z.string(),
  modelSize: z.number(),
  parameters: z.number().optional(),
  tags: z.array(z.string()).optional(),
  stage: z.enum(['development', 'staging', 'production', 'archived']),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

type ModelRegistryEntry = z.infer<typeof ModelRegistryEntrySchema>;

// In-memory registry (in production, use PostgreSQL)
const modelRegistry = new Map<string, ModelRegistryEntry[]>();
const deployments = new Map<string, any>();

// ============================================================================
// Model Registration
// ============================================================================

app.post('/api/v1/registry/models', (req, res) => {
  try {
    const entry = ModelRegistryEntrySchema.parse(req.body);

    // Get or create model versions array
    const versions = modelRegistry.get(entry.modelId) || [];

    // Check if version already exists
    if (versions.some((v) => v.version === entry.version)) {
      return res.status(409).json({ error: 'Version already exists' });
    }

    versions.push(entry);
    modelRegistry.set(entry.modelId, versions);

    res.status(201).json({
      message: 'Model registered successfully',
      modelId: entry.modelId,
      version: entry.version,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// Model Retrieval
// ============================================================================

// List all models
app.get('/api/v1/registry/models', (req, res) => {
  const { stage, taskType, framework } = req.query;

  let models = Array.from(modelRegistry.entries()).map(([modelId, versions]) => {
    const latestVersion = versions[versions.length - 1];
    return {
      modelId,
      latestVersion: latestVersion.version,
      name: latestVersion.name,
      framework: latestVersion.framework,
      taskType: latestVersion.taskType,
      stage: latestVersion.stage,
      totalVersions: versions.length,
      updatedAt: latestVersion.updatedAt,
    };
  });

  // Apply filters
  if (stage) {
    models = models.filter((m) => m.stage === stage);
  }
  if (taskType) {
    models = models.filter((m) => m.taskType === taskType);
  }
  if (framework) {
    models = models.filter((m) => m.framework === framework);
  }

  res.json({
    models,
    total: models.length,
  });
});

// Get model details
app.get('/api/v1/registry/models/:modelId', (req, res) => {
  const { modelId } = req.params;
  const versions = modelRegistry.get(modelId);

  if (!versions || versions.length === 0) {
    return res.status(404).json({ error: 'Model not found' });
  }

  const latestVersion = versions[versions.length - 1];

  res.json({
    modelId,
    ...latestVersion,
    versions: versions.map((v) => ({
      version: v.version,
      stage: v.stage,
      createdAt: v.createdAt,
    })),
  });
});

// Get specific version
app.get('/api/v1/registry/models/:modelId/versions/:version', (req, res) => {
  const { modelId, version } = req.params;
  const versions = modelRegistry.get(modelId);

  if (!versions) {
    return res.status(404).json({ error: 'Model not found' });
  }

  const versionEntry = versions.find((v) => v.version === version);

  if (!versionEntry) {
    return res.status(404).json({ error: 'Version not found' });
  }

  res.json(versionEntry);
});

// List all versions
app.get('/api/v1/registry/models/:modelId/versions', (req, res) => {
  const { modelId } = req.params;
  const versions = modelRegistry.get(modelId);

  if (!versions) {
    return res.status(404).json({ error: 'Model not found' });
  }

  res.json({
    modelId,
    versions: versions.map((v) => ({
      version: v.version,
      stage: v.stage,
      metrics: v.metrics,
      createdAt: v.createdAt,
    })),
    total: versions.length,
  });
});

// ============================================================================
// Model Stage Management
// ============================================================================

app.patch('/api/v1/registry/models/:modelId/versions/:version/stage', (req, res) => {
  const { modelId, version } = req.params;
  const { stage } = req.body;

  if (!['development', 'staging', 'production', 'archived'].includes(stage)) {
    return res.status(400).json({ error: 'Invalid stage' });
  }

  const versions = modelRegistry.get(modelId);

  if (!versions) {
    return res.status(404).json({ error: 'Model not found' });
  }

  const versionEntry = versions.find((v) => v.version === version);

  if (!versionEntry) {
    return res.status(404).json({ error: 'Version not found' });
  }

  versionEntry.stage = stage;
  versionEntry.updatedAt = new Date().toISOString();

  res.json({
    message: 'Stage updated successfully',
    modelId,
    version,
    stage,
  });
});

// ============================================================================
// Model Comparison
// ============================================================================

app.post('/api/v1/registry/compare', (req, res) => {
  const { models } = req.body;

  if (!Array.isArray(models) || models.length < 2) {
    return res.status(400).json({ error: 'Provide at least 2 models to compare' });
  }

  const comparison = models.map((spec) => {
    const versions = modelRegistry.get(spec.modelId);
    if (!versions) return null;

    const versionEntry = versions.find((v) => v.version === spec.version);
    if (!versionEntry) return null;

    return {
      modelId: spec.modelId,
      version: spec.version,
      name: versionEntry.name,
      metrics: versionEntry.metrics,
      parameters: versionEntry.parameters,
      modelSize: versionEntry.modelSize,
    };
  }).filter(Boolean);

  res.json({ comparison });
});

// ============================================================================
// Model Search
// ============================================================================

app.get('/api/v1/registry/search', (req, res) => {
  const { q, taskType, minAccuracy } = req.query;

  let results: any[] = [];

  modelRegistry.forEach((versions, modelId) => {
    versions.forEach((version) => {
      // Text search
      if (q && typeof q === 'string') {
        const searchTerm = q.toLowerCase();
        const matchesSearch =
          version.name.toLowerCase().includes(searchTerm) ||
          version.description?.toLowerCase().includes(searchTerm) ||
          version.tags?.some((tag) => tag.toLowerCase().includes(searchTerm));

        if (!matchesSearch) return;
      }

      // Task type filter
      if (taskType && version.taskType !== taskType) return;

      // Min accuracy filter
      if (minAccuracy && typeof minAccuracy === 'string') {
        const min = parseFloat(minAccuracy);
        if (!version.metrics?.accuracy || version.metrics.accuracy < min) return;
      }

      results.push({
        modelId,
        version: version.version,
        name: version.name,
        taskType: version.taskType,
        framework: version.framework,
        metrics: version.metrics,
        stage: version.stage,
      });
    });
  });

  res.json({
    results,
    total: results.length,
  });
});

// ============================================================================
// Model Lineage
// ============================================================================

app.get('/api/v1/registry/models/:modelId/lineage', (req, res) => {
  const { modelId } = req.params;
  const versions = modelRegistry.get(modelId);

  if (!versions) {
    return res.status(404).json({ error: 'Model not found' });
  }

  const lineage = versions.map((v, index) => ({
    version: v.version,
    stage: v.stage,
    createdAt: v.createdAt,
    metrics: v.metrics,
    parentVersion: index > 0 ? versions[index - 1].version : null,
  }));

  res.json({ modelId, lineage });
});

// ============================================================================
// Deployment Tracking
// ============================================================================

app.post('/api/v1/registry/deployments', (req, res) => {
  const { modelId, version, environment, endpoint, replicas } = req.body;

  const deploymentId = `deploy_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const deployment = {
    deploymentId,
    modelId,
    version,
    environment,
    endpoint,
    replicas: replicas || 1,
    status: 'active',
    deployedAt: new Date().toISOString(),
  };

  deployments.set(deploymentId, deployment);

  res.status(201).json({
    message: 'Deployment tracked successfully',
    deployment,
  });
});

app.get('/api/v1/registry/deployments', (req, res) => {
  const { modelId, environment } = req.query;

  let results = Array.from(deployments.values());

  if (modelId) {
    results = results.filter((d) => d.modelId === modelId);
  }

  if (environment) {
    results = results.filter((d) => d.environment === environment);
  }

  res.json({
    deployments: results,
    total: results.length,
  });
});

// ============================================================================
// Statistics
// ============================================================================

app.get('/api/v1/registry/stats', (req, res) => {
  const totalModels = modelRegistry.size;
  const totalVersions = Array.from(modelRegistry.values()).reduce(
    (sum, versions) => sum + versions.length,
    0
  );

  const byStage: Record<string, number> = {};
  const byTaskType: Record<string, number> = {};
  const byFramework: Record<string, number> = {};

  modelRegistry.forEach((versions) => {
    const latest = versions[versions.length - 1];
    byStage[latest.stage] = (byStage[latest.stage] || 0) + 1;
    byTaskType[latest.taskType] = (byTaskType[latest.taskType] || 0) + 1;
    byFramework[latest.framework] = (byFramework[latest.framework] || 0) + 1;
  });

  res.json({
    totalModels,
    totalVersions,
    totalDeployments: deployments.size,
    byStage,
    byTaskType,
    byFramework,
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'model-registry-service',
    modelsRegistered: modelRegistry.size,
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.MODEL_REGISTRY_PORT || 3003;

app.listen(PORT, () => {
  console.log(`Model Registry Service listening on port ${PORT}`);
});

export default app;
