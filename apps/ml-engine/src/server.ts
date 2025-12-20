import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import compression from 'compression';
import { EntityResolutionService } from './services/EntityResolutionService.js';
import { logger } from './utils/logger.js';
import { config } from './config.js';
import { getPgPool, closePgPool } from './utils/db.js';
import { TrainingPipeline } from './training/TrainingPipeline.js';
import {
  ModelBenchmarkingService,
  ABTestingManager,
  ModelRegistry,
  HyperparameterOptimizer,
  RetrainingOrchestrator,
  RealtimeMetricSnapshot,
  ABTestConfig,
  ABTestOutcome,
  HyperparameterOptimizationRequest,
} from './benchmarking/index.js';

const app: Express = express();
const PORT = config.server.port || 4003;

let entityResolutionService: EntityResolutionService;
let benchmarkingService: ModelBenchmarkingService;
let modelRegistry: ModelRegistry;
let retrainingOrchestrator: RetrainingOrchestrator;
let trainingPipeline: TrainingPipeline;
let hyperparameterOptimizer: HyperparameterOptimizer;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.server.allowedOrigins,
    credentials: true,
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP, please try again later',
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(compression() as any);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ml-engine',
    version: process.env.npm_package_version || '1.0.0',
  });
});

async function initializeServices(): Promise<void> {
  try {
    const pool = getPgPool();
    benchmarkingService = new ModelBenchmarkingService(pool);
    modelRegistry = new ModelRegistry(pool);
    trainingPipeline = new TrainingPipeline(pool, benchmarkingService, modelRegistry);
    const abTestingManager = new ABTestingManager(pool, benchmarkingService);
    hyperparameterOptimizer = new HyperparameterOptimizer(
      config.ml.python.pythonExecutable,
      config.ml.python.scriptPath,
    );
    retrainingOrchestrator = new RetrainingOrchestrator(
      benchmarkingService,
      modelRegistry,
      trainingPipeline,
      {
        checkIntervalMs: config.ml.autoTuning.checkIntervalMs,
        defaultDegradationThreshold:
          config.ml.autoTuning.performanceDegradationThreshold,
        defaultEvaluationWindow: config.ml.autoTuning.evaluationWindow,
        defaultMinEvaluations: config.ml.autoTuning.minEvaluations,
        cooldownMs: config.ml.autoTuning.cooldownMs,
      },
    );

    entityResolutionService = new EntityResolutionService(
      trainingPipeline,
      benchmarkingService,
      abTestingManager,
      hyperparameterOptimizer,
      modelRegistry,
      retrainingOrchestrator,
    );

    await entityResolutionService.initialize();
    retrainingOrchestrator.start();

    logger.info('ML services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize ML services:', error);
    process.exit(1);
  }
}

function resolveEngineModelType(engine: string): string {
  const normalized = engine.toLowerCase();
  if (normalized.includes('yolo')) {
    return 'object-detection/yolo';
  }
  if (normalized.includes('whisper')) {
    return 'speech-to-text/whisper';
  }
  if (normalized.includes('clip')) {
    return 'multimodal/clip';
  }
  if (normalized.includes('spacy')) {
    return 'nlp/spacy';
  }
  return normalized;
}

// Entity Resolution API Routes
app.post('/api/entity-resolution/find-duplicates', async (req, res) => {
  try {
    const { entityId, limit = 10, threshold = 0.8 } = req.body;

    if (!entityId) {
      return res.status(400).json({ error: 'entityId is required' });
    }

    const matches = await entityResolutionService.findDuplicates(
      entityId,
      limit,
      threshold,
    );

    res.json({
      entityId,
      matches,
      total: matches.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error finding duplicates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/entity-resolution/bulk-resolve', async (req, res) => {
  try {
    const { entityIds, threshold = 0.8, maxClusters = 100 } = req.body;

    if (!Array.isArray(entityIds) || entityIds.length === 0) {
      return res.status(400).json({ error: 'entityIds array is required' });
    }

    const clusters = await entityResolutionService.bulkResolution(
      entityIds,
      threshold,
      maxClusters,
    );

    res.json({
      clusters,
      totalEntities: entityIds.length,
      totalClusters: clusters.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in bulk resolution:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/entity-resolution/train', async (req, res) => {
  try {
    const { positiveExamples, negativeExamples } = req.body;

    if (!Array.isArray(positiveExamples) || !Array.isArray(negativeExamples)) {
      return res.status(400).json({
        error: 'positiveExamples and negativeExamples arrays are required',
      });
    }

    const result = await entityResolutionService.trainFromFeedback(
      positiveExamples,
      negativeExamples,
    );

    res.json({
      success: true,
      trainingResult: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error training model:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/entity-resolution/similarity', async (req, res) => {
  try {
    const { entity1Id, entity2Id } = req.body;

    if (!entity1Id || !entity2Id) {
      return res.status(400).json({
        error: 'entity1Id and entity2Id are required',
      });
    }

    const similarity = await entityResolutionService.calculateSimilarity(
      entity1Id,
      entity2Id,
    );

    res.json({
      entity1Id,
      entity2Id,
      similarity,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error calculating similarity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/entity-resolution/metrics', async (req, res) => {
  try {
    const metrics = await entityResolutionService.getPerformanceMetrics();
    const realtime = entityResolutionService.getRealtimeMetrics('entity-resolution');

    res.json({
      metrics,
      realtime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/entity-resolution/feedback', async (req, res) => {
  try {
    const { entity1Id, entity2Id, isMatch, confidence, userId } = req.body;

    if (!entity1Id || !entity2Id || typeof isMatch !== 'boolean') {
      return res.status(400).json({
        error: 'entity1Id, entity2Id, and isMatch are required',
      });
    }

    await entityResolutionService.recordFeedback({
      entity1Id,
      entity2Id,
      isMatch,
      confidence: confidence || 1.0,
      userId,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      message: 'Feedback recorded successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error recording feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Embeddings endpoints
app.post('/api/embeddings/encode', async (req, res) => {
  try {
    const { texts, modelName = 'all-MiniLM-L6-v2' } = req.body;

    if (!Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({ error: 'texts array is required' });
    }

    const embeddings = await entityResolutionService.getSemanticEmbeddings(
      texts,
      modelName,
    );

    res.json({
      embeddings,
      count: texts.length,
      modelName,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error encoding texts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/embeddings/similarity', async (req, res) => {
  try {
    const { text1, text2, modelName = 'all-MiniLM-L6-v2' } = req.body;

    if (!text1 || !text2) {
      return res.status(400).json({ error: 'text1 and text2 are required' });
    }

    const similarity =
      await entityResolutionService.calculateSemanticSimilarity(
        text1,
        text2,
        modelName,
      );

    res.json({
      text1,
      text2,
      similarity,
      modelName,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error calculating text similarity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Batch processing endpoints
app.post('/api/batch/entity-resolution', async (req, res) => {
  try {
    const { batchId, entities, config: batchConfig } = req.body;

    if (!batchId || !Array.isArray(entities)) {
      return res.status(400).json({
        error: 'batchId and entities array are required',
      });
    }

    entityResolutionService
      .processBatch(batchId, entities, batchConfig)
      .catch((error) => logger.error(`Batch ${batchId} failed:`, error));

    res.json({
      batchId,
      status: 'started',
      entityCount: entities.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error starting batch processing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/batch/:batchId/status', async (req, res) => {
  try {
    const { batchId } = req.params;

    const status = await entityResolutionService.getBatchStatus(batchId);

    res.json({
      batchId,
      ...status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting batch status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Model management endpoints
app.get('/api/models', async (req, res) => {
  try {
    const models = await entityResolutionService.getAvailableModels();

    res.json({
      models,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting available models:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/models/history/:modelType', async (req, res) => {
  try {
    const versions = await modelRegistry.listVersions(req.params.modelType, 50);
    res.json({ versions });
  } catch (error) {
    logger.error('Error fetching model history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/models/:modelVersionId/activate', async (req, res) => {
  try {
    const { modelVersionId } = req.params;
    await trainingPipeline.activateModel(modelVersionId);
    res.json({ success: true, modelVersionId });
  } catch (error) {
    logger.error('Error activating model:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/models/:modelType/rollback', async (req, res) => {
  try {
    const previous = await modelRegistry.rollback(req.params.modelType);
    res.json({ success: Boolean(previous), previous });
  } catch (error) {
    logger.error('Error rolling back model:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/models/:modelVersionId/load', async (req, res) => {
  try {
    const { modelVersionId } = req.params;
    await entityResolutionService.loadModel(modelVersionId);

    res.json({
      success: true,
      modelVersionId,
      message: 'Model activated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error loading model:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// AB testing endpoints
app.post('/api/models/ab-tests', async (req, res) => {
  try {
    const config = req.body as ABTestConfig;
    await entityResolutionService.createABTest(config);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error creating AB test:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/models/ab-tests/:experiment/assign', async (req, res) => {
  try {
    const { experiment } = req.params;
    const { subjectId } = req.body;

    if (!subjectId) {
      return res.status(400).json({ error: 'subjectId is required' });
    }

    const assignment = await entityResolutionService.assignToABTest(
      experiment,
      subjectId,
    );

    res.json({ assignment });
  } catch (error) {
    logger.error('Error assigning AB test variant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/models/ab-tests/:experiment/outcome', async (req, res) => {
  try {
    const outcome: ABTestOutcome = req.body;
    if (!outcome.experimentId || !outcome.variantId || !outcome.subjectId) {
      return res.status(400).json({ error: 'experimentId, variantId, subjectId required' });
    }
    await entityResolutionService.recordABTestOutcome(outcome);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error recording AB test outcome:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/models/ab-tests/:experiment/report', async (req, res) => {
  try {
    const report = await entityResolutionService.getABTestReport(
      req.params.experiment,
    );
    res.json({ report });
  } catch (error) {
    logger.error('Error fetching AB test report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Hyperparameter optimization
app.post('/api/models/hyperparameters/optimize', async (req, res) => {
  try {
    const request = req.body as HyperparameterOptimizationRequest;
    if (!request.modelType) {
      return res.status(400).json({ error: 'modelType is required' });
    }

    const result = await entityResolutionService.optimizeHyperparameters(request);
    res.json({ result });
  } catch (error) {
    logger.error('Error optimizing hyperparameters:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// External engine benchmarking endpoints
app.post('/api/engines/:engineName/benchmark', async (req, res) => {
  try {
    const { engineName } = req.params;
    const payload = req.body;
    const modelType = payload.modelType || resolveEngineModelType(engineName);

    if (!payload.modelVersion || !payload.metrics) {
      return res
        .status(400)
        .json({ error: 'modelVersion and metrics are required' });
    }

    await entityResolutionService.recordExternalEngineBenchmark({
      modelVersion: payload.modelVersion,
      modelType,
      metrics: payload.metrics,
      dataset: payload.dataset,
      context: payload.context,
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Error recording external benchmark:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/engines/:engineName/inference', async (req, res) => {
  try {
    const { engineName } = req.params;
    const payload = req.body;
    const modelType = payload.modelType || resolveEngineModelType(engineName);

    if (!payload.modelVersion || payload.latencyMs === undefined) {
      return res
        .status(400)
        .json({ error: 'modelVersion and latencyMs are required' });
    }

    await entityResolutionService.recordExternalInference({
      modelVersion: payload.modelVersion,
      modelType,
      latencyMs: payload.latencyMs,
      success: payload.success ?? true,
      inputType: payload.inputType || 'graph',
      metadata: payload.metadata,
      metrics: payload.metrics,
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Error recording external inference:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Real-time metrics endpoints
app.get('/api/models/metrics/realtime', (req, res) => {
  try {
    const modelType = req.query.modelType as string | undefined;
    const metrics = entityResolutionService.getRealtimeMetrics(modelType);
    res.json({ metrics });
  } catch (error) {
    logger.error('Error retrieving realtime metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/models/metrics/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (snapshots: RealtimeMetricSnapshot[]) => {
    res.write(`data: ${JSON.stringify({ snapshots })}\n\n`);
  };

  const listener = (snapshots: RealtimeMetricSnapshot[]) => {
    send(snapshots);
  };

  const initial = entityResolutionService.getRealtimeMetrics();
  send(initial);
  benchmarkingService.onUpdate(listener);

  req.on('close', () => {
    benchmarkingService.removeUpdateListener(listener);
    res.end();
  });
});

// Error handling middleware
app.use(
  (
    error: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    logger.error('Unhandled error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  },
);

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.originalUrl,
  });
});

async function startServer() {
  try {
    await initializeServices();

    const server = app.listen(PORT, () => {
      logger.info(`ML Engine API server running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });

    const shutdown = async () => {
      logger.info('Shutdown signal received, closing services');
      retrainingOrchestrator?.stop();
      server.close(async () => {
        await closePgPool();
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

export { app };
