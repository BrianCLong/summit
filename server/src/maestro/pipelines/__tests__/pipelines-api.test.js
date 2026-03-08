"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const pipelines_api_js_1 = __importDefault(require("../../pipelines-api.js"));
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('Pipelines API', () => {
    const app = (0, express_1.default)();
    app.use('/api/maestro/v1', pipelines_api_js_1.default);
    (0, globals_1.it)('lists pipelines (empty)', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/maestro/v1/pipelines').expect(200);
        (0, globals_1.expect)(Array.isArray(res.body)).toBe(true);
    });
});
