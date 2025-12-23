// @ts-nocheck
import { FastifyInstance } from 'fastify';
import { LedgerService } from '../services/LedgerService.js';
import { z } from 'zod';
import { cacheRemember } from '../../libs/ops/src/cache.js';
import { keys } from '../cache-keys.js';

const CreateEvidenceSchema = z.object({
  url: z.string().optional(),
  blob: z.string().optional(),
  source: z.string(),
  license: z.string().optional(),
  hash: z.string(),
  caseId: z.string().optional()
});

const CreateTransformSchema = z.object({
  inputs: z.array(z.string()),
  tool: z.string(),
  params: z.record(z.any()),
  outputs: z.array(z.string()),
  operatorId: z.string(),
  caseId: z.string().optional()
});

const CreateClaimSchema = z.object({
  subject: z.string(),
  predicate: z.string(),
  object: z.string(),
  evidenceRefs: z.array(z.string()),
  confidence: z.number(),
  licenseId: z.string(),
  caseId: z.string().optional()
});

export default async function pclRoutes(fastify: FastifyInstance) {
  const ledger = LedgerService.getInstance();

  fastify.post('/evidence', async (req, reply) => {
    try {
      const body = CreateEvidenceSchema.parse(req.body);
      const evidenceId = await ledger.registerEvidence(body as any);
      return reply.code(201).send({ evidenceId });
    } catch (err) {
      return reply.code(400).send({ error: err });
    }
  });

  fastify.post('/transform', async (req, reply) => {
    try {
      const body = CreateTransformSchema.parse(req.body);
      const transformId = await ledger.registerTransform(body as any);
      return reply.code(201).send({ transformId });
    } catch (err) {
      return reply.code(400).send({ error: err });
    }
  });

  fastify.post('/claim', async (req, reply) => {
    try {
      const body = CreateClaimSchema.parse(req.body);
      const claimId = await ledger.registerClaim(body as any);
      return reply.code(201).send({ claimId });
    } catch (err) {
      return reply.code(400).send({ error: err });
    }
  });

  fastify.get('/manifest/:bundleId', async (req, reply) => {
    const { bundleId } = req.params as { bundleId: string };
    const manifest = await cacheRemember(keys.manifest(bundleId), 60, () =>
      ledger.getManifest(bundleId)
    );
    if (!manifest) {
      return reply.code(404).send({ error: 'Bundle not found' });
    }
    return reply.send(manifest);
  });

  fastify.get('/bundle/:caseId/export', async (req, reply) => {
    if (process.env.PROV_LEDGER_EXPORT_ENABLED === 'false') {
      return reply.code(403).send({ error: 'Export disabled' });
    }
    const { caseId } = req.params as { caseId: string };
    const bundle = await ledger.getBundle(caseId);
    if (!bundle) {
      return reply.code(404).send({ error: 'Bundle not found' });
    }
    return reply.send(bundle);
  });
}
