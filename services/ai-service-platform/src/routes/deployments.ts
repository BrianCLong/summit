/**
 * Deployment Management Routes
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const DeployRequestSchema = z.object({
  serviceId: z.string().uuid(),
  environment: z.enum(['development', 'staging', 'production']),
  version: z.string().optional(),
  overrides: z.record(z.unknown()).optional(),
});

export async function deploymentRoutes(server: FastifyInstance) {
  // Deploy a service - the "hours not months" endpoint
  server.post('/', async (request, reply) => {
    const result = DeployRequestSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten() });
    }

    try {
      const deployment = await server.deploymentOrchestrator.deploy(result.data);
      return reply.status(201).send({
        message: 'Service deployed successfully',
        ...deployment,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Deployment failed';
      return reply.status(500).send({ error: message });
    }
  });

  // Get deployment status
  server.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    // Would query from registry/K8s
    return reply.status(200).send({ id, status: 'running' });
  });

  // Scale deployment
  server.post('/:id/scale', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { replicas } = request.body as { replicas: number };

    const deployment = await server.deploymentOrchestrator.scale(id, replicas);
    if (!deployment) {
      return reply.status(404).send({ error: 'Deployment not found' });
    }
    return deployment;
  });

  // Stop deployment
  server.post('/:id/stop', async (request, reply) => {
    const { id } = request.params as { id: string };
    await server.deploymentOrchestrator.stop(id);
    return { success: true };
  });

  // Rollback deployment
  server.post('/:id/rollback', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { targetVersion } = request.body as { targetVersion?: string };

    try {
      const deployment = await server.deploymentOrchestrator.rollback(
        id,
        targetVersion,
      );
      return deployment;
    } catch {
      return reply.status(500).send({ error: 'Rollback failed' });
    }
  });
}
