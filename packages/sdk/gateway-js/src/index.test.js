"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const crypto_1 = require("crypto");
const index_1 = require("./index");
const body_parser_1 = __importDefault(require("body-parser"));
let server;
beforeAll((done) => {
    const app = (0, express_1.default)();
    app.use(body_parser_1.default.json());
    app.post('/graphql', (req, res) => {
        const { query, extensions } = req.body;
        if (!extensions?.persistedQuery) {
            return res.status(400).json({ error: 'no persisted query' });
        }
        const hash = (0, crypto_1.createHash)('sha256').update(query).digest('hex');
        if (hash !== extensions.persistedQuery.sha256Hash) {
            return res.status(400).json({ error: 'hash mismatch' });
        }
        res.json({ data: { ok: true } });
    });
    server = app.listen(5001, done);
});
afterAll((done) => {
    server.close(done);
});
test('executes persisted query', async () => {
    const client = new index_1.GatewayClient({
        url: 'http://localhost:5001/graphql',
        queries: { Test: '{ ok }' },
    });
    const data = await client.query('Test');
    expect(data.ok).toBe(true);
});
