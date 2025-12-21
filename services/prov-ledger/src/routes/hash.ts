import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { LedgerService } from '../services/LedgerService.js';

const verifySchema = z.object({
  content: z.any(),
  expectedHash: z.string().min(10),
});

export async function hashRoutes(server: FastifyInstance) {
  const ledger = LedgerService.getInstance();

  server.post('/hash/verify', async (request, reply) => {
    const validation = verifySchema.safeParse(request.body);
    if (!validation.success) {
      return reply.code(400).send({ error: validation.error.flatten() });
    }

    const { content, expectedHash } = validation.data;
    const result = await ledger.verifyHash(content, expectedHash);
    return {
      valid: result.valid,
      expectedHash,
      actualHash: result.actualHash,
      verifiedAt: new Date().toISOString(),
    };
  });
}

