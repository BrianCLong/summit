"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const vitest_1 = require("vitest");
const index_js_1 = __importDefault(require("../src/index.js"));
(0, vitest_1.describe)('health endpoint', () => {
    (0, vitest_1.it)('returns ok', async () => {
        const response = await (0, supertest_1.default)(index_js_1.default).get('/health');
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(response.body.status).toBe('ok');
        (0, vitest_1.expect)(response.body.service).toBe('incident-api');
    });
    (0, vitest_1.it)('exposes metrics', async () => {
        const response = await (0, supertest_1.default)(index_js_1.default).get('/metrics');
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(response.text).toContain('http_request_duration_seconds');
    });
});
