"use strict";
/// <reference path="../types/supertest.d.ts" />
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../../services/receipt-signer/src/index");
const app_1 = require("../../apps/api/src/app");
class FakeVerifier {
    result;
    shouldThrow;
    constructor(result, shouldThrow = false) {
        this.result = result;
        this.shouldThrow = shouldThrow;
    }
    async verify(receipt) {
        if (this.shouldThrow) {
            throw new Error(`failed to verify ${receipt.id}`);
        }
        return this.result;
    }
}
function buildReceipt(id, payload) {
    return {
        id,
        payload,
        payloadHash: (0, index_1.hashReceiptPayload)(payload),
        issuedAt: new Date().toISOString(),
        metadata: { workflow: 'ingest' },
        signer: {
            keyId: 'alias/test',
            algorithm: 'RSASSA_PSS_SHA_256',
        },
        signature: Buffer.from('signature').toString('base64'),
    };
}
describe('GET /receipts/:id', () => {
    it('returns a verified receipt when it exists', async () => {
        const receipt = buildReceipt('receipt-1', { case: 'abc' });
        const store = new index_1.InMemoryReceiptStore([receipt]);
        const app = (0, app_1.buildApp)({
            store,
            verifier: new FakeVerifier(true),
        });
        const response = await (0, supertest_1.default)(app).get('/receipts/receipt-1');
        expect(response.status).toBe(200);
        expect(response.body.receipt.id).toBe('receipt-1');
        expect(response.body.verified).toBe(true);
        expect(response.body.receipt.payloadHash).toBe(receipt.payloadHash);
    });
    it('returns 404 for unknown receipts', async () => {
        const store = new index_1.InMemoryReceiptStore();
        const app = (0, app_1.buildApp)({
            store,
            verifier: new FakeVerifier(true),
        });
        const response = await (0, supertest_1.default)(app).get('/receipts/missing');
        expect(response.status).toBe(404);
        expect(response.body.error).toContain('Receipt not found');
    });
    it('surfaces verifier errors as server failures', async () => {
        const receipt = buildReceipt('receipt-2', { case: 'def' });
        const store = new index_1.InMemoryReceiptStore([receipt]);
        const app = (0, app_1.buildApp)({
            store,
            verifier: new FakeVerifier(false, true),
        });
        const response = await (0, supertest_1.default)(app).get('/receipts/receipt-2');
        expect(response.status).toBe(500);
        expect(response.body.error).toBe('Failed to load receipt');
    });
});
