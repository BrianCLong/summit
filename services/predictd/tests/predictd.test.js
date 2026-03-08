"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = __importDefault(require("../src/index"));
describe('Predictd Service API', () => {
    it('GET /api/v1/health should respond with a 200', async () => {
        const response = await (0, supertest_1.default)(index_1.default).get('/api/v1/health');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'ok' });
    });
    it('GET /api/v1/signals should respond with a 200 and an empty array of signals', async () => {
        const response = await (0, supertest_1.default)(index_1.default).get('/api/v1/signals');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ signals: [] });
    });
});
