"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ledger = exports.app = void 0;
const fastify_1 = __importDefault(require("fastify"));
const zod_1 = require("zod");
const ledger_1 = require("./ledger");
const ledger = new ledger_1.Ledger({
    dataDir: process.env.LEDGER_DATA_DIR || './data/ledger',
    enabled: process.env.LEDGER_ENABLED === 'true'
});
exports.ledger = ledger;
const app = (0, fastify_1.default)({ logger: true });
exports.app = app;
// POST /evidence
const evidenceSchema = zod_1.z.object({
    contentHash: zod_1.z.string(),
    licenseId: zod_1.z.string(),
    source: zod_1.z.string(),
    transforms: zod_1.z.array(zod_1.z.string()).default([]),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional()
});
app.post('/evidence', (req, reply) => {
    try {
        const body = evidenceSchema.parse(req.body);
        const result = ledger.registerEvidence(body);
        return result;
    }
    catch (err) {
        reply.status(400).send(err);
    }
});
// POST /claims
const claimSchema = zod_1.z.object({
    evidenceIds: zod_1.z.array(zod_1.z.string()),
    transformChainIds: zod_1.z.array(zod_1.z.string()).default([]),
    text: zod_1.z.string(),
    signature: zod_1.z.string().optional(),
    publicKey: zod_1.z.string().optional()
});
app.post('/claims', (req, reply) => {
    try {
        const body = claimSchema.parse(req.body);
        const result = ledger.createClaim(body);
        return result;
    }
    catch (err) {
        reply.status(400).send(err);
    }
});
// GET /claims/:id
app.get('/claims/:id', (req, reply) => {
    const { id } = req.params;
    const claim = ledger.getClaim(id);
    if (!claim) {
        return reply.status(404).send({ error: 'Not found' });
    }
    return claim;
});
// POST /exports/manifest
const manifestSchema = zod_1.z.object({
    claimIds: zod_1.z.array(zod_1.z.string())
});
app.post('/exports/manifest', (req, reply) => {
    try {
        const body = manifestSchema.parse(req.body);
        const manifest = ledger.generateManifest(body.claimIds);
        return manifest;
    }
    catch (err) {
        reply.status(400).send(err);
    }
});
if (import.meta.url === `file://${process.argv[1]}`) {
    app.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' }).catch(err => {
        app.log.error(err);
        process.exit(1);
    });
}
