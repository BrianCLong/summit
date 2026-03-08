"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const supertest_1 = __importDefault(require("supertest"));
const client_kms_1 = require("@aws-sdk/client-kms");
const provenance_1 = require("@intelgraph/provenance");
const receipt_signer_1 = require("@intelgraph/receipt-signer");
const app_js_1 = require("../src/app.js");
const get_js_1 = require("../src/routes/receipts/get.js");
class FakeKmsClient {
    signature;
    lastSign;
    lastVerify;
    constructor(signature = new Uint8Array(Buffer.from('api-signature'))) {
        this.signature = signature;
    }
    async send(command) {
        if (command instanceof client_kms_1.SignCommand) {
            this.lastSign = command.input;
            return {
                Signature: this.signature,
                SigningAlgorithm: command.input.SigningAlgorithm,
            };
        }
        if (command instanceof client_kms_1.VerifyCommand) {
            this.lastVerify = command.input;
            return { SignatureValid: true };
        }
        throw new Error('Unexpected command');
    }
    destroy() {
        /* noop */
    }
}
const unsignedReceipt = {
    id: '05f0f66e-6240-4c3b-8c26-14fb24f2a5cb',
    schemaVersion: provenance_1.RECEIPT_SCHEMA_VERSION,
    issuer: 'kms:alias/provenance-signing',
    subject: 'artifact:ingest/2001',
    issuedAt: '2025-01-05T00:00:00.000Z',
    payload: {
        artifactHash: 'abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        manifestUri: 'https://example.test/manifests/2001.json',
        nonce: 'nonce-9876543210',
    },
};
describe('GET /receipts/:id', () => {
    it('returns 404 when no receipt exists', async () => {
        const signer = new receipt_signer_1.ReceiptSigner({
            kmsKeyId: 'alias/provenance-key',
            client: new FakeKmsClient(),
        });
        const app = (0, app_js_1.buildApp)({
            signer,
            repository: new get_js_1.InMemoryReceiptRepository([]),
        });
        await (0, supertest_1.default)(app).get('/receipts/missing').expect(404);
    });
    it('returns a signed payload and signature', async () => {
        const fakeKms = new FakeKmsClient();
        const signer = new receipt_signer_1.ReceiptSigner({
            kmsKeyId: 'alias/provenance-key',
            client: fakeKms,
        });
        const app = (0, app_js_1.buildApp)({
            signer,
            repository: new get_js_1.InMemoryReceiptRepository([unsignedReceipt]),
        });
        const response = await (0, supertest_1.default)(app)
            .get(`/receipts/${unsignedReceipt.id}`)
            .expect(200);
        const body = response.body;
        expect(body.id).toBe(unsignedReceipt.id);
        expect(body.signature.value).toBe(Buffer.from('api-signature').toString('base64'));
        expect(fakeKms.lastSign?.MessageType).toBe('DIGEST');
        const canonical = (0, receipt_signer_1.canonicaliseReceipt)(body);
        const digest = (0, crypto_1.createHash)('sha256').update(canonical).digest('hex');
        expect(body.signature.messageDigest).toBe(digest);
    });
});
