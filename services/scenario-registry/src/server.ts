/**
 * Scenario Registry HTTP Server
 *
 * Provides REST API for managing evaluation scenarios
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { pino } from 'pino';
import pinoHttp from 'pino-http';
import { getDbClient, closeDbClient } from './db/client.js';
import { ScenarioRepository } from './repository.js';
import { validateScenario, safeValidate, EvalScenarioSchema } from '@intelgraph/mesh-eval-sdk';
import type { EvalScenario } from '@intelgraph/mesh-eval-sdk';

const logger = pino({ name: 'scenario-registry' });

/**
 * Server configuration
 */
const PORT = parseInt(process.env.PORT || '3100', 10);
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Create Express application
 */
function createApp() {
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(compression());
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url === '/health',
      },
    }),
  );

  // Database and repository
  const db = getDbClient();
  const repo = new ScenarioRepository(db);

  // Health check endpoint
  app.get('/health', async (req, res) => {
    const dbHealth = await db.healthCheck();
    res.json({
      status: dbHealth.healthy ? 'ok' : 'degraded',
      service: 'scenario-registry',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      database: {
        healthy: dbHealth.healthy,
        latency: dbHealth.latency,
      },
    });
  });

  // Create scenario
  app.post('/scenarios', async (req, res) => {
    try {
      // Validate request body
      const validation = safeValidate(EvalScenarioSchema, {
        ...req.body,
        createdAt: new Date(req.body.createdAt || Date.now()),
        updatedAt: new Date(req.body.updatedAt || Date.now()),
      });

      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid scenario data',
          details: validation.error.errors,
        });
      }

      const scenario = validation.data;

      // Check if scenario already exists
      const existing = await repo.findById(scenario.id);
      if (existing) {
        return res.status(409).json({
          error: 'Scenario already exists',
          id: scenario.id,
        });
      }

      // Create scenario
      const created = await repo.create(scenario);

      res.status(201).json(created);
    } catch (err) {
      logger.error({ err }, 'Failed to create scenario');
      res.status(500).json({
        error: 'Internal server error',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  // Get scenario by ID
  app.get('/scenarios/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const scenario = await repo.findById(id);

      if (!scenario) {
        return res.status(404).json({
          error: 'Scenario not found',
          id,
        });
      }

      res.json(scenario);
    } catch (err) {
      logger.error({ err, scenarioId: req.params.id }, 'Failed to get scenario');
      res.status(500).json({
        error: 'Internal server error',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  // List scenarios
  app.get('/scenarios', async (req, res) => {
    try {
      const {
        type,
        tags,
        difficulty,
        createdBy,
        limit,
        offset,
        sortBy,
        sortOrder,
      } = req.query;

      const options = {
        type: type as string | undefined,
        tags: tags ? (Array.isArray(tags) ? tags : [tags]) as string[] : undefined,
        difficulty: difficulty as string | undefined,
        createdBy: createdBy as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
        sortBy: sortBy as 'created_at' | 'updated_at' | 'name' | undefined,
        sortOrder: sortOrder as 'asc' | 'desc' | undefined,
      };

      const { scenarios, total } = await repo.list(options);

      res.json({
        scenarios,
        total,
        limit: options.limit || 50,
        offset: options.offset || 0,
      });
    } catch (err) {
      logger.error({ err }, 'Failed to list scenarios');
      res.status(500).json({
        error: 'Internal server error',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  // Update scenario
  app.put('/scenarios/:id', async (req, res) => {
    try {
      const { id } = req.params;

      // Check if scenario exists
      const existing = await repo.findById(id);
      if (!existing) {
        return res.status(404).json({
          error: 'Scenario not found',
          id,
        });
      }

      // Validate updates
      const updates = req.body;

      // Update scenario
      const updated = await repo.update(id, updates);

      if (!updated) {
        return res.status(404).json({
          error: 'Scenario not found',
          id,
        });
      }

      res.json(updated);
    } catch (err) {
      logger.error({ err, scenarioId: req.params.id }, 'Failed to update scenario');
      res.status(500).json({
        error: 'Internal server error',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  // Delete scenario
  app.delete('/scenarios/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const deleted = await repo.delete(id);

      if (!deleted) {
        return res.status(404).json({
          error: 'Scenario not found',
          id,
        });
      }

      res.status(204).send();
    } catch (err) {
      logger.error({ err, scenarioId: req.params.id }, 'Failed to delete scenario');
      res.status(500).json({
        error: 'Internal server error',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  // Get all tags
  app.get('/scenarios/meta/tags', async (req, res) => {
    try {
      const tags = await repo.getTags();
      res.json({ tags });
    } catch (err) {
      logger.error({ err }, 'Failed to get tags');
      res.status(500).json({
        error: 'Internal server error',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  // Get all types
  app.get('/scenarios/meta/types', async (req, res) => {
    try {
      const types = await repo.getTypes();
      res.json({ types });
    } catch (err) {
      logger.error({ err }, 'Failed to get types');
      res.status(500).json({
        error: 'Internal server error',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  // Error handling middleware
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error({ err, url: req.url, method: req.method }, 'Unhandled error');
    res.status(500).json({
      error: 'Internal server error',
      message: NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
    });
  });

  return app;
}

/**
 * Start the server
 */
async function start() {
  try {
    const app = createApp();

    const server = app.listen(PORT, HOST, () => {
      logger.info(
        {
          port: PORT,
          host: HOST,
          env: NODE_ENV,
        },
        'Scenario Registry server started',
      );
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down gracefully...');
      server.close(() => {
        logger.info('HTTP server closed');
      });

      await closeDbClient();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

// Start server if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export { createApp, start };
