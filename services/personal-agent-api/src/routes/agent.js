"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentRoutes = agentRoutes;
const zod_1 = require("zod");
const envelopeSchema = zod_1.z.object({
    meta: zod_1.z.object({
        schema: zod_1.z.string(),
        tenant_id: zod_1.z.string(),
        correlation_id: zod_1.z.string(),
        idempotency_key: zod_1.z.string().optional(),
        source: zod_1.z.string().optional(),
        ts: zod_1.z.string()
    }),
    payload: zod_1.z.record(zod_1.z.any())
});
const runRequestSchema = zod_1.z.object({
    type: zod_1.z.string(),
    input_ref: zod_1.z.object({
        kind: zod_1.z.string(),
        id: zod_1.z.string()
    }).optional(),
    input: zod_1.z.record(zod_1.z.any()).optional(),
    constraints: zod_1.z.object({
        mode: zod_1.z.enum(['observe', 'assist', 'autopilot']),
        max_wall_ms: zod_1.z.number().optional(),
        max_cost_usd: zod_1.z.number().optional(),
        tools_allowlist: zod_1.z.array(zod_1.z.string()).optional()
    }).optional()
});
const runPlaybookRequestSchema = zod_1.z.object({
    playbook: zod_1.z.string(),
    params: zod_1.z.record(zod_1.z.any()).optional(),
    constraints: zod_1.z.object({
        mode: zod_1.z.enum(['observe', 'assist', 'autopilot']).optional(),
        max_cost_usd: zod_1.z.number().optional()
    }).optional()
});
async function agentRoutes(fastify) {
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
