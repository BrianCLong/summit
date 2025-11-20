/**
 * Model Training Service
 */

import express from 'express';
import bodyParser from 'body-parser';
import { TrainingPipeline } from './pipelines/training-pipeline.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(bodyParser.json());

/**
 * POST /train - Train a new model
 */
app.post('/api/v1/train', async (req, res) => {
  try {
    const { data, config, modelType } = req.body;

    if (!data || !config) {
      res.status(400).json({ error: 'data and config are required' });
      return;
    }

    const pipeline = new TrainingPipeline(config);

    // Model factory placeholder
    const modelFactory = (params?: Record<string, unknown>) => {
      // Would instantiate appropriate model based on modelType
      return { fit: () => {}, evaluate: () => ({ accuracy: 0.95 }) };
    };

    const result = await pipeline.train(data, modelFactory);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Training failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /health
 */
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`Model Training Service running on port ${PORT}`);
});

export { TrainingPipeline };
