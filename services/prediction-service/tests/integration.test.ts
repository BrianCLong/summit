/**
 * Integration Tests for Prediction Service
 */

import { PredictionEngine } from '../src/core/prediction-engine.js';
import { ModelRegistry } from '../src/core/model-registry.js';
import type { PredictionRequest, PredictionResponse } from '../src/types/index.js';

describe('PredictionEngine Integration', () => {
  let engine: PredictionEngine;
  let registry: ModelRegistry;

  beforeEach(() => {
    engine = new PredictionEngine();
    registry = new ModelRegistry();
  });

  describe('Model Registration and Prediction', () => {
    it('should register and use default models', () => {
      const models = engine.listModels();

      expect(models.length).toBeGreaterThan(0);
      expect(models.some(m => m.id === 'default-arima')).toBe(true);
      expect(models.some(m => m.id === 'default-rf')).toBe(true);
      expect(models.some(m => m.id === 'default-risk')).toBe(true);
    });

    it('should make forecast predictions', async () => {
      const request: PredictionRequest = {
        modelId: 'default-arima',
        modelType: 'forecast',
        features: [
          { timestamp: '2025-01-01', value: 100 },
          { timestamp: '2025-01-02', value: 105 },
          { timestamp: '2025-01-03', value: 110 },
          { timestamp: '2025-01-04', value: 108 },
          { timestamp: '2025-01-05', value: 115 },
        ],
        options: { horizon: 7 },
      };

      const response = await engine.predict(request);

      expect(response.requestId).toBeDefined();
      expect(response.modelId).toBe('default-arima');
      expect(response.predictions).toBeDefined();
      expect(response.metadata.timestamp).toBeInstanceOf(Date);
      expect(response.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should make risk scoring predictions', async () => {
      const request: PredictionRequest = {
        modelId: 'default-risk',
        modelType: 'risk',
        features: [[0.7, 0.5, 0.3], [0.2, 0.8, 0.1]],
      };

      const response = await engine.predict(request);

      expect(response.predictions).toHaveLength(2);
    });

    it('should return model metadata', () => {
      const metadata = engine.getModelMetadata('default-arima');

      expect(metadata).toBeDefined();
      expect(metadata?.id).toBe('default-arima');
      expect(metadata?.type).toBe('forecast');
      expect(metadata?.status).toBe('active');
    });

    it('should throw error for unknown model', async () => {
      const request: PredictionRequest = {
        modelId: 'nonexistent-model',
        modelType: 'forecast',
        features: [],
      };

      await expect(engine.predict(request)).rejects.toThrow('Model not found');
    });
  });

  describe('Model Registry', () => {
    it('should register and retrieve model versions', () => {
      const version = {
        version: '1.0.0',
        model: { predict: () => [] },
        metadata: {
          id: 'test-model',
          name: 'Test Model',
          type: 'classification',
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date(),
          performance: { accuracy: 0.95 },
          status: 'active' as const,
        },
        deployedAt: new Date(),
        performance: { accuracy: 0.95 },
      };

      registry.registerVersion('test-model', version);

      const champion = registry.getChampion('test-model');
      expect(champion).toBeDefined();
      expect(champion?.version).toBe('1.0.0');
    });

    it('should list all versions', () => {
      const v1 = {
        version: '1.0.0',
        model: {},
        metadata: {
          id: 'test-model',
          name: 'Test',
          type: 'test',
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date(),
          performance: {},
          status: 'active' as const,
        },
        deployedAt: new Date(),
        performance: { accuracy: 0.90 },
      };

      const v2 = {
        ...v1,
        version: '2.0.0',
        performance: { accuracy: 0.95 },
      };

      registry.registerVersion('test-model', v1);
      registry.registerVersion('test-model', v2);

      const versions = registry.listVersions('test-model');
      expect(versions).toHaveLength(2);
    });

    it('should promote challenger to champion', () => {
      const v1 = {
        version: '1.0.0',
        model: {},
        metadata: {
          id: 'test-model',
          name: 'Test',
          type: 'test',
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date(),
          performance: {},
          status: 'active' as const,
        },
        deployedAt: new Date(),
        performance: { accuracy: 0.90 },
      };

      const v2 = { ...v1, version: '2.0.0' };

      registry.registerVersion('test-model', v1);
      registry.registerVersion('test-model', v2);

      expect(registry.getChampion('test-model')?.version).toBe('1.0.0');

      registry.promoteToChampion('test-model', '2.0.0');

      expect(registry.getChampion('test-model')?.version).toBe('2.0.0');
    });

    it('should track drift metrics', () => {
      const v1 = {
        version: '1.0.0',
        model: {},
        metadata: {
          id: 'test-model',
          name: 'Test',
          type: 'test',
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date(),
          performance: {},
          status: 'active' as const,
        },
        deployedAt: new Date(),
        performance: {},
      };

      registry.registerVersion('test-model', v1);

      registry.recordDrift('test-model', {
        dataDrift: 0.1,
        conceptDrift: 0.05,
        performanceDrift: 0.02,
        timestamp: new Date(),
      });

      const history = registry.getDriftHistory('test-model');
      expect(history).toHaveLength(1);
      expect(history[0].dataDrift).toBe(0.1);
    });

    it('should detect when retraining is needed', () => {
      const v1 = {
        version: '1.0.0',
        model: {},
        metadata: {
          id: 'test-model',
          name: 'Test',
          type: 'test',
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date(),
          performance: {},
          status: 'active' as const,
        },
        deployedAt: new Date(),
        performance: {},
      };

      registry.registerVersion('test-model', v1);

      // Low drift - no retraining needed
      registry.recordDrift('test-model', {
        dataDrift: 0.1,
        conceptDrift: 0.05,
        performanceDrift: 0.02,
        timestamp: new Date(),
      });

      expect(registry.needsRetraining('test-model')).toBe(false);

      // High drift - retraining needed
      registry.recordDrift('test-model', {
        dataDrift: 0.3,
        conceptDrift: 0.3,
        performanceDrift: 0.2,
        timestamp: new Date(),
      });

      expect(registry.needsRetraining('test-model')).toBe(true);
    });
  });
});

describe('End-to-End Workflow', () => {
  it('should complete full prediction workflow', async () => {
    const engine = new PredictionEngine();
    const registry = new ModelRegistry();

    // 1. List available models
    const models = engine.listModels();
    expect(models.length).toBeGreaterThan(0);

    // 2. Make a prediction
    const forecastRequest: PredictionRequest = {
      modelId: 'default-arima',
      modelType: 'forecast',
      features: Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(2025, 0, i + 1).toISOString(),
        value: 100 + i + Math.random() * 10,
      })),
      options: { horizon: 7, confidenceLevel: 0.95 },
    };

    const forecastResponse = await engine.predict(forecastRequest);
    expect(forecastResponse.predictions).toBeDefined();

    // 3. Record drift metrics
    registry.recordDrift('default-arima', {
      dataDrift: 0.08,
      conceptDrift: 0.05,
      performanceDrift: 0.03,
      timestamp: new Date(),
    });

    // 4. Check if retraining is needed
    const needsRetraining = registry.needsRetraining('default-arima');
    expect(typeof needsRetraining).toBe('boolean');

    console.log('End-to-end workflow completed successfully');
  });
});
