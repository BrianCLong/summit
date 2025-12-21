import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { LedgerService } from '../services/LedgerService.js';

const claimSchema = z.object({
  sourceUri: z.string().min(3),
  hash: z.string().min(10),
  type: z.string().min(1),
  confidence: z.number().min(0).max(1),
  licenseId: z.string().min(1),
});

export async function claimRoutes(server: FastifyInstance) {
  const ledger = LedgerService.getInstance();

  server.post('/claims', async (request, reply) => {
    const validation = claimSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.code(400).send({ error: validation.error.flatten() });
    }

    const claim = await ledger.createClaim(validation.data);
    return reply.code(201).send(claim);
  });

  server.get('/claims/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const claim = await ledger.getClaim(id);
    if (!claim) {
      return reply.code(404).send({ error: 'Claim not found' });
    }
    return claim;
  });
}

