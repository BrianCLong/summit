/**
 * Knowledge Graph Service - Main entry point
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import { KnowledgeGraph } from '@summit/knowledge-graph';
import { GraphAnalyzer } from '@summit/graph-analytics';
import { OntologyManager } from '@summit/ontology-management';
import { ReasoningEngine } from '@summit/semantic-reasoning';

const app = express();
const logger = pino({ name: 'kg-service' });
const port = process.env.KG_SERVICE_PORT || 3100;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize knowledge graph
const kg = new KnowledgeGraph({
  database: {
    type: 'neo4j',
    uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    auth: {
      username: process.env.NEO4J_USERNAME || 'neo4j',
      password: process.env.NEO4J_PASSWORD || 'password'
    }
  },
  tripleStore: {
    backend: 'memory'
  },
  enableVersioning: true
});

const ontologyManager = new OntologyManager();
const reasoningEngine = new ReasoningEngine();

// Health check
app.get('/health', async (req, res) => {
  const healthy = await kg.healthCheck();
  res.status(healthy ? 200 : 503).json({ status: healthy ? 'healthy' : 'unhealthy' });
});

// Add entity
app.post('/api/entities', async (req, res) => {
  try {
    const entity = req.body;
    const id = await kg.addEntity(entity);
    res.status(201).json({ id });
  } catch (error: any) {
    logger.error(error, 'Failed to add entity');
    res.status(500).json({ error: error.message });
  }
});

// Get entity
app.get('/api/entities/:id', async (req, res) => {
  try {
    const entity = await kg.getEntity(req.params.id);
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    res.json(entity);
  } catch (error: any) {
    logger.error(error, 'Failed to get entity');
    res.status(500).json({ error: error.message });
  }
});

// Update entity
app.put('/api/entities/:id', async (req, res) => {
  try {
    await kg.updateEntity(req.params.id, req.body);
    res.json({ success: true });
  } catch (error: any) {
    logger.error(error, 'Failed to update entity');
    res.status(500).json({ error: error.message });
  }
});

// Delete entity
app.delete('/api/entities/:id', async (req, res) => {
  try {
    await kg.deleteEntity(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    logger.error(error, 'Failed to delete entity');
    res.status(500).json({ error: error.message });
  }
});

// Add relationship
app.post('/api/relationships', async (req, res) => {
  try {
    const relationship = req.body;
    const id = await kg.addRelationship(relationship);
    res.status(201).json({ id });
  } catch (error: any) {
    logger.error(error, 'Failed to add relationship');
    res.status(500).json({ error: error.message });
  }
});

// Query graph
app.post('/api/query', async (req, res) => {
  try {
    const query = req.body;
    const result = await kg.query(query);
    res.json(result);
  } catch (error: any) {
    logger.error(error, 'Failed to execute query');
    res.status(500).json({ error: error.message });
  }
});

// Get graph statistics
app.get('/api/statistics', async (req, res) => {
  try {
    const stats = await kg.getStatistics();
    res.json(stats);
  } catch (error: any) {
    logger.error(error, 'Failed to get statistics');
    res.status(500).json({ error: error.message });
  }
});

// Get neighbors
app.get('/api/entities/:id/neighbors', async (req, res) => {
  try {
    const direction = req.query.direction as 'in' | 'out' | 'both' || 'both';
    const neighbors = await kg.getNeighbors(req.params.id, direction);
    res.json(neighbors);
  } catch (error: any) {
    logger.error(error, 'Failed to get neighbors');
    res.status(500).json({ error: error.message });
  }
});

// Create version snapshot
app.post('/api/versions', async (req, res) => {
  try {
    const { message, author } = req.body;
    const version = kg.createVersion(message, author);
    res.status(201).json({ version });
  } catch (error: any) {
    logger.error(error, 'Failed to create version');
    res.status(500).json({ error: error.message });
  }
});

// Perform reasoning
app.post('/api/reasoning/infer', async (req, res) => {
  try {
    const { entityId, properties } = req.body;
    const result = reasoningEngine.infer(entityId, properties);
    res.json(result);
  } catch (error: any) {
    logger.error(error, 'Failed to perform reasoning');
    res.status(500).json({ error: error.message });
  }
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(err, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function start() {
  try {
    await kg.initialize();
    logger.info('Knowledge graph initialized');

    app.listen(port, () => {
      logger.info(`Knowledge Graph Service listening on port ${port}`);
    });
  } catch (error) {
    logger.error(error, 'Failed to start service');
    process.exit(1);
  }
}

// Handle shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await kg.shutdown();
  process.exit(0);
});

start();

export { app };
