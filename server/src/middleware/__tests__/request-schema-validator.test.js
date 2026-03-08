"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const joi_1 = __importDefault(require("joi"));
const zod_1 = require("zod");
const request_schema_validator_js_1 = require("../request-schema-validator.js");
const NO_NETWORK_LISTEN = process.env.NO_NETWORK_LISTEN === 'true';
const describeIf = NO_NETWORK_LISTEN ? globals_1.describe.skip : globals_1.describe;
describeIf('request schema validator middleware', () => {
    const zodSchema = zod_1.z.object({
        name: zod_1.z.string().min(1),
        count: zod_1.z.coerce.number().int().min(1).max(5).default(1),
    });
    const joiSchema = joi_1.default.object({
        name: joi_1.default.string().required(),
        count: joi_1.default.number().integer().min(1).max(5).default(1),
    });
    (0, globals_1.it)('sanitizes and validates payloads with both Joi and Zod', async () => {
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.post('/test', (0, request_schema_validator_js_1.buildRequestValidator)({ target: 'body', zodSchema, joiSchema }), (req, res) => {
            res.json({ body: req.body });
        });
        const res = await (0, supertest_1.default)(app)
            .post('/test')
            .send({ name: '<script>alert(1)</script>', count: 2 });
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.body.body.name).not.toContain('<script');
        (0, globals_1.expect)(res.body.body.count).toBe(2);
    });
    (0, globals_1.it)('rejects invalid payloads early', async () => {
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.post('/test', (0, request_schema_validator_js_1.buildRequestValidator)({ target: 'body', zodSchema, joiSchema }), (req, res) => {
            res.json({ body: req.body });
        });
        const res = await (0, supertest_1.default)(app).post('/test').send({ count: 'not-a-number' });
        (0, globals_1.expect)(res.status).toBe(400);
        (0, globals_1.expect)(res.body.error).toBe('Validation failed');
    });
    (0, globals_1.it)('blocks suspicious SQL-like payloads', async () => {
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.post('/test', (0, request_schema_validator_js_1.createSqlInjectionGuard)(), (_req, res) => {
            res.json({ ok: true });
        });
        const res = await (0, supertest_1.default)(app)
            .post('/test')
            .send({ query: 'SELECT * FROM users; DROP TABLE users;' });
        (0, globals_1.expect)(res.status).toBe(400);
        (0, globals_1.expect)(res.body.error).toBe('Suspicious input detected');
    });
});
