"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = __importDefault(require("../src/index"));
describe('time slice', () => {
    it('returns entity valid at time', async () => {
        const res = await (0, supertest_1.default)(index_1.default)
            .post('/api/v1/entities/Person')
            .send({
            id: 't1',
            attributes: { name: 'Bob' },
            validFrom: '2020-01-01T00:00:00.000Z',
            validTo: '2022-01-01T00:00:00.000Z',
        });
        expect(res.status).toBe(200);
        const q1 = await (0, supertest_1.default)(index_1.default).post('/api/v1/query/cypher').send({
            id: 't1',
            time: '2021-06-01T00:00:00.000Z',
            cypher: 'MATCH (n) RETURN n',
        });
        expect(q1.body.entity.id).toBe('t1');
        const q2 = await (0, supertest_1.default)(index_1.default).post('/api/v1/query/cypher').send({
            id: 't1',
            time: '2023-01-01T00:00:00.000Z',
            cypher: 'MATCH (n) RETURN n',
        });
        expect(q2.body.entity).toBeNull();
    });
});
