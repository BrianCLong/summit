"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const server_1 = require("../server");
const signer_1 = require("../signer");
describe('receipt-signer service', () => {
    const signer = new signer_1.ReceiptSigner('test-key');
    const app = (0, server_1.createSignerApp)(signer);
    beforeAll(async () => {
        await app.ready();
    });
    afterAll(async () => {
        await app.close();
    });
    it('signs and verifies payloads', async () => {
        const payload = 'abc123';
        const signRes = await (0, supertest_1.default)(app.server).post('/sign').send({ payload });
        expect(signRes.status).toBe(200);
        expect(signRes.body.signature.value).toBeTruthy();
        expect(signRes.body.signature.keyId).toBe('test-key');
        const verifyRes = await (0, supertest_1.default)(app.server)
            .post('/verify')
            .send({ payload, signature: signRes.body.signature });
        expect(verifyRes.status).toBe(200);
        expect(verifyRes.body.valid).toBe(true);
    });
    it('rejects malformed requests', async () => {
        const res = await (0, supertest_1.default)(app.server).post('/sign').send({});
        expect(res.status).toBe(400);
    });
});
