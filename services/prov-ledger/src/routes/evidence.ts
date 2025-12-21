import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { LedgerService } from '../services/LedgerService.js';

const transformSchema = z.object({
  transformType: z.string(),
  actorId: z.string(),
  timestamp: z.string().datetime(),
  config: z.record(z.any()).optional(),
});

const evidenceSchema = z.object({
  claimId: z.string(),
  artifactDigest: z.string(),
  transformChain: z.array(transformSchema).default([]),
});

export async function evidenceRoutes(server: FastifyInstance) {
  const ledger = LedgerService.getInstance();

  server.post('/evidence', async (request, reply) => {
    const validation = evidenceSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.code(400).send({ error: validation.error.flatten() });
    }
    try {
      const evidence = await ledger.createEvidence(validation.data);
      return reply.code(201).send(evidence);
    } catch (err) {
      if ((err as Error).message === 'CLAIM_NOT_FOUND') {
        return reply.code(404).send({ error: 'Claim not found' });
      }
      throw err;
    }
  });

  server.get('/evidence/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const evidence = await ledger.getEvidence(id);
    if (!evidence) {
      return reply.code(404).send({ error: 'Evidence not found' });
    }
    return evidence;
  });
}

