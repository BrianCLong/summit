"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/index");
const supertest_1 = __importDefault(require("supertest"));
const crypto_1 = require("crypto");
beforeAll(async () => {
    await (0, index_1.start)();
});
test('rejects spoofed query hash', async () => {
    const query = 'query A { __typename }';
    const hash = (0, crypto_1.createHash)('sha256').update(query).digest('hex');
    await (0, supertest_1.default)(index_1.app)
        .post('/graphql')
        .send({
        query: 'query B { __typename }',
        extensions: { persistedQuery: { version: 1, sha256Hash: hash } },
    })
        .expect(400);
});
test('rejects overly deep query', async () => {
    const query = 'query Deep { a { b { c { d { e { f } } } } } }';
    const hash = (0, crypto_1.createHash)('sha256').update(query).digest('hex');
    const res = await (0, supertest_1.default)(index_1.app)
        .post('/graphql')
        .send({
        query,
        extensions: { persistedQuery: { version: 1, sha256Hash: hash } },
    });
    expect(res.status).toBe(400);
});
