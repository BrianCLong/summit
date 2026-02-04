#!/usr/bin/env node

// Worker Entrypoint for Conductor Queue Processing
// Used in Kubernetes deployments to start queue workers

import 'dotenv/config';
import { queueWorker, WorkerFactory } from './scheduling/queue-worker.js';
import { prometheusConductorMetrics } from './observability/prometheus.js';
import express from 'express';
import { register } from '../monitoring/metrics.js';
import { verifyStartupDependencies } from '../utils/startup-readiness.js';
import { getRedisClient } from '../db/redis.js';

/**
 * Worker application setup
 */
async function startWorker() {
  const role = process.env.CONDUCTOR_ROLE || 'worker';
  const expertType = process.env.EXPERT_TYPE;
  let ready = false;

  console.log(
    `Starting Conductor ${role}${expertType ? ` for ${expertType}` : ''}`,
  );
  console.log('Environment:', {
    CONDUCTOR_ROLE: process.env.CONDUCTOR_ROLE,
    EXPERT_TYPE: process.env.EXPERT_TYPE,
    QUEUE_NAMES: process.env.QUEUE_NAMES,
    WORKER_CONCURRENCY: process.env.WORKER_CONCURRENCY,
    REDIS_URL: process.env.REDIS_URL ? '[REDACTED]' : 'undefined',
    NODE_ENV: process.env.NODE_ENV,
  });

  if (role === 'api') {
    // Start the main API server
    const { createApp } = await import('../app.js');
    const app = await createApp();
    const port = process.env.PORT || 3000;

    app.listen(port, () => {
      console.log(`Conductor API server listening on port ${port}`);
    });
    return;
  }

  // Start worker process
  let worker;

  await verifyStartupDependencies();

  if (expertType && expertType !== 'light') {
    // Specific expert worker
    worker = WorkerFactory.createExpertWorker(expertType as any);
  } else {
    // Light task worker pool
    worker = WorkerFactory.createLightWorker();
  }

  // Create minimal express app for worker health checks and metrics
  const workerApp = express();
  const port = process.env.WORKER_PORT || 8080;

  // Health check endpoint
  workerApp.get('/health', (req, res) => {
    const status = worker.getStatus();
    res.json({
      success: true,
      status: status.isRunning ? 'running' : 'stopped',
      worker: status,
      timestamp: Date.now(),
    });
  });

  // Readiness probe ensuring queue is live and dependencies respond
  workerApp.get('/ready', async (_req, res) => {
    const status = worker.getStatus();
    try {
      const redis = getRedisClient();
      await redis.ping();
    } catch (error: any) {
      return res.status(503).json({
        success: false,
        status: 'not ready',
        reason: error instanceof Error ? error.message : 'Redis unavailable',
      });
    }

    if (!ready || !status.isRunning) {
      return res.status(503).json({
        success: false,
        status: 'starting',
        worker: status,
      });
    }

    return res.json({
      success: true,
      status: 'ready',
      worker: status,
    });
  });

  // Metrics endpoint
  workerApp.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  // Worker status endpoint
  workerApp.get('/status', (req, res) => {
    const status = worker.getStatus();
    res.json({
      success: true,
      worker: status,
      pid: process.pid,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: Date.now(),
    });
  });

  // Start worker HTTP server for health checks
  workerApp.listen(port, () => {
    console.log(`Worker health server listening on port ${port}`);
  });

  // Start the actual worker
  await worker.start();

  ready = true;

  console.log(`Worker ${worker.getStatus().workerId} started successfully`);

  // Keep process alive
  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    await worker.shutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    await worker.shutdown();
    process.exit(0);
  });

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    prometheusConductorMetrics.recordOperationalEvent(
      'worker_uncaught_exception',
      { success: false },
    );
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    prometheusConductorMetrics.recordOperationalEvent(
      'worker_unhandled_rejection',
      { success: false },
    );
  });
}

// Start the worker
startWorker().catch((error) => {
  console.error('Failed to start worker:', error);
  process.exit(1);
});
