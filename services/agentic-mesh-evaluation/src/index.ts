/**
 * Agentic Mesh Evaluation Service
 * Main Application Entry Point
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import websocket from '@fastify/websocket';
import mercurius from 'mercurius';
import { MeshCoordinator } from './coordinator/MeshCoordinator.js';
import { MeshRegistry } from './registry/MeshRegistry.js';
import { CommunicationFabric } from './fabric/CommunicationFabric.js';
import { MetricsCollector } from './metrics/MetricsCollector.js';
import { EvaluationEngine } from './evaluation/EvaluationEngine.js';
import { graphqlSchema } from './api/schema.js';
import { createResolvers } from './api/resolvers.js';

// Environment configuration
const PORT = parseInt(process.env.PORT || '4200');
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Initialize core services
const registry = new MeshRegistry(REDIS_URL);

const fabric = new CommunicationFabric({
  redisUrl: REDIS_URL,
  enableRetries: true,
  maxRetries: 3,
  retryDelayMs: 1000,
  enableDeadLetterQueue: true,
  messageTimeoutMs: 30000,
});

const metrics = new MetricsCollector(REDIS_URL);

const coordinator = new MeshCoordinator(
  {
    enableAutoHealing: true,
    enableLoadBalancing: true,
    enableDynamicTopology: true,
    heartbeatIntervalMs: 5000,
    healthCheckTimeoutMs: 10000,
    taskTimeoutMs: 300000,
    maxRetries: 3,
  },
  registry,
  fabric,
  metrics
);

const evaluationEngine = new EvaluationEngine(coordinator, metrics);

// Create Fastify server
const server = Fastify({
  logger: {
    level: NODE_ENV === 'development' ? 'debug' : 'info',
    ...(NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty' } }
      : {}),
  },
});

// Register plugins
await server.register(helmet, {
  contentSecurityPolicy: false, // Disable for GraphQL playground
});

await server.register(cors, {
  origin: NODE_ENV === 'production' ? false : true,
  credentials: true,
});

await server.register(websocket);

// Register GraphQL
await server.register(mercurius, {
  schema: graphqlSchema,
  resolvers: createResolvers({
    coordinator,
    evaluationEngine,
    metrics,
    registry,
    fabric,
  }),
  graphiql: NODE_ENV !== 'production',
  context: (request, reply) => {
    return {
      request,
      reply,
      services: {
        coordinator,
        evaluationEngine,
        metrics,
        registry,
        fabric,
      },
    };
  },
  subscription: true,
});

// Health check endpoint
server.get('/health', async () => {
  try {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        coordinator: 'healthy',
        registry: 'healthy',
        fabric: 'healthy',
        metrics: 'healthy',
        evaluationEngine: 'healthy',
      },
    };
  } catch (error) {
    server.log.error(error);
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Service health check failed',
    };
  }
});

// Metrics endpoint (Prometheus compatible)
server.get('/metrics', async () => {
  return metrics.getPrometheusMetrics();
});

// REST API endpoints

// List all meshes
server.get('/api/v1/meshes', async (request, reply) => {
  try {
    const meshes = coordinator.getAllMeshes();
    return { data: meshes, total: meshes.length };
  } catch (error) {
    reply.status(500);
    return { error: 'Failed to fetch meshes' };
  }
});

// Get specific mesh
server.get<{ Params: { id: string } }>(
  '/api/v1/meshes/:id',
  async (request, reply) => {
    try {
      const mesh = coordinator.getMesh(request.params.id);
      if (!mesh) {
        reply.status(404);
        return { error: 'Mesh not found' };
      }
      return { data: mesh };
    } catch (error) {
      reply.status(500);
      return { error: 'Failed to fetch mesh' };
    }
  }
);

// Create new mesh
server.post<{ Body: any }>('/api/v1/meshes', async (request, reply) => {
  try {
    const mesh = await coordinator.createMesh(request.body);
    return { data: mesh };
  } catch (error: any) {
    reply.status(400);
    return { error: error.message };
  }
});

// Start evaluation
server.post<{ Body: any }>(
  '/api/v1/evaluations',
  async (request, reply) => {
    try {
      const evaluation = await evaluationEngine.startEvaluation(
        request.body
      );
      return { data: evaluation };
    } catch (error: any) {
      reply.status(400);
      return { error: error.message };
    }
  }
);

// Get evaluation
server.get<{ Params: { id: string } }>(
  '/api/v1/evaluations/:id',
  async (request, reply) => {
    try {
      const evaluation = evaluationEngine.getEvaluation(request.params.id);
      if (!evaluation) {
        reply.status(404);
        return { error: 'Evaluation not found' };
      }
      return { data: evaluation };
    } catch (error) {
      reply.status(500);
      return { error: 'Failed to fetch evaluation' };
    }
  }
);

// List evaluations
server.get<{ Querystring: { meshId?: string } }>(
  '/api/v1/evaluations',
  async (request) => {
    try {
      const evaluations = evaluationEngine.getEvaluations(
        request.query.meshId
      );
      return { data: evaluations, total: evaluations.length };
    } catch (error) {
      return { error: 'Failed to fetch evaluations' };
    }
  }
);

// Submit task
server.post<{ Body: any }>('/api/v1/tasks', async (request, reply) => {
  try {
    const task = await coordinator.submitTask(request.body);
    return { data: task };
  } catch (error: any) {
    reply.status(400);
    return { error: error.message };
  }
});

// Get task
server.get<{ Params: { id: string } }>(
  '/api/v1/tasks/:id',
  async (request, reply) => {
    try {
      const task = coordinator.getTask(request.params.id);
      if (!task) {
        reply.status(404);
        return { error: 'Task not found' };
      }
      return { data: task };
    } catch (error) {
      reply.status(500);
      return { error: 'Failed to fetch task' };
    }
  }
);

// WebSocket for real-time updates
server.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    connection.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'subscribe' && data.meshId) {
          // Subscribe to mesh updates
          const interval = setInterval(async () => {
            const mesh = coordinator.getMesh(data.meshId);
            if (mesh) {
              connection.send(
                JSON.stringify({
                  type: 'mesh_update',
                  data: mesh,
                  timestamp: new Date().toISOString(),
                })
              );
            }
          }, 1000);

          connection.on('close', () => {
            clearInterval(interval);
          });
        }

        if (data.type === 'subscribe_evaluation' && data.evaluationId) {
          // Subscribe to evaluation updates
          const interval = setInterval(async () => {
            const evaluation = evaluationEngine.getEvaluation(
              data.evaluationId
            );
            if (evaluation) {
              connection.send(
                JSON.stringify({
                  type: 'evaluation_update',
                  data: evaluation,
                  timestamp: new Date().toISOString(),
                })
              );

              if (
                ['completed', 'failed', 'cancelled'].includes(
                  evaluation.status
                )
              ) {
                clearInterval(interval);
              }
            }
          }, 1000);

          connection.on('close', () => {
            clearInterval(interval);
          });
        }

        if (data.type === 'subscribe_metrics' && data.meshId) {
          // Subscribe to metrics updates
          const interval = setInterval(async () => {
            const meshMetrics = await metrics.getMetrics(data.meshId);
            if (meshMetrics) {
              connection.send(
                JSON.stringify({
                  type: 'metrics_update',
                  data: meshMetrics,
                  timestamp: new Date().toISOString(),
                })
              );
            }
          }, 5000); // Every 5 seconds

          connection.on('close', () => {
            clearInterval(interval);
          });
        }
      } catch (error) {
        server.log.error(error, 'WebSocket message error');
      }
    });

    connection.send(
      JSON.stringify({
        type: 'connected',
        message: 'WebSocket connection established',
        timestamp: new Date().toISOString(),
      })
    );
  });
});

// Event handlers for real-time notifications
coordinator.on('mesh-created', (mesh) => {
  server.log.info({ meshId: mesh.id }, 'Mesh created');
});

coordinator.on('mesh-started', (mesh) => {
  server.log.info({ meshId: mesh.id }, 'Mesh started');
});

coordinator.on('task-completed', (task) => {
  server.log.info({ taskId: task.id }, 'Task completed');
});

evaluationEngine.on('evaluation-started', (evaluation) => {
  server.log.info({ evaluationId: evaluation.id }, 'Evaluation started');
});

evaluationEngine.on('evaluation-completed', (evaluation) => {
  server.log.info(
    { evaluationId: evaluation.id, score: evaluation.results.score },
    'Evaluation completed'
  );
});

// Graceful shutdown
const gracefulShutdown = async () => {
  server.log.info('Starting graceful shutdown...');

  try {
    // Stop all meshes
    const meshes = coordinator.getAllMeshes();
    for (const mesh of meshes) {
      await coordinator.stopMesh(mesh.id);
    }

    // Close connections
    await fabric.close();
    await metrics.close();
    await registry.close();

    // Close server
    await server.close();

    server.log.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    server.log.error(error, 'Error during graceful shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const start = async () => {
  try {
    await server.listen({ port: PORT, host: HOST });
    server.log.info(
      `🚀 Agentic Mesh Evaluation Service ready at http://${HOST}:${PORT}`
    );
    server.log.info(
      `📊 GraphQL Playground: http://${HOST}:${PORT}/graphiql`
    );
    server.log.info(`🔌 WebSocket: ws://${HOST}:${PORT}/ws`);
    server.log.info(`❤️  Health: http://${HOST}:${PORT}/health`);
    server.log.info(`📈 Metrics: http://${HOST}:${PORT}/metrics`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
