/**
 * Orchestration service - manages pipeline scheduling and execution
 */

import express from 'express';
import cors from 'cors';
import { createLogger, format, transports } from 'winston';
import { PipelineScheduler } from './scheduler/PipelineScheduler.js';
import { PipelineOrchestrator } from './orchestrator/PipelineOrchestrator.js';
import { AirflowIntegration } from './airflow/AirflowIntegration.js';

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'orchestration-error.log', level: 'error' }),
    new transports.File({ filename: 'orchestration-combined.log' })
  ]
});

const app = express();
const port = process.env.PORT || 3010;

app.use(cors());
app.use(express.json());

// Initialize services
const scheduler = new PipelineScheduler(logger);
const orchestrator = new PipelineOrchestrator(logger);
const airflowIntegration = new AirflowIntegration(logger);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'orchestration' });
});

// Pipeline management endpoints
app.post('/api/pipelines', async (req, res) => {
  try {
    const pipeline = await orchestrator.createPipeline(req.body);
    res.status(201).json(pipeline);
  } catch (error) {
    logger.error('Error creating pipeline', { error });
    res.status(500).json({ error: 'Failed to create pipeline' });
  }
});

app.get('/api/pipelines', async (req, res) => {
  try {
    const pipelines = await orchestrator.listPipelines();
    res.json(pipelines);
  } catch (error) {
    logger.error('Error listing pipelines', { error });
    res.status(500).json({ error: 'Failed to list pipelines' });
  }
});

app.get('/api/pipelines/:id', async (req, res) => {
  try {
    const pipeline = await orchestrator.getPipeline(req.params.id);
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    res.json(pipeline);
  } catch (error) {
    logger.error('Error getting pipeline', { error });
    res.status(500).json({ error: 'Failed to get pipeline' });
  }
});

app.post('/api/pipelines/:id/execute', async (req, res) => {
  try {
    const run = await orchestrator.executePipeline(req.params.id);
    res.json(run);
  } catch (error) {
    logger.error('Error executing pipeline', { error });
    res.status(500).json({ error: 'Failed to execute pipeline' });
  }
});

app.get('/api/pipelines/:id/runs', async (req, res) => {
  try {
    const runs = await orchestrator.getPipelineRuns(req.params.id);
    res.json(runs);
  } catch (error) {
    logger.error('Error getting pipeline runs', { error });
    res.status(500).json({ error: 'Failed to get pipeline runs' });
  }
});

// Schedule management endpoints
app.post('/api/schedules', async (req, res) => {
  try {
    const schedule = await scheduler.createSchedule(req.body);
    res.status(201).json(schedule);
  } catch (error) {
    logger.error('Error creating schedule', { error });
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

app.get('/api/schedules', async (req, res) => {
  try {
    const schedules = await scheduler.listSchedules();
    res.json(schedules);
  } catch (error) {
    logger.error('Error listing schedules', { error });
    res.status(500).json({ error: 'Failed to list schedules' });
  }
});

app.delete('/api/schedules/:id', async (req, res) => {
  try {
    await scheduler.deleteSchedule(req.params.id);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting schedule', { error });
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

// Airflow integration endpoints
app.post('/api/airflow/dags/:dagId/trigger', async (req, res) => {
  try {
    const result = await airflowIntegration.triggerDAG(req.params.dagId, req.body);
    res.json(result);
  } catch (error) {
    logger.error('Error triggering Airflow DAG', { error });
    res.status(500).json({ error: 'Failed to trigger DAG' });
  }
});

app.get('/api/airflow/dags/:dagId/runs', async (req, res) => {
  try {
    const runs = await airflowIntegration.getDAGRuns(req.params.dagId);
    res.json(runs);
  } catch (error) {
    logger.error('Error getting Airflow DAG runs', { error });
    res.status(500).json({ error: 'Failed to get DAG runs' });
  }
});

// Start server
app.listen(port, () => {
  logger.info(`Orchestration service listening on port ${port}`);
  scheduler.start();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  scheduler.stop();
  process.exit(0);
});
