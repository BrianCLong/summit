/**
 * Data Factory Service - Dataset Routes
 *
 * REST API endpoints for dataset management.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ServiceContainer } from '../services/index.js';
import {
  CreateDatasetRequestSchema,
  UpdateDatasetRequestSchema,
  PaginationParamsSchema,
} from '../models/schemas.js';
import { DatasetStatus, SplitType } from '../types/index.js';

export function registerDatasetRoutes(
  app: FastifyInstance,
  services: ServiceContainer
): void {
  // Create dataset
  app.post('/datasets', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.headers['x-user-id'] as string || 'anonymous';

    const parsed = CreateDatasetRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.errors,
      });
    }

    try {
      const dataset = await services.dataset.create(parsed.data, userId);
      return reply.status(201).send(dataset);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // List datasets
  app.get('/datasets', async (request: FastifyRequest, reply: FastifyReply) => {
    const queryParams = request.query as Record<string, string>;

    const pagination = PaginationParamsSchema.parse({
      page: queryParams.page,
      pageSize: queryParams.pageSize,
      sortBy: queryParams.sortBy,
      sortOrder: queryParams.sortOrder,
    });

    const filters = {
      status: queryParams.status as DatasetStatus | undefined,
      taskType: queryParams.taskType,
      useCase: queryParams.useCase,
      createdBy: queryParams.createdBy,
      tags: queryParams.tags?.split(','),
    };

    try {
      const result = await services.dataset.list(pagination, filters);
      return reply.send(result);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get dataset by ID
  app.get('/datasets/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const dataset = await services.dataset.getById(id);
      if (!dataset) {
        return reply.status(404).send({ error: 'Dataset not found' });
      }
      return reply.send(dataset);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Update dataset
  app.patch('/datasets/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = request.headers['x-user-id'] as string || 'anonymous';

    const parsed = UpdateDatasetRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.errors,
      });
    }

    try {
      const dataset = await services.dataset.update(id, parsed.data, userId);
      return reply.send(dataset);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(404).send({ error: error.message });
      }
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Delete dataset
  app.delete('/datasets/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = request.headers['x-user-id'] as string || 'anonymous';

    try {
      await services.dataset.delete(id, userId);
      return reply.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(404).send({ error: error.message });
      }
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Publish dataset
  app.post('/datasets/:id/publish', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = request.headers['x-user-id'] as string || 'anonymous';

    try {
      const dataset = await services.dataset.publish(id, userId);
      return reply.send(dataset);
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Create new version
  app.post('/datasets/:id/version', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { version } = request.body as { version: string };
    const userId = request.headers['x-user-id'] as string || 'anonymous';

    if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
      return reply.status(400).send({
        error: 'Invalid version format. Use semantic versioning (e.g., 1.0.0)',
      });
    }

    try {
      const dataset = await services.dataset.createVersion(id, version, userId);
      return reply.status(201).send(dataset);
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Configure splits
  app.post('/datasets/:id/splits', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { splits } = request.body as {
      splits: Array<{
        splitType: SplitType;
        percentage: number;
        seed: number;
        stratifyBy?: string;
      }>;
    };
    const userId = request.headers['x-user-id'] as string || 'anonymous';

    try {
      const configuredSplits = await services.dataset.configureSplits(
        id,
        splits,
        userId
      );
      return reply.send({ splits: configuredSplits });
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Apply splits to samples
  app.post('/datasets/:id/splits/apply', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = request.headers['x-user-id'] as string || 'anonymous';

    try {
      await services.dataset.applySplits(id, userId);
      return reply.send({ success: true, message: 'Splits applied to samples' });
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get dataset statistics
  app.get('/datasets/:id/statistics', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const dataset = await services.dataset.getById(id);
      if (!dataset) {
        return reply.status(404).send({ error: 'Dataset not found' });
      }

      const sampleStats = await services.sample.getStatistics(id);
      const jobStats = await services.labeling.getJobStatistics(id);

      return reply.send({
        dataset: {
          id: dataset.id,
          name: dataset.name,
          version: dataset.version,
          status: dataset.status,
        },
        samples: sampleStats,
        jobs: jobStats,
        quality: dataset.qualityMetrics,
      });
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Check eligibility
  app.post('/datasets/:id/check-eligibility', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { useCase } = request.body as { useCase: string };
    const userId = request.headers['x-user-id'] as string || 'anonymous';

    try {
      const dataset = await services.dataset.getById(id);
      if (!dataset) {
        return reply.status(404).send({ error: 'Dataset not found' });
      }

      const result = await services.governance.checkDatasetEligibility(
        dataset,
        useCase,
        userId
      );
      return reply.send(result);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
