/**
 * Data Factory Service - Sample Routes
 *
 * REST API endpoints for sample management.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ServiceContainer } from '../services/index.js';
import {
  CreateSampleRequestSchema,
  PaginationParamsSchema,
} from '../models/schemas.js';
import { LabelStatus, SplitType } from '../types/index.js';

export function registerSampleRoutes(
  app: FastifyInstance,
  services: ServiceContainer
): void {
  // Create sample
  app.post('/samples', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.headers['x-user-id'] as string || 'anonymous';

    const parsed = CreateSampleRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.errors,
      });
    }

    try {
      const sample = await services.sample.create(parsed.data, userId);
      return reply.status(201).send(sample);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Batch create samples
  app.post('/samples/batch', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.headers['x-user-id'] as string || 'anonymous';
    const { datasetId, samples } = request.body as {
      datasetId: string;
      samples: Array<{
        externalId?: string;
        content: Record<string, unknown>;
        metadata: {
          sourceId: string;
          sourceName: string;
          collectionDate: string;
          originalFormat: string;
          language?: string;
          domain?: string;
          customFields?: Record<string, unknown>;
        };
        isGolden?: boolean;
        expectedLabel?: Record<string, unknown>;
        priority?: number;
      }>;
    };

    try {
      const result = await services.sample.createBatch(datasetId, samples, userId);
      return reply.status(201).send(result);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // List samples for dataset
  app.get('/datasets/:datasetId/samples', async (request: FastifyRequest, reply: FastifyReply) => {
    const { datasetId } = request.params as { datasetId: string };
    const queryParams = request.query as Record<string, string>;

    const pagination = PaginationParamsSchema.parse({
      page: queryParams.page,
      pageSize: queryParams.pageSize,
      sortBy: queryParams.sortBy,
      sortOrder: queryParams.sortOrder,
    });

    const filters = {
      status: queryParams.status as LabelStatus | undefined,
      split: queryParams.split as SplitType | undefined,
      isGolden: queryParams.isGolden === 'true' ? true : undefined,
      minPriority: queryParams.minPriority
        ? parseInt(queryParams.minPriority, 10)
        : undefined,
    };

    try {
      const result = await services.sample.list(datasetId, pagination, filters);
      return reply.send(result);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get sample by ID
  app.get('/samples/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const sample = await services.sample.getById(id);
      if (!sample) {
        return reply.status(404).send({ error: 'Sample not found' });
      }
      return reply.send(sample);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Update sample status
  app.patch('/samples/:id/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: LabelStatus };
    const userId = request.headers['x-user-id'] as string || 'anonymous';

    try {
      const sample = await services.sample.updateStatus(id, status, userId);
      return reply.send(sample);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(404).send({ error: error.message });
      }
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Update sample priority
  app.patch('/samples/:id/priority', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { priority } = request.body as { priority: number };
    const userId = request.headers['x-user-id'] as string || 'anonymous';

    try {
      const sample = await services.sample.updatePriority(id, priority, userId);
      return reply.send(sample);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(404).send({ error: error.message });
      }
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Mark sample as golden
  app.post('/samples/:id/golden', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { expectedLabel } = request.body as { expectedLabel: Record<string, unknown> };
    const userId = request.headers['x-user-id'] as string || 'anonymous';

    try {
      const sample = await services.sample.markAsGolden(id, expectedLabel, userId);
      return reply.send(sample);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(404).send({ error: error.message });
      }
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get golden samples
  app.get('/datasets/:datasetId/samples/golden', async (request: FastifyRequest, reply: FastifyReply) => {
    const { datasetId } = request.params as { datasetId: string };
    const { limit } = request.query as { limit?: string };

    try {
      const samples = await services.sample.getGoldenSamples(
        datasetId,
        limit ? parseInt(limit, 10) : 10
      );
      return reply.send(samples);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get next samples for labeling
  app.get('/datasets/:datasetId/samples/next', async (request: FastifyRequest, reply: FastifyReply) => {
    const { datasetId } = request.params as { datasetId: string };
    const { count } = request.query as { count?: string };
    const userId = request.headers['x-user-id'] as string || 'anonymous';

    try {
      const samples = await services.sample.getNextForLabeling(
        datasetId,
        userId,
        count ? parseInt(count, 10) : 1
      );
      return reply.send(samples);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Delete sample
  app.delete('/samples/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = request.headers['x-user-id'] as string || 'anonymous';

    try {
      await services.sample.delete(id, userId);
      return reply.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(404).send({ error: error.message });
      }
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Batch delete samples
  app.post('/samples/batch-delete', async (request: FastifyRequest, reply: FastifyReply) => {
    const { datasetId, sampleIds } = request.body as {
      datasetId: string;
      sampleIds: string[];
    };
    const userId = request.headers['x-user-id'] as string || 'anonymous';

    try {
      const count = await services.sample.deleteBatch(datasetId, sampleIds, userId);
      return reply.send({ deleted: count });
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get sample statistics
  app.get('/datasets/:datasetId/samples/statistics', async (request: FastifyRequest, reply: FastifyReply) => {
    const { datasetId } = request.params as { datasetId: string };

    try {
      const stats = await services.sample.getStatistics(datasetId);
      return reply.send(stats);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
