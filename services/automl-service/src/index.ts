import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { AutoMLOrchestrator } from '@intelgraph/automl';
import { StudyManager } from '@intelgraph/hyperopt';
import { MetaLearningEngine } from '@intelgraph/meta-learning';

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize services
const automlOrchestrator = new AutoMLOrchestrator();
const studyManager = new StudyManager();
const metaLearning = new MetaLearningEngine();

// Routes

/**
 * Health check
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'automl-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Create AutoML job
 */
app.post('/api/v1/automl/jobs', async (req: Request, res: Response) => {
  try {
    const config = req.body;
    const job = await automlOrchestrator.createJob(config);

    res.status(201).json({
      success: true,
      data: job,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get AutoML job status
 */
app.get('/api/v1/automl/jobs/:jobId', (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = automlOrchestrator.getJob(jobId);

    if (!job) {
      res.status(404).json({
        success: false,
        error: 'Job not found',
      });
      return;
    }

    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Cancel AutoML job
 */
app.post('/api/v1/automl/jobs/:jobId/cancel', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const cancelled = await automlOrchestrator.cancelJob(jobId);

    res.json({
      success: true,
      data: { cancelled },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * List all AutoML jobs
 */
app.get('/api/v1/automl/jobs', (_req: Request, res: Response) => {
  try {
    const jobs = automlOrchestrator.listJobs();

    res.json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Create hyperparameter optimization study
 */
app.post('/api/v1/hyperopt/studies', (req: Request, res: Response) => {
  try {
    const { name, config, optimizer = 'bayesian' } = req.body;
    const study = studyManager.createStudy(name, config, optimizer);

    res.status(201).json({
      success: true,
      data: study,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Suggest next hyperparameter configuration
 */
app.post('/api/v1/hyperopt/studies/:studyId/suggest', async (req: Request, res: Response) => {
  try {
    const { studyId } = req.params;
    const suggestion = await studyManager.suggest(studyId);

    res.json({
      success: true,
      data: suggestion,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Report trial result
 */
app.post('/api/v1/hyperopt/studies/:studyId/trials', (req: Request, res: Response) => {
  try {
    const { studyId } = req.params;
    const { parameters, metrics, status } = req.body;

    const trial = studyManager.reportTrial(studyId, parameters, metrics, status);

    res.status(201).json({
      success: true,
      data: trial,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get study details
 */
app.get('/api/v1/hyperopt/studies/:studyId', (req: Request, res: Response) => {
  try {
    const { studyId } = req.params;
    const study = studyManager.getStudy(studyId);

    if (!study) {
      res.status(404).json({
        success: false,
        error: 'Study not found',
      });
      return;
    }

    res.json({
      success: true,
      data: study,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get optimization history
 */
app.get('/api/v1/hyperopt/studies/:studyId/history', (req: Request, res: Response) => {
  try {
    const { studyId } = req.params;
    const history = studyManager.getHistory(studyId);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get meta-learning recommendations
 */
app.post('/api/v1/meta-learning/recommend', (req: Request, res: Response) => {
  try {
    const { metaFeatures } = req.body;
    const recommendation = metaLearning.recommendAlgorithm(metaFeatures);

    res.json({
      success: true,
      data: recommendation,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Predict algorithm performance
 */
app.post('/api/v1/meta-learning/predict', (req: Request, res: Response) => {
  try {
    const { algorithm, metaFeatures } = req.body;
    const prediction = metaLearning.predictPerformance(algorithm, metaFeatures);

    res.json({
      success: true,
      data: { algorithm, expectedPerformance: prediction },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get warm start suggestions
 */
app.post('/api/v1/meta-learning/warm-start', (req: Request, res: Response) => {
  try {
    const { metaFeatures } = req.body;
    const suggestions = metaLearning.suggestWarmStart(metaFeatures);

    res.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Error handling
app.use((err: Error, _req: Request, res: Response) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`AutoML Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API Docs: http://localhost:${PORT}/api/v1/docs`);
});

export default app;
