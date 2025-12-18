/**
 * Data Factory Service - Labeling Routes
 *
 * REST API endpoints for labeling jobs and queues.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ServiceContainer } from '../services/index.js';
import {
  SubmitLabelRequestSchema,
  ReviewLabelRequestSchema,
  AssignJobRequestSchema,
  QualitySettingsSchema,
} from '../models/schemas.js';
import { TaskType, JobStatus } from '../types/index.js';

export function registerLabelingRoutes(
  app: FastifyInstance,
  services: ServiceContainer
): void {
  // ============================================================================
  // Queue Management
  // ============================================================================

  // Create labeling queue
  app.post('/queues', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.headers['x-user-id'] as string || 'anonymous';
    const { datasetId, name, taskType, qualitySettings } = request.body as {
      datasetId: string;
      name: string;
      taskType: TaskType;
      qualitySettings: unknown;
    };

    const parsedSettings = QualitySettingsSchema.safeParse(qualitySettings);
    if (!parsedSettings.success) {
      return reply.status(400).send({
        error: 'Invalid quality settings',
        details: parsedSettings.error.errors,
      });
    }

    try {
      const queue = await services.labeling.createQueue(
        datasetId,
        name,
        taskType,
        parsedSettings.data,
        userId
      );
      return reply.status(201).send(queue);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get queue by ID
  app.get('/queues/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const queue = await services.labeling.getQueue(id);
      if (!queue) {
        return reply.status(404).send({ error: 'Queue not found' });
      }
      return reply.send(queue);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get queues for dataset
  app.get('/datasets/:datasetId/queues', async (request: FastifyRequest, reply: FastifyReply) => {
    const { datasetId } = request.params as { datasetId: string };

    try {
      const queues = await services.labeling.getQueuesByDataset(datasetId);
      return reply.send(queues);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Add annotator to queue
  app.post('/queues/:id/annotators', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { annotatorId } = request.body as { annotatorId: string };
    const userId = request.headers['x-user-id'] as string || 'anonymous';

    try {
      await services.labeling.addAnnotatorToQueue(id, annotatorId, userId);
      return reply.send({ success: true });
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================================================
  // Job Management
  // ============================================================================

  // Create jobs for samples
  app.post('/jobs/batch', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.headers['x-user-id'] as string || 'anonymous';
    const { datasetId, sampleIds, taskType, instructions, labelSchemaId } =
      request.body as {
        datasetId: string;
        sampleIds: string[];
        taskType: TaskType;
        instructions: string;
        labelSchemaId: string;
      };

    try {
      const count = await services.labeling.createJobsForSamples(
        datasetId,
        sampleIds,
        taskType,
        instructions,
        labelSchemaId,
        userId
      );
      return reply.status(201).send({ created: count });
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get job by ID
  app.get('/jobs/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const job = await services.labeling.getJob(id);
      if (!job) {
        return reply.status(404).send({ error: 'Job not found' });
      }
      return reply.send(job);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get jobs for annotator
  app.get('/annotators/:annotatorId/jobs', async (request: FastifyRequest, reply: FastifyReply) => {
    const { annotatorId } = request.params as { annotatorId: string };
    const { status } = request.query as { status?: JobStatus };

    try {
      const jobs = await services.labeling.getJobsForAnnotator(
        annotatorId,
        status
      );
      return reply.send(jobs);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Assign jobs
  app.post('/jobs/assign', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = AssignJobRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.errors,
      });
    }

    try {
      const jobs = await services.labeling.assignJobs(parsed.data);
      return reply.send(jobs);
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Start job
  app.post('/jobs/:id/start', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = request.headers['x-user-id'] as string || 'anonymous';

    try {
      const job = await services.labeling.startJob(id, userId);
      return reply.send(job);
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================================================
  // Label Submission
  // ============================================================================

  // Submit label
  app.post('/labels', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.headers['x-user-id'] as string || 'anonymous';

    const parsed = SubmitLabelRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.errors,
      });
    }

    try {
      const labelSet = await services.labeling.submitLabel(parsed.data, userId);
      return reply.status(201).send(labelSet);
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get label set
  app.get('/labels/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const labelSet = await services.labeling.getLabelSet(id);
      if (!labelSet) {
        return reply.status(404).send({ error: 'Label set not found' });
      }
      return reply.send(labelSet);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================================================
  // Review
  // ============================================================================

  // Review label
  app.post('/labels/:id/review', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = request.headers['x-user-id'] as string || 'anonymous';

    const body = request.body as { approved: boolean; notes?: string };
    const parsed = ReviewLabelRequestSchema.safeParse({
      labelSetId: id,
      ...body,
    });
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.errors,
      });
    }

    try {
      const labelSet = await services.labeling.reviewLabel(parsed.data, userId);
      return reply.send(labelSet);
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get labels needing review
  app.get('/datasets/:datasetId/labels/review', async (request: FastifyRequest, reply: FastifyReply) => {
    const { datasetId } = request.params as { datasetId: string };
    const { limit } = request.query as { limit?: string };

    try {
      const labels = await services.labeling.getLabelsNeedingReview(
        datasetId,
        limit ? parseInt(limit, 10) : 20
      );
      return reply.send(labels);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================================================
  // Statistics
  // ============================================================================

  // Get job statistics
  app.get('/datasets/:datasetId/jobs/statistics', async (request: FastifyRequest, reply: FastifyReply) => {
    const { datasetId } = request.params as { datasetId: string };

    try {
      const stats = await services.labeling.getJobStatistics(datasetId);
      return reply.send(stats);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
