"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const provenance_1 = require("@intelgraph/provenance");
const pipeline_1 = require("../src/pipeline");
const kmsClient_1 = require("../src/kmsClient");
const signerService_1 = require("../src/signerService");
const baseReceipt = {
    id: 'receipt-123',
    createdAt: new Date().toISOString(),
    executionId: 'exec-1',
    hashes: {
        inputs: [],
        outputs: [],
        manifest: 'manifest-hash',
    },
    signer: { keyId: 'local', algorithm: 'ed25519' },
    signature: '',
};
describe('ReceiptSignerService', () => {
    const { privateKey, publicKey } = (0, crypto_1.generateKeyPairSync)('ed25519');
    const pem = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
    const publicPem = publicKey.export({ format: 'pem', type: 'spki' }).toString();
    it('signs receipts via the KMS client', async () => {
        const kms = new kmsClient_1.KmsClient({ keyId: 'test-key', privateKeyPem: pem });
        const signer = new signerService_1.ReceiptSignerService({ kmsClient: kms });
        const signed = await signer.sign(baseReceipt);
        expect(signed.signature).toBeTruthy();
        expect(signed.signer.keyId).toBe('test-key');
        expect((0, provenance_1.verifyReceipt)(signed, publicPem)).toBe(true);
    });
    it('hooks into an execution pipeline', async () => {
        const kms = new kmsClient_1.KmsClient({ keyId: 'pipe-key', privateKeyPem: pem });
        const signer = new signerService_1.ReceiptSignerService({ kmsClient: kms });
        const pipelineCalls = [];
        const pipeline = {
            use: (_stage, handler) => {
                pipelineCalls.push(handler);
            },
        };
        (0, pipeline_1.attachReceiptSigning)(pipeline, signer);
        const ctx = { receipt: { ...baseReceipt } };
        await pipelineCalls[0](ctx);
        expect(ctx.receipt.signature).toBeTruthy();
    });
});
