import { FastifyInstance } from 'fastify';
import { LedgerService } from '../services/LedgerService.js';
import { z } from 'zod';

const EvidenceSchema = z.object({
  source: z.string().min(1),
  hash: z.string().min(10),
  license: z.string().optional(),
});

const ClaimSchema = z.object({
  evidenceIds: z.array(z.string().min(3)).min(1),
  assertion: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

export default async function pclRoutes(fastify: FastifyInstance) {
  const ledger = LedgerService.getInstance();

  fastify.post('/v1/evidence', async (req, reply) => {
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
    try {
      const body = EvidenceSchema.parse(req.body);
      const result = await ledger.registerEvidence(body, idempotencyKey);
      return reply.code(201).send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message ?? 'invalid payload' });
    }
  });

  fastify.post('/v1/claims', async (req, reply) => {
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
    try {
      const body = ClaimSchema.parse(req.body);
      const result = await ledger.registerClaim(body, idempotencyKey);
      return reply.code(201).send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message ?? 'invalid payload' });
    }
  });

  fastify.get('/v1/manifest/:claimId', async (req, reply) => {
    const { claimId } = req.params as { claimId: string };
    const manifest = await ledger.getManifest(claimId);
    if (!manifest) {
      return reply.code(404).send({ error: 'claim not found' });
    }
    return reply.send(manifest);
  });
}
