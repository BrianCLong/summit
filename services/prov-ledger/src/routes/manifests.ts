import { FastifyInstance } from 'fastify';
import { LedgerService } from '../services/LedgerService.js';

export async function manifestRoutes(server: FastifyInstance) {
  const ledger = LedgerService.getInstance();

  server.get('/manifest/:bundleId', async (request, reply) => {
    const { bundleId } = request.params as { bundleId: string };
    const manifest = await ledger.buildManifest(bundleId);
    if (!manifest) {
      return reply.code(404).send({ error: 'Bundle not found' });
    }
    return manifest;
  });

  server.get('/bundles/:caseId', async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const manifest = await ledger.buildManifest(caseId);
    if (!manifest) {
      return reply.code(404).send({ error: 'Bundle not found' });
    }
    return manifest;
  });
}

