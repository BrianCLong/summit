"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = __importDefault(require("../src/index"));
describe('entity resolution', () => {
    it('scores fuzzy name + email highly with weights', async () => {
        const a = {
            id: '1',
            type: 'Person',
            attributes: { name: 'Alice', email: 'a@example.com' },
        };
        const b = {
            id: '2',
            type: 'Person',
            attributes: { name: 'Alicia', email: 'a@example.com' },
        };
        const res = await (0, supertest_1.default)(index_1.default)
            .post('/api/v1/er/candidates')
            .send({ entities: [a, b] });
        expect(res.status).toBe(200);
        expect(res.body.score).toBeGreaterThan(0.75);
        expect(res.body.weights.name).toBe(0.6);
        const exp = await (0, supertest_1.default)(index_1.default).get(`/api/v1/er/explanations/${res.body.id}`);
        expect(exp.body.breakdown.name).toBeGreaterThan(0);
    });
    it('scores name-only match low and exposes queue', async () => {
        const a = { id: '3', type: 'Person', attributes: { name: 'Bob' } };
        const b = { id: '4', type: 'Person', attributes: { name: 'Bobby' } };
        const res = await (0, supertest_1.default)(index_1.default)
            .post('/api/v1/er/candidates')
            .send({ entities: [a, b] });
        expect(res.body.score).toBeLessThan(0.7);
        const queue = await (0, supertest_1.default)(index_1.default).get('/api/v1/er/candidates');
        expect(queue.body.find((c) => c.id === res.body.id)).toBeTruthy();
    });
});
