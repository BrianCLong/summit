/**
 * Data Factory Service - Workflow Routes
 *
 * REST API endpoints for labeling workflow management.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ServiceContainer } from '../services/index.js';
import { CreateWorkflowRequestSchema } from '../models/schemas.js';

export function registerWorkflowRoutes(
  app: FastifyInstance,
  services: ServiceContainer
): void {
  // Create workflow
  app.post('/workflows', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.headers['x-user-id'] as string || 'anonymous';

    const parsed = CreateWorkflowRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.errors,
      });
    }

    try {
      const workflow = await services.workflow.create(parsed.data, userId);
      return reply.status(201).send(workflow);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get workflow by ID
  app.get('/workflows/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const workflow = await services.workflow.getById(id);
      if (!workflow) {
        return reply.status(404).send({ error: 'Workflow not found' });
      }
      return reply.send(workflow);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get workflows for dataset
  app.get('/datasets/:datasetId/workflows', async (request: FastifyRequest, reply: FastifyReply) => {
    const { datasetId } = request.params as { datasetId: string };

    try {
      const workflows = await services.workflow.getByDataset(datasetId);
      return reply.send(workflows);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Start workflow
  app.post('/workflows/:id/start', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = request.headers['x-user-id'] as string || 'anonymous';

    try {
      const workflow = await services.workflow.start(id, userId);
      return reply.send(workflow);
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Pause workflow
  app.post('/workflows/:id/pause', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = request.headers['x-user-id'] as string || 'anonymous';

    try {
      const workflow = await services.workflow.pause(id, userId);
      return reply.send(workflow);
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Advance to next stage
  app.post('/workflows/:id/advance', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = request.headers['x-user-id'] as string || 'anonymous';

    try {
      const workflow = await services.workflow.advanceStage(id, userId);
      return reply.send(workflow);
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get workflow progress
  app.get('/workflows/:id/progress', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const progress = await services.workflow.getProgress(id);
      return reply.send(progress);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(404).send({ error: error.message });
      }
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Delete workflow
  app.delete('/workflows/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = request.headers['x-user-id'] as string || 'anonymous';

    try {
      await services.workflow.delete(id, userId);
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
}
