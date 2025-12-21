import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { LedgerService } from '../services/LedgerService.js';

const provenanceSchema = z.object({
  claimId: z.string(),
  transforms: z.array(z.string()).nonempty(),
  sources: z.array(z.string()).nonempty(),
  lineage: z.record(z.any()).default({}),
});

export async function provenanceRoutes(server: FastifyInstance) {
  const ledger = LedgerService.getInstance();

  server.post('/provenance', async (request, reply) => {
    const validation = provenanceSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.code(400).send({ error: validation.error.flatten() });
    }
    try {
      const chain = await ledger.createProvenance(validation.data);
      return reply.code(201).send(chain);
    } catch (err) {
      if ((err as Error).message === 'CLAIM_NOT_FOUND') {
        return reply.code(404).send({ error: 'Claim not found' });
      }
      throw err;
    }
  });

  server.get('/provenance', async (request, _reply) => {
    const claimId = (request.query as { claimId?: string }).claimId;
    return ledger.listProvenance(claimId);
  });
}

