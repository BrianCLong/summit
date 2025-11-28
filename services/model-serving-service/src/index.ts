/**
 * Model Serving Service
 * Production-grade model inference with runtime routing, versioning, batching, monitoring, and drift detection.
 */

import express from 'express';
import { z } from 'zod';
import {
  DeploymentConfigSchema,
  InferenceRequestSchema,
  type InferenceRequest,
  type DeploymentConfig,
} from '@intelgraph/deep-learning-core';
import { BatchProcessor } from './batching.js';
import { ModelRegistry } from './registry.js';
import { RuntimeRouter } from './runtime.js';
import { OptimizationProfile, RuntimeConfig } from './types.js';

const app = express();
app.use(express.json());

const runtimeRouter = new RuntimeRouter();
const registry = new ModelRegistry();
const batchProcessor = new BatchProcessor(runtimeRouter, registry);

const RuntimeConfigSchema = z.object({
  type: z.enum(['tensorflow', 'onnx', 'mock']),
  endpoint: z.string().optional(),
  modelSignature: z.string().optional(),
  timeoutMs: z.number().optional(),
});

const OptimizationSchema = z.object({
  targetLatencyMs: z.number().optional(),
  preferBatching: z.boolean().optional(),
  quantization: z.string().optional(),
  cacheTtlSeconds: z.number().optional(),
  warmTargets: z.number().optional(),
  hardwareProfile: z.string().optional(),
});

const DeploySchema = z.object({
  config: DeploymentConfigSchema,
  runtime: RuntimeConfigSchema,
  optimization: OptimizationSchema.optional(),
  metadata: z.record(z.any()).optional(),
  status: z.enum(['active', 'shadow', 'retired']).optional(),
});

const PredictionSchema = InferenceRequestSchema.extend({
  abTestId: z.string().optional(),
});

const BatchPredictionSchema = z.object({
  requests: z.array(PredictionSchema).min(1),
});

const AbTestSchema = z.object({
  modelId: z.string(),
  name: z.string(),
  targetMetric: z.string().optional(),
  variants: z
    .array(
      z.object({
        version: z.string(),
        weight: z.number().positive(),
        isShadow: z.boolean().optional(),
      }),
    )
    .min(1),
});

app.post('/api/v1/models/deploy', (req, res) => {
  try {
    const payload = DeploySchema.parse(req.body);
    const deployed = registry.deploy({
      modelId: payload.config.modelId,
      version: payload.config.version,
      config: payload.config as DeploymentConfig,
      runtime: payload.runtime as RuntimeConfig,
      optimization: payload.optimization as OptimizationProfile | undefined,
      metadata: payload.metadata,
      status: payload.status,
    });

    res.status(201).json({
      message: 'Model deployed successfully',
      deployment: deployed,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/v1/models/:modelId/promote', (req, res) => {
  const { modelId } = req.params;
  const { version } = req.body as { version?: string };
  if (!version) return res.status(400).json({ error: 'version is required' });

  const promoted = registry.promote(modelId, version);
  if (!promoted) return res.status(404).json({ error: 'Model version not found' });

  res.json({ message: 'Version promoted', modelId, version });
});

app.get('/api/v1/models', (_req, res) => {
  res.json({ models: registry.listModels() });
});

app.get('/api/v1/models/:modelId/versions', (req, res) => {
  const { modelId } = req.params;
  res.json({ versions: registry.listVersions(modelId) });
});

app.post('/api/v1/models/:modelId/ab-tests', (req, res) => {
  try {
    const payload = AbTestSchema.parse(req.body);
    if (payload.modelId !== req.params.modelId) {
      return res.status(400).json({ error: 'modelId in path and body must match' });
    }

    const test = registry.createAbTest(payload.modelId, payload);
    if (!test) return res.status(404).json({ error: 'Model not found' });

    res.status(201).json({ abTest: test });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/v1/predict', async (req, res) => {
  try {
    const payload = PredictionSchema.parse(req.body);
    const version = registry.selectVersion(payload.modelId, payload.version, payload.abTestId);

    if (!version) return res.status(404).json({ error: 'Model version not found' });

    const response = await batchProcessor.enqueue(
      payload.modelId,
      version.version,
      version.runtime,
      payload as InferenceRequest,
      version.optimization,
      payload.abTestId,
    );

    res.json({ response, version: version.version, runtime: version.runtime.type });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/v1/predict/batch', async (req, res) => {
  try {
    const payload = BatchPredictionSchema.parse(req.body);
    const results = await Promise.all(
      payload.requests.map(async (item) => {
        const version = registry.selectVersion(item.modelId, item.version, item.abTestId);
        if (!version) throw new Error(`Model ${item.modelId} not deployed`);

        const response = await batchProcessor.enqueue(
          item.modelId,
          version.version,
          version.runtime,
          item as InferenceRequest,
          version.optimization,
          item.abTestId,
        );

        return { modelId: item.modelId, version: version.version, response };
      }),
    );

    res.json({ results });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/v1/models/:modelId/monitoring', (req, res) => {
  const { modelId } = req.params;
  const metrics = registry.getMonitoring(modelId);
  if (metrics.length === 0) return res.status(404).json({ error: 'Model not found' });

  res.json({ modelId, metrics });
});

app.get('/api/v1/models/:modelId/drift', (req, res) => {
  const { modelId } = req.params;
  const signals = registry.getDriftSignals(modelId);
  if (signals.length === 0) return res.status(404).json({ error: 'Model not found' });

  res.json({ modelId, signals });
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'model-serving-service',
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.MODEL_SERVING_PORT || 3002;

app.listen(PORT, () => {
  console.log(`Model Serving Service listening on port ${PORT}`);
});

export default app;
