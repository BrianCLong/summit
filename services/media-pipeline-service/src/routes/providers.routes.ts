/**
 * Provider Management Routes
 *
 * API endpoints for provider health and configuration.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { providerRegistry } from '../providers/registry.js';

export async function providerRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * List all providers
   */
  fastify.get(
    '/api/v1/providers',
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply.status(200).send({
        stt: providerRegistry.listSTTProviders(),
        diarization: providerRegistry.listDiarizationProviders(),
      });
    }
  );

  /**
   * Get provider health status
   */
  fastify.get(
    '/api/v1/providers/health',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const healthResults = await providerRegistry.checkAllProvidersHealth();

      return reply.status(200).send({
        providers: Object.fromEntries(healthResults),
      });
    }
  );

  /**
   * Get STT provider details
   */
  fastify.get(
    '/api/v1/providers/stt/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const provider = providerRegistry.getSTTProvider(id);

      if (!provider) {
        return reply.status(404).send({
          error: 'Not found',
          message: `STT provider ${id} not found`,
        });
      }

      const health = await provider.healthCheck();

      return reply.status(200).send({
        id: provider.id,
        name: provider.name,
        supportedFormats: provider.supportedFormats,
        supportedLanguages: provider.supportedLanguages,
        maxDurationMs: provider.maxDurationMs,
        maxFileSizeBytes: provider.maxFileSizeBytes,
        health,
      });
    }
  );

  /**
   * Get STT provider health
   */
  fastify.get(
    '/api/v1/providers/stt/:id/health',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const health = await providerRegistry.checkSTTProviderHealth(id);

      if (!health) {
        return reply.status(404).send({
          error: 'Not found',
          message: `STT provider ${id} not found`,
        });
      }

      return reply.status(200).send(health);
    }
  );

  /**
   * Get diarization provider details
   */
  fastify.get(
    '/api/v1/providers/diarization/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const provider = providerRegistry.getDiarizationProvider(id);

      if (!provider) {
        return reply.status(404).send({
          error: 'Not found',
          message: `Diarization provider ${id} not found`,
        });
      }

      const health = await provider.healthCheck();

      return reply.status(200).send({
        id: provider.id,
        name: provider.name,
        supportedFormats: provider.supportedFormats,
        maxDurationMs: provider.maxDurationMs,
        maxSpeakers: provider.maxSpeakers,
        health,
      });
    }
  );

  /**
   * Get diarization provider health
   */
  fastify.get(
    '/api/v1/providers/diarization/:id/health',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const health = await providerRegistry.checkDiarizationProviderHealth(id);

      if (!health) {
        return reply.status(404).send({
          error: 'Not found',
          message: `Diarization provider ${id} not found`,
        });
      }

      return reply.status(200).send(health);
    }
  );
}
