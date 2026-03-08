import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const envelopeSchema = z.object({
  meta: z.object({
    schema: z.string(),
    tenant_id: z.string(),
    correlation_id: z.string(),
    idempotency_key: z.string().optional(),
    source: z.string().optional(),
    ts: z.string()
  }),
  payload: z.record(z.any())
});

const runRequestSchema = z.object({
  type: z.string(),
  input_ref: z.object({
    kind: z.string(),
    id: z.string()
  }).optional(),
  input: z.record(z.any()).optional(),
  constraints: z.object({
    mode: z.enum(['observe', 'assist', 'autopilot']),
    max_wall_ms: z.number().optional(),
    max_cost_usd: z.number().optional(),
    tools_allowlist: z.array(z.string()).optional()
  }).optional()
});

const runPlaybookRequestSchema = z.object({
  playbook: z.string(),
  params: z.record(z.any()).optional(),
  constraints: z.object({
    mode: z.enum(['observe', 'assist', 'autopilot']).optional(),
    max_cost_usd: z.number().optional()
  }).optional()
});

export async function agentRoutes(fastify: FastifyInstance) {
  fastify.post('/run', async (request, reply) => {
    const envelope = envelopeSchema.parse(request.body);
    const payload = runRequestSchema.parse(envelope.payload);

    const runId = `run_${Math.random().toString(36).substring(2, 11)}`;

    return {
      run_id: runId,
      status: 'queued',
      meta: {
        tenant_id: envelope.meta.tenant_id,
        correlation_id: envelope.meta.correlation_id
      }
    };
  });

  fastify.post('/run-playbook', async (request, reply) => {
    const envelope = envelopeSchema.parse(request.body);
    const payload = runPlaybookRequestSchema.parse(envelope.payload);

    const runId = `run_${Math.random().toString(36).substring(2, 11)}`;

    return {
      run_id: runId,
      status: 'queued',
      meta: {
        tenant_id: envelope.meta.tenant_id,
        correlation_id: envelope.meta.correlation_id
      }
    };
  });
}
