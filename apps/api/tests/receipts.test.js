"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../src/index");
const receipt = {
    id: 'receipt-123',
    createdAt: new Date().toISOString(),
    executionId: 'exec-123',
    hashes: { inputs: [], outputs: [], manifest: 'manifest' },
    signer: { keyId: 'local', algorithm: 'ed25519' },
    signature: 'sig',
};
describe('receipt routes', () => {
    beforeAll(() => {
        index_1.store.seed(receipt, { log: Buffer.from('hello') });
    });
    it('returns receipts by id', async () => {
        const res = await (0, supertest_1.default)(index_1.app).get(`/receipts/${receipt.id}`);
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(receipt.id);
    });
    it('exports receipts with optional redaction', async () => {
        const res = await (0, supertest_1.default)(index_1.app)
            .post('/receipts/export')
            .send({ id: receipt.id, redactions: ['log'], reason: 'minimize' });
        expect(res.status).toBe(200);
        expect(res.body.artifacts).not.toContain('log');
        expect(res.body.disclosure.redactions).toContain('log');
    });
});
