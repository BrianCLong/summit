"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const URL = process.env.GQL_URL || 'http://localhost:4000';
describe('Persisted-only', () => {
    it('rejects ad-hoc in prod', async () => {
        const res = await (0, supertest_1.default)(URL)
            .post('/graphql')
            .set('x-tenant', 'default')
            .send({ query: '{ __typename }' });
        expect(res.status).toBe(200);
        expect(JSON.stringify(res.body)).toMatch(/Persisted queries only/i);
    });
    it('accepts known persisted hash', async () => {
        const res = await (0, supertest_1.default)(URL)
            .post('/graphql')
            .set('x-tenant', 'default')
            .set('x-persisted-hash', 'sha256:abc123...')
            .send({ operationName: 'Ping', variables: {} });
        expect(res.status).toBe(200);
        expect(res.body.data).toBeTruthy();
    });
});
