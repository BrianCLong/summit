"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = pclRoutes;
const LedgerService_js_1 = require("../services/LedgerService.js");
const zod_1 = require("zod");
const cache_js_1 = require("../../libs/ops/src/cache.js");
const cache_keys_js_1 = require("../cache-keys.js");
const CreateEvidenceSchema = zod_1.z.object({
    url: zod_1.z.string().optional(),
    blob: zod_1.z.string().optional(),
    source: zod_1.z.string(),
    license: zod_1.z.string().optional(),
    hash: zod_1.z.string(),
    caseId: zod_1.z.string().optional()
});
const CreateTransformSchema = zod_1.z.object({
    inputs: zod_1.z.array(zod_1.z.string()),
    tool: zod_1.z.string(),
    params: zod_1.z.record(zod_1.z.any()),
    outputs: zod_1.z.array(zod_1.z.string()),
    operatorId: zod_1.z.string(),
    caseId: zod_1.z.string().optional()
});
const CreateClaimSchema = zod_1.z.object({
    subject: zod_1.z.string(),
    predicate: zod_1.z.string(),
    object: zod_1.z.string(),
    evidenceRefs: zod_1.z.array(zod_1.z.string()),
    confidence: zod_1.z.number(),
    licenseId: zod_1.z.string(),
    caseId: zod_1.z.string().optional()
});
async function pclRoutes(fastify) {
    const ledger = LedgerService_js_1.LedgerService.getInstance();
    fastify.post('/evidence', async (req, reply) => {
        try {
            const body = CreateEvidenceSchema.parse(req.body);
            const evidenceId = await ledger.registerEvidence(body);
            return reply.code(201).send({ evidenceId });
        }
        catch (err) {
            return reply.code(400).send({ error: err });
        }
    });
    fastify.post('/transform', async (req, reply) => {
        try {
            const body = CreateTransformSchema.parse(req.body);
            const transformId = await ledger.registerTransform(body);
            return reply.code(201).send({ transformId });
        }
        catch (err) {
            return reply.code(400).send({ error: err });
        }
    });
    fastify.post('/claim', async (req, reply) => {
        try {
            const body = CreateClaimSchema.parse(req.body);
            const claimId = await ledger.registerClaim(body);
            return reply.code(201).send({ claimId });
        }
        catch (err) {
            return reply.code(400).send({ error: err });
        }
    });
    fastify.get('/manifest/:bundleId', async (req, reply) => {
        const { bundleId } = req.params;
        const manifest = await (0, cache_js_1.cacheRemember)(cache_keys_js_1.keys.manifest(bundleId), 60, () => ledger.getManifest(bundleId));
        if (!manifest) {
            return reply.code(404).send({ error: 'Bundle not found' });
        }
        return reply.send(manifest);
    });
    fastify.get('/bundle/:caseId/export', async (req, reply) => {
        if (process.env.PROV_LEDGER_EXPORT_ENABLED === 'false') {
            return reply.code(403).send({ error: 'Export disabled' });
        }
        const { caseId } = req.params;
        const bundle = await ledger.getBundle(caseId);
        if (!bundle) {
            return reply.code(404).send({ error: 'Bundle not found' });
        }
        return reply.send(bundle);
    });
}
