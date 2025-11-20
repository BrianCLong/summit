/**
 * Ingestion service - manages real-time data ingestion and connector instances
 */

import express from 'express';
import cors from 'cors';
import { createLogger, format, transports } from 'winston';
import { ConnectorRegistry } from './registry/ConnectorRegistry.js';
import { IngestionManager } from './ingestion/IngestionManager.js';
import { WebhookReceiver } from './webhooks/WebhookReceiver.js';
import { MetricsCollector } from './metrics/MetricsCollector.js';

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'ingestion-error.log', level: 'error' }),
    new transports.File({ filename: 'ingestion-combined.log' })
  ]
});

const app = express();
const port = process.env.PORT || 3020;

app.use(cors());
app.use(express.json());

// Initialize services
const connectorRegistry = new ConnectorRegistry(logger);
const ingestionManager = new IngestionManager(logger, connectorRegistry);
const webhookReceiver = new WebhookReceiver(logger, ingestionManager);
const metricsCollector = new MetricsCollector(logger);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ingestion',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Connector Registry endpoints
app.get('/api/connectors', async (req, res) => {
  try {
    const connectors = await connectorRegistry.listConnectors();
    res.json(connectors);
  } catch (error) {
    logger.error('Error listing connectors', { error });
    res.status(500).json({ error: 'Failed to list connectors' });
  }
});

app.get('/api/connectors/:type', async (req, res) => {
  try {
    const connector = await connectorRegistry.getConnector(req.params.type);
    if (!connector) {
      return res.status(404).json({ error: 'Connector not found' });
    }
    res.json(connector);
  } catch (error) {
    logger.error('Error getting connector', { error });
    res.status(500).json({ error: 'Failed to get connector' });
  }
});

// Ingestion endpoints
app.post('/api/ingestions', async (req, res) => {
  try {
    const ingestion = await ingestionManager.createIngestion(req.body);
    res.status(201).json(ingestion);
  } catch (error) {
    logger.error('Error creating ingestion', { error });
    res.status(500).json({ error: 'Failed to create ingestion' });
  }
});

app.get('/api/ingestions', async (req, res) => {
  try {
    const ingestions = await ingestionManager.listIngestions();
    res.json(ingestions);
  } catch (error) {
    logger.error('Error listing ingestions', { error });
    res.status(500).json({ error: 'Failed to list ingestions' });
  }
});

app.get('/api/ingestions/:id', async (req, res) => {
  try {
    const ingestion = await ingestionManager.getIngestion(req.params.id);
    if (!ingestion) {
      return res.status(404).json({ error: 'Ingestion not found' });
    }
    res.json(ingestion);
  } catch (error) {
    logger.error('Error getting ingestion', { error });
    res.status(500).json({ error: 'Failed to get ingestion' });
  }
});

app.post('/api/ingestions/:id/start', async (req, res) => {
  try {
    await ingestionManager.startIngestion(req.params.id);
    res.json({ status: 'started' });
  } catch (error) {
    logger.error('Error starting ingestion', { error });
    res.status(500).json({ error: 'Failed to start ingestion' });
  }
});

app.post('/api/ingestions/:id/stop', async (req, res) => {
  try {
    await ingestionManager.stopIngestion(req.params.id);
    res.json({ status: 'stopped' });
  } catch (error) {
    logger.error('Error stopping ingestion', { error });
    res.status(500).json({ error: 'Failed to stop ingestion' });
  }
});

app.delete('/api/ingestions/:id', async (req, res) => {
  try {
    await ingestionManager.deleteIngestion(req.params.id);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting ingestion', { error });
    res.status(500).json({ error: 'Failed to delete ingestion' });
  }
});

// Webhook endpoints
app.post('/api/webhooks/:id', async (req, res) => {
  try {
    await webhookReceiver.handleWebhook(req.params.id, req.body, req.headers);
    res.status(202).json({ status: 'accepted' });
  } catch (error) {
    logger.error('Error handling webhook', { error });
    res.status(500).json({ error: 'Failed to handle webhook' });
  }
});

// Metrics endpoints
app.get('/api/metrics', async (req, res) => {
  try {
    const metrics = await metricsCollector.getMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Error getting metrics', { error });
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

app.get('/api/metrics/ingestion/:id', async (req, res) => {
  try {
    const metrics = await metricsCollector.getIngestionMetrics(req.params.id);
    res.json(metrics);
  } catch (error) {
    logger.error('Error getting ingestion metrics', { error });
    res.status(500).json({ error: 'Failed to get ingestion metrics' });
  }
});

// Start server
app.listen(port, () => {
  logger.info(`Ingestion service listening on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await ingestionManager.stopAll();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await ingestionManager.stopAll();
  process.exit(0);
});
