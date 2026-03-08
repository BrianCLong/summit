"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const globals_1 = require("@jest/globals");
(0, globals_1.test)('similarEntities by text (integration)', async () => {
    const apiUrl = process.env.API_URL || 'http://localhost:4000';
    const q = `{ similarEntities(text:"banking fraud", topK:5){ id score } }`;
    const r = await (0, supertest_1.default)(apiUrl)
        .post('/graphql')
        .set('Authorization', 'Bearer test')
        .send({ query: q });
    (0, globals_1.expect)(r.status).toBe(200);
    (0, globals_1.expect)(r.body.data.similarEntities.length).toBeLessThanOrEqual(5);
});
