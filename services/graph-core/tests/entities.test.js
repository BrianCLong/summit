"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = __importDefault(require("../src/index"));
describe('entity upsert', () => {
    it('stores policy tags', async () => {
        const res = await (0, supertest_1.default)(index_1.default)
            .post('/api/v1/entities/Person')
            .send({ attributes: { name: 'Alice' }, policy: { origin: 'test' } });
        expect(res.status).toBe(200);
        expect(res.body.policy.origin).toBe('test');
        // idempotent
        const res2 = await (0, supertest_1.default)(index_1.default)
            .post(`/api/v1/entities/Person`)
            .send({
            id: res.body.id,
            attributes: { name: 'Alice' },
            policy: { origin: 'test2' },
        });
        expect(res2.body.id).toBe(res.body.id);
        expect(res2.body.policy.origin).toBe('test2');
    });
});
