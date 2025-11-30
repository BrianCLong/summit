/**
 * Data Factory Service - Annotator Routes
 *
 * REST API endpoints for annotator management.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ServiceContainer } from '../services/index.js';
import { CreateAnnotatorRequestSchema } from '../models/schemas.js';
import { AnnotatorRole, TaskType } from '../types/index.js';

export function registerAnnotatorRoutes(
  app: FastifyInstance,
  services: ServiceContainer
): void {
  // Create annotator
  app.post('/annotators', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.headers['x-user-id'] as string || 'anonymous';

    const parsed = CreateAnnotatorRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.errors,
      });
    }

    try {
      const annotator = await services.annotator.create(parsed.data, userId);
      return reply.status(201).send(annotator);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get annotator by ID
  app.get('/annotators/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const annotator = await services.annotator.getById(id);
      if (!annotator) {
        return reply.status(404).send({ error: 'Annotator not found' });
      }
      return reply.send(annotator);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get annotator by user ID
  app.get('/annotators/user/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as { userId: string };

    try {
      const annotator = await services.annotator.getByUserId(userId);
      if (!annotator) {
        return reply.status(404).send({ error: 'Annotator not found' });
      }
      return reply.send(annotator);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // List annotators
  app.get('/annotators', async (request: FastifyRequest, reply: FastifyReply) => {
    const queryParams = request.query as Record<string, string>;

    const filters = {
      role: queryParams.role as AnnotatorRole | undefined,
      isActive: queryParams.isActive === 'true' ? true : queryParams.isActive === 'false' ? false : undefined,
      taskType: queryParams.taskType as TaskType | undefined,
    };

    try {
      const annotators = await services.annotator.list(filters);
      return reply.send(annotators);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Update annotator
  app.patch('/annotators/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = request.headers['x-user-id'] as string || 'anonymous';
    const updates = request.body as {
      displayName?: string;
      email?: string;
      role?: AnnotatorRole;
      taskTypes?: TaskType[];
      qualifications?: string[];
      isActive?: boolean;
    };

    try {
      const annotator = await services.annotator.update(id, updates, userId);
      return reply.send(annotator);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(404).send({ error: error.message });
      }
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Update annotator metrics
  app.post('/annotators/:id/metrics/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const metrics = await services.annotator.updateMetrics(id);
      return reply.send(metrics);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Deactivate annotator
  app.post('/annotators/:id/deactivate', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = request.headers['x-user-id'] as string || 'anonymous';

    try {
      await services.annotator.deactivate(id, userId);
      return reply.send({ success: true });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(404).send({ error: error.message });
      }
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get leaderboard
  app.get('/annotators/leaderboard', async (request: FastifyRequest, reply: FastifyReply) => {
    const { metric, limit } = request.query as {
      metric?: 'totalLabeled' | 'accuracy' | 'speed';
      limit?: string;
    };

    try {
      const leaderboard = await services.annotator.getLeaderboard(
        metric || 'totalLabeled',
        limit ? parseInt(limit, 10) : 10
      );
      return reply.send(leaderboard);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
