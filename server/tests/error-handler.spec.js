"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
describe('Express 5 centralized errors', () => {
    it('catches async throw', async () => {
        const app = (0, express_1.default)();
        const r = express_1.default.Router();
        r.get('/boom', async () => {
            throw new Error('boom');
        });
        app.use('/test', r);
        // Centralized error handler
        app.use((err, _req, res, _next) => {
            const msg = err instanceof Error ? err.message : 'Internal Server Error';
            res.status(500).json({ error: msg });
        });
        const res = await (0, supertest_1.default)(app).get('/test/boom');
        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/boom/);
    });
});
