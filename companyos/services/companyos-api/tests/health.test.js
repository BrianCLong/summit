"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const health_1 = require("../src/routes/health");
describe('health route', () => {
    it('returns status ok', async () => {
        const app = (0, express_1.default)();
        app.get('/health', health_1.healthRoute);
        const res = await (0, supertest_1.default)(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(res.body.service).toBe('companyos-api');
    });
});
