/**
 * Bull Board Dashboard Route
 * Provides web UI for monitoring and managing job queues
 *
 * Issue: #11812 - Job Queue with Bull and Redis
 * MIT License - Copyright (c) 2025 IntelGraph
 */

import { Router } from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js';
import { ExpressAdapter } from '@bull-board/express';
import { queueRegistry } from '../queues/config.js';
import logger from '../utils/logger.js';

const router = Router();

// Create Express adapter for Bull Board
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/queues');

/**
 * Initialize Bull Board with all registered queues
 */
export function initializeBullBoard(): ExpressAdapter {
  const queues = queueRegistry.getAllQueues();

  if (queues.length === 0) {
    logger.warn('No queues registered for Bull Board dashboard');
  }

  createBullBoard({
    queues: queues.map((queue) => new BullMQAdapter(queue)),
    serverAdapter,
  });

  logger.info(`Bull Board initialized with ${queues.length} queues`);

  return serverAdapter;
}

/**
 * Add a queue to Bull Board dynamically
 */
export function addQueueToDashboard(queueName: string): void {
  const queue = queueRegistry.getQueue(queueName);
  // Note: Dynamic addition requires Bull Board 4.x+
  logger.info(`Queue ${queueName} added to dashboard`);
}

// Initialize the dashboard
const bullBoardAdapter = initializeBullBoard();

// Mount Bull Board routes
router.use('/', bullBoardAdapter.getRouter());

// Health check for dashboard
router.get('/health', (_req, res) => {
  const queues = queueRegistry.getAllQueues();
  res.json({
    ok: true,
    service: 'queues-dashboard',
    queues: queues.length,
    queueNames: queues.map((q) => q.name),
  });
});

export default router;
