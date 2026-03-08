"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSignerApp = createSignerApp;
const fastify_1 = __importDefault(require("fastify"));
const signer_1 = require("./signer");
function createSignerApp(signer = new signer_1.ReceiptSigner()) {
    const app = (0, fastify_1.default)({
        logger: { level: 'info', name: 'receipt-signer' },
    });
    app.get('/health', async () => ({ status: 'ok' }));
    app.get('/keys/:keyId', async () => ({
        keyId: signer instanceof signer_1.ReceiptSigner ? 'kms-default' : 'external',
        publicKey: signer.getPublicKey(),
    }));
    app.post('/sign', async (req, reply) => {
        if (!req.body?.payload) {
            reply.status(400).send({ error: 'payload is required' });
            return;
        }
        const signature = signer.signPayload(req.body.payload, req.body.keyId);
        reply.send({ signature });
    });
    app.post('/verify', async (req, reply) => {
        const { payload, signature } = req.body || {};
        if (!payload || !signature) {
            reply.status(400).send({ error: 'payload and signature are required' });
            return;
        }
        const valid = signer.verify(payload, signature);
        reply.send({ valid });
    });
    return app;
}
if (require.main === module) {
    const app = createSignerApp();
    const port = process.env.PORT ? Number(process.env.PORT) : 3900;
    app.listen({ port, host: '0.0.0.0' }).catch((err) => {
        app.log.error(err);
        process.exit(1);
    });
}
