"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../src/index"); // Assuming your index.ts exports the app
describe('Ledger Server API', () => {
    test('POST /ledger/append should append an event', async () => {
        const newEvent = {
            type: 'ISSUE',
            payload: { kpwId: 'kpw-123' },
            signer: 'signer-id',
        };
        const res = await (0, supertest_1.default)(index_1.app).post('/ledger/append').send(newEvent);
        expect(res.statusCode).toEqual(200);
        expect(res.body).toMatchObject(expect.objectContaining({ type: 'ISSUE' }));
    });
    test('GET /ledger/range should return a range of events', async () => {
        const res = await (0, supertest_1.default)(index_1.app).get('/ledger/range?from=0&to=1');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toBeInstanceOf(Array);
    });
    test('GET /ledger/last should return the last event', async () => {
        const res = await (0, supertest_1.default)(index_1.app).get('/ledger/last');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('eventId');
    });
});
